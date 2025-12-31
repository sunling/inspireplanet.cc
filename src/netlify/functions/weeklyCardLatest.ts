// src/netlify/functions/getLatestWeeklyCards.ts
import { supabase } from '../../database/supabase';
import { getCommonHttpHeader } from '../../utils/http';
import { WeeklyCard } from '../types';
import { NetlifyContext, NetlifyEvent } from '../types/http';

export interface LatestWeeklyCardsResponse {
  records: WeeklyCard[];
  episode?: string | number;
  total: number;
  error?: string;
  message?: string;
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}> {
  // 设置CORS头
  const headers = getCommonHttpHeader();

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          error: 'Method Not Allowed',
          records: [],
          total: 0,
        } as LatestWeeklyCardsResponse),
      };
    }

    // 获取最新一期的episode编号
    const { data: latestEpisode, error: episodeError } = await supabase
      .from('weekly_cards')
      .select('episode')
      .order('episode', { ascending: false })
      .limit(1);

    if (episodeError) {
      console.error('Error fetching latest episode:', episodeError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: episodeError.message,
          records: [],
          total: 0,
        } as LatestWeeklyCardsResponse),
      };
    }

    if (!latestEpisode || latestEpisode.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          records: [],
          total: 0,
        } as LatestWeeklyCardsResponse),
      };
    }

    const latestEpisodeNumber = latestEpisode[0].episode;

    // 获取该期的所有卡片
    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .eq('episode', latestEpisodeNumber)
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: error.message,
          records: [],
          total: 0,
        } as LatestWeeklyCardsResponse),
      };
    }

    // 格式化返回数据
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        records,
        episode: latestEpisodeNumber,
        total: records.length,
      } as LatestWeeklyCardsResponse),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
        records: [],
        total: 0,
      } as LatestWeeklyCardsResponse),
    };
  }
}
