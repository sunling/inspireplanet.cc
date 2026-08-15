import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
  getAuthenticatedUser,
} from '../utils/server';
import { sendRSVPConfirmEmail, sendRSVPRejectEmail } from '../utils/email';
import { RSVPStatus, ApprovalStatus } from '../types/rsvp';

export interface ParticipantAction {
  functionName:
    | 'confirm'
    | 'batchConfirm'
    | 'batchReject'
    | 'getParticipants'
    | 'getWritingGroups'
    | 'addToWritingGroup';
}

export async function handler(event: NetlifyEvent, context: any) {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
      case 'batchConfirm':
        return await handleBatchConfirm(event);
      case 'batchReject':
        return await handleBatchReject(event);
      case 'getParticipants':
        return await handleGetParticipants(event);
      case 'getWritingGroups':
        return await handleGetWritingGroups(event);
      case 'addToWritingGroup':
        return await handleAddToWritingGroup(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Participants Handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function requireOrganizer(event: NetlifyEvent) {
  const user = await getAuthenticatedUser(event);
  if (!user) return { error: createErrorResponse('未授权', 401) };
  if (user.role !== 'organizer')
    return { error: createErrorResponse('需要管理员权限', 403) };
  return { user };
}

async function handleGetWritingGroups(event: NetlifyEvent) {
  const auth = await requireOrganizer(event);
  if (auth.error) return auth.error;

  const { data, error } = await supabase
    .from('writing_groups')
    .select('id, name, description')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return createErrorResponse('获取讨论组失败', 500);

  return createSuccessResponse({
    groups: (data || []).map((group) => ({
      ...group,
      id: String(group.id),
    })),
  });
}

async function handleAddToWritingGroup(event: NetlifyEvent) {
  const auth = await requireOrganizer(event);
  if (auth.error) return auth.error;

  const requestData = getDataFromEvent(event);
  const meetupId = Number(requestData.meetup_id);
  const groupId = Number(requestData.group_id);
  if (!Number.isInteger(meetupId) || meetupId <= 0)
    return createErrorResponse('活动ID不合法');
  if (!Number.isInteger(groupId) || groupId <= 0)
    return createErrorResponse('讨论组ID不合法');

  const [{ data: meetup }, { data: group }] = await Promise.all([
    supabase.from('meetups').select('id').eq('id', meetupId).maybeSingle(),
    supabase
      .from('writing_groups')
      .select('id, name')
      .eq('id', groupId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);
  if (!meetup) return createErrorResponse('活动不存在', 404);
  if (!group) return createErrorResponse('讨论组不存在或已停用', 404);

  const { data: rsvps, error: rsvpError } = await supabase
    .from('meetup_rsvps')
    .select('user_id')
    .eq('meetup_id', meetupId)
    .eq('status', RSVPStatus.CONFIRMED);
  if (rsvpError) return createErrorResponse('获取活动报名人员失败', 500);

  const validUserIds = (rsvps || [])
    .map((row) => Number(row.user_id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const userIds = Array.from(new Set(validUserIds));
  const skippedCount = (rsvps || []).length - validUserIds.length;
  if (userIds.length === 0) {
    return createSuccessResponse({
      message: '没有可加入讨论组的站内用户',
      added_count: 0,
      existing_count: 0,
      skipped_count: skippedCount,
    });
  }

  const { data: existing, error: existingError } = await supabase
    .from('writing_group_members')
    .select('user_id, status')
    .eq('group_id', groupId)
    .in('user_id', userIds);
  if (existingError) return createErrorResponse('检查讨论组成员失败', 500);

  const approvedIds = new Set(
    (existing || [])
      .filter((member) => member.status === 'approved')
      .map((member) => Number(member.user_id))
  );
  const rows = userIds
    .filter((userId) => !approvedIds.has(userId))
    .map((userId) => ({
      group_id: groupId,
      user_id: userId,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: Number(auth.user.id),
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('writing_group_members')
      .upsert(rows, { onConflict: 'group_id,user_id' });
    if (error) {
      console.error('Add meetup participants to writing group error:', error);
      return createErrorResponse('添加讨论组成员失败', 500);
    }
  }

  return createSuccessResponse({
    message: `已将活动报名人员同步到「${group.name}」`,
    added_count: rows.length,
    existing_count: approvedIds.size,
    skipped_count: skippedCount,
  });
}

async function handleBatchReject(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, rsvp_ids, send_email, approved_by } = requestData;

    if (!meetup_id || !rsvp_ids || !Array.isArray(rsvp_ids)) {
      return createErrorResponse('缺少必要参数');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    // 获取活动详情
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select('id, title')
      .eq('id', meetupIdNum)
      .single();

    if (meetupError || !meetup) {
      return createErrorResponse('活动不存在', 404);
    }

    const now = new Date().toISOString();

    // 更新参与者状态
    const { data: updatedRsvps, error: updateError } = await supabase
      .from('meetup_rsvps')
      .update({
        application_status: ApprovalStatus.REJECTED,
        approved_by: approved_by || 'Organizer',
        approved_at: now,
      })
      .in('id', rsvp_ids)
      .eq('meetup_id', meetupIdNum)
      .select('*');

    if (updateError) {
      console.error('Update error:', updateError);
      return createErrorResponse('更新失败', 500);
    }

    // 如果需要发送邮件通知
    if (send_email && updatedRsvps && updatedRsvps.length > 0) {
      for (const rsvp of updatedRsvps) {
        let email = null;
        // 尝试从用户表获取邮箱（如果有 user_id）
        if (rsvp.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', rsvp.user_id)
              .single();
            email = userData?.email;
          } catch (userError) {
            console.error('获取用户邮箱失败:', userError);
          }
        }

        if (email) {
          try {
            await sendRSVPRejectEmail({
              to: email,
              name: rsvp.name || '参与者',
              meetupTitle: meetup.title,
              meetupId: meetup.id,
            });

            // 更新邮件发送记录
            try {
              await supabase
                .from('meetup_rsvps')
                .update({ email_sent: true, email_sent_at: now })
                .eq('id', rsvp.id);
            } catch (updateError) {
              // 忽略这个错误，因为这两个字段可能也不存在
            }
          } catch (emailError) {
            console.error('发送拒绝邮件失败:', emailError);
          }
        }
      }
    }

    return createSuccessResponse({
      message: `已拒绝 ${updatedRsvps?.length || 0} 位参与者`,
      count: updatedRsvps?.length || 0,
    });
  } catch (error) {
    console.error('Batch reject error:', error);
    return createErrorResponse('批量拒绝失败', 500);
  }
}

async function handleBatchConfirm(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, rsvp_ids, send_email, approved_by } = requestData;

    if (!meetup_id || !rsvp_ids || !Array.isArray(rsvp_ids)) {
      return createErrorResponse('缺少必要参数');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    // 获取活动详情
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select('id, title, datetime, location, mode, duration')
      .eq('id', meetupIdNum)
      .single();

    if (meetupError || !meetup) {
      return createErrorResponse('活动不存在', 404);
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, any> = {
      status: RSVPStatus.CONFIRMED,
      application_status: ApprovalStatus.APPROVED,
      approved_by: approved_by || 'Organizer',
      approved_at: now,
    };

    // 更新参与者状态
    const { data: updatedRsvps, error: updateError } = await supabase
      .from('meetup_rsvps')
      .update(updateFields)
      .in('id', rsvp_ids)
      .eq('meetup_id', meetupIdNum)
      .select('*');

    if (updateError) {
      console.error('Update error:', updateError);
      return createErrorResponse('更新失败', 500);
    }

    // 如果需要发送邮件通知
    if (send_email && updatedRsvps && updatedRsvps.length > 0) {
      for (const rsvp of updatedRsvps) {
        let email = null;
        // 尝试从用户表获取邮箱（如果有 user_id）
        if (rsvp.user_id) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', rsvp.user_id)
              .single();
            email = userData?.email;
          } catch (userError) {
            console.error('获取用户邮箱失败:', userError);
          }
        }

        if (email) {
          try {
            await sendRSVPConfirmEmail({
              to: email,
              name: rsvp.name || '参与者',
              meetupTitle: meetup.title,
              meetupId: meetup.id,
              eventDatetime: meetup.datetime,
              durationHours: meetup.duration ? Number(meetup.duration) : 1,
              location: meetup.location,
              mode: meetup.mode,
              timezone: 'Asia/Shanghai',
            });

            // 更新邮件发送记录
            try {
              await supabase
                .from('meetup_rsvps')
                .update({ email_sent: true, email_sent_at: now })
                .eq('id', rsvp.id);
            } catch (updateError) {
              // 忽略这个错误，因为这两个字段可能也不存在
            }
          } catch (emailError) {
            console.error('发送邮件失败:', emailError);
          }
        }
      }
    }

    return createSuccessResponse({
      message: `已确认 ${updatedRsvps?.length || 0} 位参与者`,
      count: updatedRsvps?.length || 0,
    });
  } catch (error) {
    console.error('Batch confirm error:', error);
    return createErrorResponse('批量确认失败', 500);
  }
}

async function handleGetParticipants(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, page = 1, limit = 10, stats_only = false } = requestData;

    if (!meetup_id) {
      return createErrorResponse('缺少活动ID');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    // 一次并行获取完整统计，避免用当前页数据推算审批状态。
    const countBy = (field?: string, value?: string) => {
      let query = supabase
        .from('meetup_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('meetup_id', meetupIdNum);
      if (field && value) query = query.eq(field, value);
      return query;
    };
    const [
      totalResult,
      confirmedResult,
      cancelledResult,
      pendingResult,
      approvedResult,
      rejectedResult,
    ] = await Promise.all([
      countBy(),
      countBy('status', RSVPStatus.CONFIRMED),
      countBy('status', RSVPStatus.CANCELLED),
      countBy('application_status', ApprovalStatus.PENDING),
      countBy('application_status', ApprovalStatus.APPROVED),
      countBy('application_status', ApprovalStatus.REJECTED),
    ]);

    const countError = [
      totalResult,
      confirmedResult,
      cancelledResult,
      pendingResult,
      approvedResult,
      rejectedResult,
    ].find((result) => result.error)?.error;
    if (countError) {
      console.error('Get participants count error:', countError);
      return createErrorResponse('获取参与者失败', 500);
    }

    const stats = {
      total: totalResult.count || 0,
      confirmedCount: confirmedResult.count || 0,
      cancelledCount: cancelledResult.count || 0,
      pendingCount: pendingResult.count || 0,
      approvedCount: approvedResult.count || 0,
      rejectedCount: rejectedResult.count || 0,
    };

    if (stats_only) {
      return createSuccessResponse({ participants: [], ...stats });
    }

    // 计算分页参数
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { data: participants, error } = await supabase
      .from('meetup_rsvps')
      .select('*')
      .eq('meetup_id', meetupIdNum)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Get participants error:', error);
      return createErrorResponse('获取参与者失败', 500);
    }

    // 如果有参与者数据，根据 user_id 从 users 表获取邮箱
    let enrichedParticipants = participants || [];
    if (enrichedParticipants.length > 0) {
      // 收集所有 user_id
      const userIds = enrichedParticipants
        .map((p: any) => p.user_id)
        .filter(
          (id): id is number =>
            id !== null && id !== undefined && !isNaN(Number(id))
        );

      if (userIds.length > 0) {
        // 从 users 表获取用户信息
        const { data: users } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        // 创建 id -> email 的映射
        const userEmailMap = new Map();
        if (users) {
          users.forEach((user: any) => {
            userEmailMap.set(user.id, user.email);
          });
        }

        // 丰富参与者数据，添加邮箱
        enrichedParticipants = enrichedParticipants.map((p: any) => {
          const email = p.user_id ? userEmailMap.get(p.user_id) : null;
          return {
            ...p,
            email: email || null,
          };
        });
      }

      // 获取问卷答案
      const surveySubmissionIds = enrichedParticipants
        .map((p: any) => p.survey_submission_id)
        .filter((id: any) => id !== null && id !== undefined);

      if (surveySubmissionIds.length > 0) {
        // 从 survey_answers 表获取答案
        const { data: surveyAnswers } = await supabase
          .from('survey_answers')
          .select('submission_id, question_id, value')
          .in('submission_id', surveySubmissionIds);

        // 创建 submission_id -> { question_id: value } 的映射
        const submissionAnswersMap = new Map();
        if (surveyAnswers) {
          surveyAnswers.forEach((answer: any) => {
            const existing =
              submissionAnswersMap.get(answer.submission_id) || {};
            existing[answer.question_id] = answer.value;
            submissionAnswersMap.set(answer.submission_id, existing);
          });
        }

        // 添加问卷答案到参与者数据
        enrichedParticipants = enrichedParticipants.map((p: any) => {
          const surveyAnswersData = submissionAnswersMap.get(
            p.survey_submission_id
          );
          return {
            ...p,
            survey_answers: surveyAnswersData
              ? JSON.stringify(surveyAnswersData)
              : null,
          };
        });
      }
    }

    return createSuccessResponse({
      participants: enrichedParticipants,
      ...stats,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    return createErrorResponse('获取参与者失败', 500);
  }
}
