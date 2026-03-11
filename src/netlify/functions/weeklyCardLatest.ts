import { supabase } from '../../database/supabase';
import { WeeklyCard } from '../modules/weeklyCards';

import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getActionFromEvent,
} from '../utils/server';

export interface LatestWeeklyCardsResponse {
  records: WeeklyCard[];
  episode?: string | number;
  total: number;
  error?: string;
  message?: string;
}

export interface WeeklyCardLatestAction {
  action: 'get';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const action = getActionFromEvent(event);

    switch (action) {
      case 'get':
        return await handleGet(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('WeeklyCardLatest handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    // 按创建时间取最新一条，以此确定最新一期的episode编号
    const { data: latestEpisode, error: episodeError } = await supabase
      .from('weekly_cards')
      .select('episode')
      .order('created', { ascending: false })
      .limit(1);

    if (episodeError) {
      console.error('Error fetching latest episode:', episodeError);
      return createErrorResponse(episodeError.message, 500);
    }

    if (!latestEpisode || latestEpisode.length === 0) {
      return createSuccessResponse({ records: [], total: 0 });
    }

    const latestEpisodeNumber = latestEpisode[0].episode;

    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .eq('episode', latestEpisodeNumber)
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return createErrorResponse(error.message, 500);
    }

    const records = (data || []).map((row: any, index: number) => ({
      id: row.id || `row_${index}`,
      episode: row.episode,
      title: row.title,
      name: row.name,
      quote: row.quote,
      detail: row.detail,
      created: row.created,
      imagePath: row.image_path,
    }));

    return createSuccessResponse({
      records,
      episode: latestEpisodeNumber,
      total: records.length,
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
