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

export interface ParticipantAction {
  functionName: 'confirm' | 'batchConfirm' | 'getParticipants';
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
      status: 'confirmed',
      application_status: 'approved',
      approved_by: approved_by || 'Organizer',
      approved_at: now,
    };

    // 更新参与者状态
    const { data: updatedRsvps, error: updateError } = await supabase
      .from('meetup_rsvps')
      .update(updateFields)
      .in('id', rsvp_ids)
      .eq('meetup_id', meetupIdNum)
      .select('id, name, email');

    if (updateError) {
      console.error('Update error:', updateError);
      return createErrorResponse('更新失败', 500);
    }

    // 如果需要发送邮件通知
    if (send_email && updatedRsvps && updatedRsvps.length > 0) {
      for (const rsvp of updatedRsvps) {
        if (rsvp.email) {
          try {
            await sendRSVPConfirmEmail({
              to: rsvp.email,
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
            await supabase
              .from('meetup_rsvps')
              .update({ email_sent: true, email_sent_at: now })
              .eq('id', rsvp.id);
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
    const { meetup_id } = requestData;

    if (!meetup_id) {
      return createErrorResponse('缺少活动ID');
    }

    const meetupIdNum = Number(meetup_id);
    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return createErrorResponse('活动ID不合法');
    }

    const { data: participants, error } = await supabase
      .from('meetup_rsvps')
      .select(
        'id, name, email, status, created_at, question_answer, application_status, approved_by, approved_at, email_sent, email_sent_at'
      )
      .eq('meetup_id', meetupIdNum)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get participants error:', error);
      return createErrorResponse('获取参与者失败', 500);
    }

    return createSuccessResponse({ participants: participants || [] });
  } catch (error) {
    console.error('Get participants error:', error);
    return createErrorResponse('获取参与者失败', 500);
  }
}
