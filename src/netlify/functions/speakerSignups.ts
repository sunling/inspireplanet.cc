import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';
import { sendSpeakerConfirmEmail } from '../utils/email';

export interface SpeakerSignup {
  id?: number;
  meetup_id: number;
  episode_number: number;
  name: string;
  topic: string;
  duration?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  created_at?: string;
}

export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    const functionName = getFunctionNameFromEvent(event);
    switch (functionName) {
      case 'getByEpisode':
        return await handleGetByEpisode(event);
      case 'create':
        return await handleCreate(event);
      case 'updateStatus':
        return await handleUpdateStatus(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('SpeakerSignups handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetByEpisode(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const { meetup_id, episode_number } = getDataFromEvent(event);
  if (!meetup_id || !episode_number) return createErrorResponse('缺少必填字段');

  const { data, error } = await supabase
    .from('speaker_signups')
    .select('*')
    .eq('meetup_id', meetup_id)
    .eq('episode_number', episode_number)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });

  if (error) return createErrorResponse('查询失败', 500);
  return createSuccessResponse({ signups: data || [] });
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const { meetup_id, episode_number, name, topic, duration, email, timezone } =
    getDataFromEvent(event);
  if (!meetup_id || !episode_number || !name?.trim() || !topic?.trim()) {
    return createErrorResponse('缺少必填字段');
  }

  const { data, error } = await supabase
    .from('speaker_signups')
    .insert([
      {
        meetup_id,
        episode_number,
        name: name.trim(),
        topic: topic.trim(),
        duration: duration?.trim() || null,
        status: 'pending',
      },
    ])
    .select()
    .single();

  if (error) return createErrorResponse('报名失败', 500);

  // 发送确认邮件
  if (email?.trim()) {
    const { data: meetup } = await supabase
      .from('meetups')
      .select('title, datetime, location, mode, duration')
      .eq('id', meetup_id)
      .single();

    const { data: episode } = await supabase
      .from('meetup_episodes')
      .select('date')
      .eq('meetup_id', meetup_id)
      .eq('episode_number', episode_number)
      .single();

    if (meetup) {
      const eventDatetime = meetup.datetime;

      sendSpeakerConfirmEmail({
        to: email.trim(),
        name: name.trim(),
        topic: topic.trim(),
        duration: duration?.trim(),
        meetupTitle: meetup.title,
        meetupId: Number(meetup_id),
        eventDatetime,
        durationHours: meetup.duration ? Number(meetup.duration) : 1,
        location: meetup.location,
        mode: meetup.mode,
        episodeNumber: Number(episode_number),
        timezone: timezone || 'Asia/Shanghai',
      });
    }
  }

  return createSuccessResponse({ signup: data });
}

async function handleUpdateStatus(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const { id, status } = getDataFromEvent(event);
  if (!id || !status) return createErrorResponse('缺少必填字段');

  const { data, error } = await supabase
    .from('speaker_signups')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return createErrorResponse('更新失败', 500);
  return createSuccessResponse({ signup: data });
}
