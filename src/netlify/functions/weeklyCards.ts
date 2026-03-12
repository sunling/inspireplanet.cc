// src/netlify/functions/weeklyCards.ts
import { supabase } from '../../database/supabase';
import { WeeklyCard } from '../services/weeklyCards';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFuntionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
      case 'getAll':
        return await handleGetAll(event);
      case 'getByEpisode':
        return await handleGetByEpisode(event);
      case 'getAllLimited':
        return await handleGetAllLimited(event);
      case 'create':
        return await handleCreate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ records: data } as unknown as {
      records: WeeklyCard[];
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetByEpisode(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const data = getDataFromEvent(event);
    const episode = data.episode;

    if (!episode) {
      return createErrorResponse('缺少期数参数');
    }

    let query = supabase.from('weekly_cards').select('*');
    const digits = episode.match(/\d+/)?.[0] || '';
    if (digits) {
      query = query.ilike('episode', `%${digits}%`);
    } else {
      query = query.ilike('episode', `%${episode}%`);
    }
    query = query.order('created', { ascending: false });

    const { data: result, error } = await query;

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ records: result } as {
      records: WeeklyCard[];
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetAllLimited(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const data = getDataFromEvent(event);
    const limit = parseInt(data.limit as string, 10);

    if (isNaN(limit) || limit <= 0) {
      return createErrorResponse('无效的限制参数');
    }

    const { data: result, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .order('created', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ records: result } as {
      records: WeeklyCard[];
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const data = getDataFromEvent(event);
    const { name, title, quote, detail, episode } = data;

    if (!name || !title || !quote || !detail || !episode) {
      return createErrorResponse('缺少必要参数');
    }

    const { data: result, error } = await supabase
      .from('weekly_cards')
      .insert({
        name,
        title,
        quote,
        detail,
        episode,
        created: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating weekly card:', error);
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ id: result.id, message: '创建成功' });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
