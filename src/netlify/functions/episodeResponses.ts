import { createHash } from 'crypto';

import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  getFunctionNameFromEvent,
  handleOptionsRequest,
} from '../utils/server';
import { validateEpisodeResponseInput } from '../validation/episodeResponses';

const MAX_RESPONSES_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export interface EpisodeResponse {
  id: number;
  meetup_id: number;
  episode_number: number;
  content: string;
  author: string;
  created_at: string;
}

const getClientFingerprint = (event: NetlifyEvent) => {
  const ip =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'];
  if (!ip) return null;

  const salt =
    process.env.RESPONSE_RATE_LIMIT_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'inspire-planet-response';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
};

export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    switch (getFunctionNameFromEvent(event)) {
      case 'getByEpisode':
        return await handleGetByEpisode(event);
      case 'create':
        return await handleCreate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Episode responses handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetByEpisode(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const validation = validateEpisodeResponseInput(getDataFromEvent(event));
  if (!validation.ok) return createErrorResponse(validation.error);
  const { meetupId, episodeNumber } = validation.value;

  const { data, error } = await supabase
    .from('episode_responses')
    .select('id, meetup_id, episode_number, content, author, created_at')
    .eq('meetup_id', meetupId)
    .eq('episode_number', episodeNumber)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Get episode responses error:', error);
    return createErrorResponse('读取本期回应失败', 500);
  }

  return createSuccessResponse({ responses: data || [] });
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const data = getDataFromEvent(event);

  // Hidden honeypot: bots often fill every field. Return a normal response so
  // they do not learn how to bypass it, while keeping the wall clean.
  if (String(data.website || '').trim()) {
    return createSuccessResponse({ response: null }, 201);
  }

  const validation = validateEpisodeResponseInput(data, true);
  if (!validation.ok) return createErrorResponse(validation.error);
  const { meetupId, episodeNumber, content, author } = validation.value;

  const { data: meetup } = await supabase
    .from('meetups')
    .select('id')
    .eq('id', meetupId)
    .maybeSingle();
  if (!meetup) return createErrorResponse('活动不存在', 404);

  const fingerprint = getClientFingerprint(event);
  if (fingerprint) {
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MS
    ).toISOString();
    const { count, error: countError } = await supabase
      .from('episode_responses')
      .select('id', { count: 'exact', head: true })
      .eq('request_fingerprint', fingerprint)
      .gte('created_at', windowStart);

    if (countError) {
      console.error('Episode response rate limit error:', countError);
      return createErrorResponse('暂时无法发布，请稍后再试', 500);
    }
    if ((count || 0) >= MAX_RESPONSES_PER_WINDOW) {
      return createErrorResponse('发布得有点快，请稍后再试', 429);
    }
  }

  const { data: created, error } = await supabase
    .from('episode_responses')
    .insert({
      meetup_id: meetupId,
      episode_number: episodeNumber,
      content,
      author,
      request_fingerprint: fingerprint,
    })
    .select('id, meetup_id, episode_number, content, author, created_at')
    .single();

  if (error) {
    console.error('Create episode response error:', error);
    return createErrorResponse('发布失败，请稍后再试', 500);
  }

  return createSuccessResponse({ response: created }, 201);
}
