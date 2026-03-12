import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getActionFromEvent,
} from '../utils/server';

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
      case 'getLatestWeeklyCards':
        return await handleGetLatestWeeklyCards(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('WeeklyCardLatest handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetLatestWeeklyCards(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    // 获取最新一期的episode编号
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
      return createSuccessResponse({ records: [] });
    }

    const latestEpisodeNumber = latestEpisode[0].episode;

    // 获取该期所有卡片
    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .eq('episode', latestEpisodeNumber)
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ records: data });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
