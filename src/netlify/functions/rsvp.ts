import {
  createSurveySubmission,
  discardNewSubmission,
  loadOpenSurvey,
  SubmissionError,
} from '../utils/surveySubmission';
import {
  assertGuestRsvpConfigured,
  guestCancellationToken,
  verifyGuestCancellationToken,
} from '../utils/guestRsvp';
import { registrationEpisode } from '../utils/registrationEpisode';
import { requireMutationUser } from '../utils/authorization';
import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
  getAuthenticatedUser,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';
import { sendRSVPConfirmEmail, sendRSVPRejectEmail } from '../utils/email';
import { RSVPStatus, ApprovalStatus } from '../types/rsvp';

export interface RsvpAction {
  functionName:
    | 'create'
    | 'get'
    | 'getAll'
    | 'update'
    | 'delete'
    | 'getByMeetupId'
    | 'getByUserId'
    | 'getByWechatId'
    | 'cancel'
    | 'cancelByMeetupWechat'
    | 'cancelGuest';
}

export async function handler(event: NetlifyEvent, context: any) {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
      case 'create':
        return await handleCreate(event);
      case 'get':
        return await handleGet(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'update':
        return await handleUpdate(event);
      case 'delete':
        return await handleDelete(event);
      case 'getByMeetupId':
        return await handleGetByMeetupId(event);
      case 'getByUserId':
        return await handleGetByUserId(event);
      case 'getByWechatId':
        return await handleGetByWechatId(event);
      case 'cancelGuest':
        return await handleGuestCancel(event);
      case 'cancel':
        return await handleCancel(event);
      case 'cancelByMeetupWechat':
        return await handleCancelByMeetupWechat(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('RSVP Handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent) {
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);
  let newlyCreated: { id: string; respondentId: string } | null = null;
  let saved = false;
  try {
    const rsvpData = getDataFromEvent(event);
    const meetupIdNum = Number(rsvpData.meetup_id);
    const name = String(rsvpData.name || '').trim();
    const timezone = rsvpData.timezone
      ? String(rsvpData.timezone)
      : 'Asia/Shanghai';
    const user = await getAuthenticatedUser(event);
    const userId = user?.id || null;

    if (!rsvpData['meetup_id']) {
      return createErrorResponse('缺少必填字段: meetup_id');
    }

    // 未登录用户必须提供姓名
    if (!userId && !name) {
      return createErrorResponse('缺少必填字段: name');
    }

    if (!Number.isSafeInteger(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select(
        'id, max_ppl, status, title, datetime, location, mode, is_recurring, duration, survey_id, skip_login, episode_start_date'
      )
      .eq('id', meetupIdNum)
      .single();

    if (meetupError || !meetup) {
      return createErrorResponse('活动不存在', 404);
    }
    if (!userId && !meetup.skip_login)
      return createErrorResponse('请先登录后报名', 401);

    if (meetup.status === 'cancelled') {
      return createErrorResponse('活动已取消');
    }

    if (!userId) assertGuestRsvpConfigured();
    const episode = await registrationEpisode(meetup, rsvpData);
    const episodeId: number | null = episode?.id ?? null;
    const episodeNumber: number | undefined = episode?.episode_number;

    let existingRSVP = null;

    if (userId) {
      let q = supabase
        .from('meetup_rsvps')
        .select('id, status, wechat_id')
        .eq('meetup_id', meetupIdNum)
        .eq('user_id', userId);
      if (episodeId !== null) q = q.eq('episode_id', episodeId);
      const { data: byUser, error: existingError } = await q.limit(1);
      if (existingError) return createErrorResponse('读取报名记录失败', 500);
      if (byUser && byUser.length > 0) existingRSVP = byUser[0];
    }

    if (existingRSVP && existingRSVP.status === 'confirmed') {
      return createErrorResponse('您已经报名了这个活动');
    }

    const maxLimit = Number(meetup.max_ppl);
    const enforceLimit = Number.isFinite(maxLimit) && maxLimit > 0;
    if (enforceLimit) {
      let countQ = supabase
        .from('meetup_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('meetup_id', meetupIdNum)
        .eq('status', 'confirmed');
      if (episodeId !== null) countQ = countQ.eq('episode_id', episodeId);
      const { count, error: countError } = await countQ;

      if (countError) {
        console.error('Count error:', countError);
        return createErrorResponse('读取报名人数失败', 500);
      } else if (count !== null && count >= maxLimit) {
        return createErrorResponse('活动人数已满');
      }
    }

    let surveySubmissionId = rsvpData.survey_submission_id
      ? String(rsvpData.survey_submission_id).trim()
      : null;
    if (surveySubmissionId && !meetup.survey_id)
      return createErrorResponse('活动未关联此问卷');
    if (meetup.survey_id) {
      if (surveySubmissionId) {
        // Old authenticated clients may supply an existing answer sheet, but
        // knowing its ID is never ownership. Guest sheets can only be created
        // within this request's trusted registration context.
        if (!userId)
          return createErrorResponse('请重新通过活动报名页面填写问卷', 403);
        const survey = await loadOpenSurvey(meetup.survey_id);
        if (
          survey.meetup_id != null &&
          String(survey.meetup_id) !== String(meetup.id)
        )
          return createErrorResponse('活动与问卷关联不匹配');
        const { data: submission, error } = await supabase
          .from('survey_submissions')
          .select('id')
          .eq('id', surveySubmissionId)
          .eq('survey_id', meetup.survey_id)
          .eq('respondent_id', userId)
          .maybeSingle();
        if (error) return createErrorResponse('读取答卷失败', 500);
        if (!submission)
          return createErrorResponse(
            '答卷不存在或不属于当前用户和活动问卷',
            403
          );
      } else {
        const submission = await createSurveySubmission(
          event,
          meetup.survey_id,
          rsvpData.answers,
          user,
          {
            id: meetup.id,
            survey_id: meetup.survey_id,
            skip_login: meetup.skip_login === true,
          }
        );
        surveySubmissionId = submission.id;
        if (submission.created) newlyCreated = submission;
      }
    }

    let result;
    const needsApproval = meetup.survey_id
      ? ApprovalStatus.PENDING
      : ApprovalStatus.AUTO;

    if (existingRSVP) {
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .update({
          status: RSVPStatus.CONFIRMED,
          application_status: needsApproval,
          survey_submission_id: surveySubmissionId,
        })
        .eq('id', existingRSVP.id)
        .eq('user_id', userId)
        .select();
      result = { data, error };
    } else {
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .insert([
          {
            meetup_id: meetupIdNum,
            name,
            user_id: userId as any,
            status: RSVPStatus.CONFIRMED,
            application_status: needsApproval,
            survey_submission_id: surveySubmissionId,
            ...(episodeId !== null ? { episode_id: episodeId } : {}),
          },
        ])
        .select();
      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return createErrorResponse('报名失败', 500);
    }

    if (!result.data?.[0]) throw new SubmissionError('报名保存失败', 500);
    saved = true;

    // 发送确认邮件（异步，不阻塞响应）
    // 只有不需要审批的活动才立即发送报名成功邮件，需要审批的活动等审批通过后再发送
    // 用户必须登录，从 users 表获取邮箱（userId 是 users 表的数字ID，不是 Supabase Auth UUID）
    const recipientName = name || '同学';
    let recipientEmail: string | undefined;
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      recipientEmail = userData?.email;
    }
    if (recipientEmail && needsApproval === ApprovalStatus.APPROVED) {
      sendRSVPConfirmEmail({
        to: recipientEmail,
        name: recipientName,
        meetupTitle: meetup.title,
        meetupId: meetupIdNum,
        eventDatetime: meetup.datetime,
        durationHours: meetup.duration ? Number(meetup.duration) : 1,
        location: meetup.location,
        mode: meetup.mode,
        episodeNumber: episodeNumber,
        timezone,
      });
    }

    return createSuccessResponse({
      message: '报名成功',
      rsvp: result.data?.[0] || null,
      ...(!userId
        ? {
            guest_cancel_token: guestCancellationToken(
              String(result.data[0].id),
              meetupIdNum
            ),
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof SubmissionError)
      return createErrorResponse(error.message, error.status);
    console.error('Create RSVP error:', error);
    return createErrorResponse('报名失败', 500);
  } finally {
    if (!saved && newlyCreated)
      await discardNewSubmission(newlyCreated.id, newlyCreated.respondentId);
  }
}

async function handleGet(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, user_id, wechat_id, status } = requestData;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    if (!meetup_id && !user_id && !wechat_id) {
      return createErrorResponse('缺少查询参数');
    }

    let query = supabase.from('meetup_rsvps').select('*');

    if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum)) {
      query = query.eq('meetup_id', meetupIdNum);
    }

    if (user_id) {
      query = query.eq(
        'user_id',
        isNaN(Number(user_id)) ? user_id : Number(user_id)
      );
    }

    if (wechat_id) {
      query = query.eq('wechat_id', wechat_id);
    }

    const statusTrimmed =
      status !== undefined ? String(status).trim() : undefined;
    if (!statusTrimmed || statusTrimmed === 'confirmed') {
      query = query.eq('status', 'confirmed');
    } else if (statusTrimmed === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (statusTrimmed === 'all') {
    } else {
      query = query.eq('status', statusTrimmed);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get RSVPs error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleGetAll(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, user_id, wechat_id, status } = requestData;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    let query = supabase.from('meetup_rsvps').select('*');

    if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum)) {
      query = query.eq('meetup_id', meetupIdNum);
    }

    if (user_id) {
      query = query.eq(
        'user_id',
        isNaN(Number(user_id)) ? user_id : Number(user_id)
      );
    }

    if (wechat_id) {
      query = query.eq('wechat_id', wechat_id);
    }

    const statusTrimmed =
      status !== undefined ? String(status).trim() : undefined;
    if (!statusTrimmed || statusTrimmed === 'confirmed') {
      query = query.eq('status', 'confirmed');
    } else if (statusTrimmed === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (statusTrimmed === 'all') {
    } else {
      query = query.eq('status', statusTrimmed);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get all RSVPs error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleUpdate(event: NetlifyEvent) {
  const auth = await requireMutationUser(event, ['PUT', 'POST'], true);
  if (auth.error) return auth.error;
  try {
    const requestData = getDataFromEvent(event);
    // id 可能在查询参数中，也可能在请求体中
    const id = requestData.id || event.queryStringParameters?.id;
    const { ...updateData } = requestData;

    if (!id) {
      return createErrorResponse('缺少RSVP ID');
    }

    const idTrimmed = String(id).trim();
    const idNum = Number(idTrimmed);
    const hasNum = Number.isFinite(idNum);

    const allowedFields = [
      'status',
      'name',
      'question_answer',
      'application_status',
      'approved_by',
      'email_sent',
      'email_sent_at',
    ];
    const updateRecord: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateRecord[field] = updateData[field];
      }
    });

    if (
      updateData.application_status !== undefined ||
      updateData.approved_by !== undefined
    ) {
      updateRecord.approved_by = auth.user.name;
      updateRecord.approved_at = new Date().toISOString();
    }

    if (Object.keys(updateRecord).length === 0) {
      return createErrorResponse('无可更新字段');
    }

    let pre = await supabase
      .from('meetup_rsvps')
      .select('id')
      .eq('id', idTrimmed as any)
      .limit(1);
    let preData = pre.data || [];
    if ((!preData || preData.length === 0) && hasNum) {
      pre = await supabase
        .from('meetup_rsvps')
        .select('id')
        .eq('id', idNum as any)
        .limit(1);
      preData = pre.data || [];
    }

    if (!preData || preData.length === 0) {
      return createErrorResponse('RSVP不存在', 404);
    }

    let { data, error } = await supabase
      .from('meetup_rsvps')
      .update(updateRecord)
      .eq('id', idTrimmed as any)
      .select('*, meetup_id');

    if ((!data || data.length === 0) && hasNum && !error) {
      const second = await supabase
        .from('meetup_rsvps')
        .update(updateRecord)
        .eq('id', idNum as any)
        .select('*, meetup_id');
      data = second.data;
      error = second.error;
    }

    if (error) {
      console.error('Database update error:', error);
      return createErrorResponse('更新RSVP失败', 500);
    }

    // 获取活动详情（用于发送邮件）
    let meetup = null;
    let meetupError = null;

    // 调试日志
    console.log('📧 邮件发送检查:', {
      send_email: updateData.send_email,
      hasData: data && data.length > 0,
      application_status: updateData.application_status,
      isRejected: updateData.application_status === ApprovalStatus.REJECTED,
      isApproved: updateData.application_status === ApprovalStatus.APPROVED,
    });

    if (
      updateData.send_email &&
      data &&
      data.length > 0 &&
      (updateData.application_status === ApprovalStatus.REJECTED ||
        updateData.application_status === ApprovalStatus.APPROVED)
    ) {
      const rsvp = data[0];
      const { data: meetupData, error: meetupErr } = await supabase
        .from('meetups')
        .select('id, title, datetime, location, mode')
        .eq('id', rsvp.meetup_id)
        .single();
      meetup = meetupData;
      meetupError = meetupErr;

      if (!meetupError && meetup) {
        let email = null;
        // 从用户表获取邮箱（活动报名用户必须登录，user_id 一定存在）
        console.log('📧 获取用户邮箱:', {
          rsvp_user_id: rsvp.user_id,
          rsvp_name: rsvp.name,
        });
        if (rsvp.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', rsvp.user_id)
              .single();
            email = userData?.email;
            console.log('📧 用户邮箱获取结果:', {
              userData: userData,
              email: email,
            });
          } catch (userError) {
            console.error('获取用户邮箱失败:', userError);
          }
        } else {
          console.log('📧 警告: rsvp.user_id 为空');
        }

        // 审批拒绝发送拒绝邮件
        if (
          email &&
          updateData.application_status === ApprovalStatus.REJECTED
        ) {
          try {
            await sendRSVPRejectEmail({
              to: email,
              name: rsvp.name || '参与者',
              meetupTitle: meetup.title,
              meetupId: meetup.id,
            });

            const now = new Date().toISOString();
            await supabase
              .from('meetup_rsvps')
              .update({ email_sent: true, email_sent_at: now })
              .eq('id', rsvp.id);
          } catch (emailError) {
            console.error('发送拒绝邮件失败:', emailError);
          }
        }

        // 审批通过发送报名成功邮件
        if (
          email &&
          updateData.application_status === ApprovalStatus.APPROVED
        ) {
          try {
            await sendRSVPConfirmEmail({
              to: email,
              name: rsvp.name || '参与者',
              meetupTitle: meetup.title,
              meetupId: meetup.id,
              eventDatetime: meetup.datetime,
              location: meetup.location,
              mode: meetup.mode,
            });

            const now = new Date().toISOString();
            await supabase
              .from('meetup_rsvps')
              .update({ email_sent: true, email_sent_at: now })
              .eq('id', rsvp.id);
          } catch (emailError) {
            console.error('发送报名成功邮件失败:', emailError);
          }
        }
      }
    }

    return createSuccessResponse({
      message: 'RSVP更新成功',
      affected: Array.isArray(data) ? data.length : 0,
      rsvp: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });
  } catch (error) {
    console.error('Update RSVP error:', error);
    return createErrorResponse('更新RSVP失败', 500);
  }
}

async function handleDelete(event: NetlifyEvent) {
  return handleCancel(event);
}

async function handleGetByMeetupId(event: NetlifyEvent) {
  try {
    const body = getDataFromEvent(event);
    const { meetup_id, episode_id } = body;

    if (!meetup_id) {
      return createErrorResponse('缺少活动ID');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isSafeInteger(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    let query = supabase
      .from('meetup_rsvps')
      .select('*')
      .eq('meetup_id', meetupIdNum)
      .eq('status', 'confirmed');

    if (episode_id !== undefined && episode_id !== null) {
      query = query.eq('episode_id', Number(episode_id));
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get RSVPs by meetup ID error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleGetByUserId(event: NetlifyEvent) {
  try {
    const body = getDataFromEvent(event);
    const { user_id } = body;

    if (!user_id) {
      return createErrorResponse('缺少用户ID');
    }

    const userId = isNaN(Number(user_id)) ? user_id : Number(user_id);

    const { data, error } = await supabase
      .from('meetup_rsvps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get RSVPs by user ID error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleGetByWechatId(event: NetlifyEvent) {
  try {
    const body = getDataFromEvent(event);
    const { wechat_id } = body;

    if (!wechat_id) {
      return createErrorResponse('缺少微信号');
    }

    const { data, error } = await supabase
      .from('meetup_rsvps')
      .select('*')
      .eq('wechat_id', wechat_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return createErrorResponse('获取报名信息失败', 500);
    }

    return createSuccessResponse({ rsvps: data || [] });
  } catch (error) {
    console.error('Get RSVPs by wechat ID error:', error);
    return createErrorResponse('获取报名信息失败', 500);
  }
}

async function handleCancel(event: NetlifyEvent) {
  const auth = await requireMutationUser(event, ['DELETE', 'POST']);
  if (auth.error) return auth.error;
  const input = getDataFromEvent(event);
  const id = input.id || event.queryStringParameters?.id;
  if (!id && !(input.meetup_id && input.wechat_id))
    return createErrorResponse('缺少必要参数');

  let query = supabase.from('meetup_rsvps').select('id');
  if (id) query = query.eq('id', id);
  else
    query = query
      .eq('meetup_id', input.meetup_id)
      .eq('wechat_id', input.wechat_id);
  // A WeChat ID is a lookup key, never proof of ownership. Legacy guest
  // registrations without an account must be cancelled by an organizer.
  if (auth.user.role !== 'organizer') query = query.eq('user_id', auth.user.id);
  const { data: records, error: lookupError } = await query;
  if (lookupError) return createErrorResponse('读取报名记录失败', 500);
  if (!records?.length) return createErrorResponse('报名不存在或无权取消', 404);

  let update = supabase
    .from('meetup_rsvps')
    .update({ status: RSVPStatus.CANCELLED })
    .in(
      'id',
      records.map((record) => record.id)
    );
  if (auth.user.role !== 'organizer')
    update = update.eq('user_id', auth.user.id);
  const { data, error } = await update.select('id');
  if (error) return createErrorResponse('取消报名失败', 500);
  if (!data?.length) return createErrorResponse('报名不存在或无权取消', 404);
  return createSuccessResponse({
    success: true,
    message: '取消报名成功',
    affected: data.length,
  });
}

async function handleCancelByMeetupWechat(event: NetlifyEvent) {
  return handleCancel(event);
}

async function handleGuestCancel(event: NetlifyEvent) {
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);
  const input = getDataFromEvent(event);
  const receipt = verifyGuestCancellationToken(input.guest_cancel_token);
  if (!receipt)
    return createErrorResponse('取消凭证无效或已过期，请联系组织者', 403);
  // The capability determines both IDs; ignore request IDs and WeChat values.
  const { data, error } = await supabase
    .from('meetup_rsvps')
    .update({ status: RSVPStatus.CANCELLED })
    .eq('id', receipt.id)
    .eq('meetup_id', receipt.meetupId)
    .is('user_id', null)
    .select('id');
  if (error) return createErrorResponse('取消报名失败', 500);
  if (!data?.length) return createErrorResponse('游客报名不存在', 404);
  return createSuccessResponse({ success: true, message: '取消报名成功' });
}
