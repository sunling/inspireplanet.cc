import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
} from '../utils/server';

export interface UserProfileAction {
  action: 'get' | 'update';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as UserProfileAction;

    switch (action) {
      case 'get':
        return await handleGet(event);
      case 'update':
        return await handleUpdate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('UserProfile handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('未授权', 401);

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return createErrorResponse(error.message, 500);
  }

  return createSuccessResponse({ profile: data || null });
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('未授权', 401);

  if (!event.body) return createErrorResponse('请求体为空');

  const payload = JSON.parse(event.body);
  const record: Record<string, any> = {
    bio: payload.bio ?? null,
    interests: Array.isArray(payload.interests) ? payload.interests : null,
    expertise: Array.isArray(payload.expertise) ? payload.expertise : null,
    availability_text: payload.availability_text ?? null,
    wechat_id: payload.wechat_id ?? null,
    city: payload.city ?? null,
    offerings: Array.isArray(payload.offerings) ? payload.offerings : null,
    seeking: Array.isArray(payload.seeking) ? payload.seeking : null,
  };

  const uid = isNaN(Number(userId)) ? userId : Number(userId);
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', uid)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(record)
      .eq('user_id', uid)
      .select();

    if (error) return createErrorResponse(error.message, 500);

    return createSuccessResponse({ profile: data?.[0] || null });
  } else {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ user_id: uid, ...record })
      .select();

    if (error) return createErrorResponse(error.message, 500);

    return createSuccessResponse({ profile: data?.[0] || null });
  }
}
