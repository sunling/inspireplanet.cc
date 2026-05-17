import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
  getUserIdFromAuth,
} from '../utils/server';

export interface MeetupEpisode {
  id?: number;
  meetup_id: number;
  episode_number: number;
  date: string; // YYYY-MM-DD
  theme?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    const functionName = getFunctionNameFromEvent(event);
    switch (functionName) {
      case 'getByMeetupDate':
        return await handleGetByMeetupDate(event);
      case 'upsert':
        return await handleUpsert(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Episodes handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 获取某个循环活动在指定日期的期次信息
async function handleGetByMeetupDate(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  const { meetup_id, date } = getDataFromEvent(event);
  if (!meetup_id || !date) return createErrorResponse('缺少必填字段');

  const { data, error } = await supabase
    .from('meetup_episodes')
    .select('*')
    .eq('meetup_id', meetup_id)
    .eq('date', date)
    .maybeSingle();

  if (error) return createErrorResponse('查询失败', 500);
  return createSuccessResponse({ episode: data || null });
}

// 创建或更新某期主题（仅 organizer）
async function handleUpsert(event: NetlifyEvent): Promise<NetlifyResponse> {
  const userId = await getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('请先登录', 401);

  // 校验 organizer 权限
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!user || user.role !== 'organizer') {
    return createErrorResponse('没有权限', 403);
  }

  const { meetup_id, episode_number, date, theme, description } =
    getDataFromEvent(event);
  if (!meetup_id || !episode_number || !date)
    return createErrorResponse('缺少必填字段');

  const { data, error } = await supabase
    .from('meetup_episodes')
    .upsert(
      {
        meetup_id,
        episode_number,
        date,
        theme,
        description,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'meetup_id,episode_number' }
    )
    .select()
    .single();

  if (error) {
    console.error('Upsert episode error:', error);
    return createErrorResponse('保存失败', 500);
  }
  return createSuccessResponse({ episode: data });
}
