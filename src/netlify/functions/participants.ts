import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';
import { sendRSVPConfirmEmail } from '../utils/email';
import { RSVPStatus, ApprovalStatus } from '../types/rsvp';

export interface ParticipantAction {
  functionName: 'confirm' | 'batchConfirm' | 'batchReject' | 'getParticipants';
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
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Participants Handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleBatchReject(event: NetlifyEvent) {
  try {
    const requestData = getDataFromEvent(event);
    const { meetup_id, rsvp_ids } = requestData;

    if (!meetup_id || !rsvp_ids || !Array.isArray(rsvp_ids)) {
      return createErrorResponse('缺少必要参数');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    // 更新参与者状态
    const { data: updatedRsvps, error: updateError } = await supabase
      .from('meetup_rsvps')
      .update({
        status: RSVPStatus.CANCELLED,
        application_status: ApprovalStatus.REJECTED,
      })
      .in('id', rsvp_ids)
      .eq('meetup_id', meetupIdNum)
      .select('id');

    if (updateError) {
      console.error('Update error:', updateError);
      return createErrorResponse('更新失败', 500);
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
      status: RSVPStatus.JOINED,
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
    const { meetup_id, page = 1, limit = 10 } = requestData;

    if (!meetup_id) {
      return createErrorResponse('缺少活动ID');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    // 获取总数
    const { count: total, error: countError } = await supabase
      .from('meetup_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupIdNum);

    if (countError) {
      console.error('Get participants count error:', countError);
      return createErrorResponse('获取参与者失败', 500);
    }

    // 获取各状态的数量
    const { count: joinedCount } = await supabase
      .from('meetup_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupIdNum)
      .or(`status.eq.${RSVPStatus.JOINED},status.eq.confirmed`);

    const { count: cancelledCount } = await supabase
      .from('meetup_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('meetup_id', meetupIdNum)
      .eq('status', RSVPStatus.CANCELLED);

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
    }

    return createSuccessResponse({
      participants: enrichedParticipants,
      total,
      joinedCount: joinedCount || 0,
      cancelledCount: cancelledCount || 0,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    return createErrorResponse('获取参与者失败', 500);
  }
}
