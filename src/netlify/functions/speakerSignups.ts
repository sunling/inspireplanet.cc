import {
  protectAction,
  emailAddress,
  shortText,
  MailProtectionError,
} from '../utils/mailProtection';
import { requireMutationUser } from '../utils/authorization';
import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
  getAuthenticatedUser,
} from '../utils/server';
import { sendSpeakerConfirmEmail } from '../utils/email';

export interface SpeakerSignup {
  id?: number;
  meetup_id: number;
  episode_number: number;
  name: string;
  topic: string;
  duration?: string;
  email?: string;
  timezone?: string;
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
    if (error instanceof MailProtectionError)
      return createErrorResponse(error.message, error.status);
    console.error('Speaker signup operation failed');
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
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);
  const input = getDataFromEvent(event);
  const meetup_id = Number(input.meetup_id);
  const episode_number = Number(input.episode_number);
  const name = shortText(input.name, 80);
  const topic = shortText(input.topic, 300);
  const duration = input.duration ? shortText(input.duration, 80) : undefined;
  const timezone =
    typeof input.timezone === 'string' ? input.timezone : 'Asia/Shanghai';
  if (
    !Number.isSafeInteger(meetup_id) ||
    meetup_id < 1 ||
    !Number.isSafeInteger(episode_number) ||
    episode_number < 1 ||
    !name ||
    !topic ||
    (input.duration && !duration) ||
    (input.email && !emailAddress(input.email))
  )
    return createErrorResponse('报名信息格式无效或过长');
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
  } catch {
    return createErrorResponse('时区无效');
  }
  const user = await getAuthenticatedUser(event);
  await protectAction(event, 'speaker-signup', user?.id);

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

  // An unverified form address must never receive branded confirmation email.
  // Guests can still register; signed-in confirmations use only the profile email.
  let confirmationEmail = 'not_requested';
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();
    const to = emailAddress(profile?.email);
    const { data: meetup } = await supabase
      .from('meetups')
      .select('title, datetime, location, mode, duration')
      .eq('id', meetup_id)
      .maybeSingle();
    if (to && meetup) {
      try {
        await sendSpeakerConfirmEmail({
          to,
          name,
          topic,
          duration: duration || undefined,
          meetupTitle: meetup.title,
          meetupId: meetup_id,
          eventDatetime: meetup.datetime,
          durationHours: meetup.duration ? Number(meetup.duration) : 1,
          location: meetup.location,
          mode: meetup.mode,
          episodeNumber: episode_number,
          timezone,
        });
        confirmationEmail = 'sent_or_duplicate';
      } catch {
        confirmationEmail = 'failed';
        console.error('Speaker signup saved, confirmation delivery failed');
      }
    }
  }

  return createSuccessResponse({
    signup: data,
    confirmation_email: confirmationEmail,
  });
}

async function handleUpdateStatus(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const auth = await requireMutationUser(event, ['PUT', 'POST'], true);
  if (auth.error) return auth.error;
  const { id, status } = getDataFromEvent(event);
  if (!id || !status) return createErrorResponse('缺少必填字段');
  if (!['pending', 'confirmed', 'cancelled'].includes(status))
    return createErrorResponse('无效的报名状态', 400);

  const { data, error } = await supabase
    .from('speaker_signups')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return createErrorResponse('更新失败', 500);
  return createSuccessResponse({ signup: data });
}
