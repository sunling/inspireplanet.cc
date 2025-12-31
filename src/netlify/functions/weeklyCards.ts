// src/netlify/functions/fetchWeeklyCards.ts
import { supabase } from '../../database/supabase';
import { getCommonHttpHeader } from '../../utils/http';
import { NetlifyContext, NetlifyEvent } from '../types/http';
import { WeeklyCard, WeeklyCardResponse } from '../types';

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
        } as WeeklyCardResponse),
      };
    }

    const params = event.queryStringParameters || {};
    const episodeParam = params.episode;
    const limitParam = params.limit ? parseInt(params.limit as string, 10) : undefined;

    let query = supabase.from('weekly_cards').select('*');
    if (episodeParam) {
      const digits = (episodeParam.match(/\d+/)?.[0]) || '';
      if (digits) {
        // 兼容 EP43、第43期 等格式，按数字模糊匹配
        query = query.ilike('episode', `%${digits}%`);
      } else {
        // 无数字，则使用模糊匹配整个字符串
        query = query.ilike('episode', `%${episodeParam}%`);
      }
    }
    query = query.order('created', { ascending: false });
    if (limitParam && !Number.isNaN(limitParam)) {
      query = query.limit(limitParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weekly cards:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message } as WeeklyCardResponse),
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ records } as WeeklyCardResponse),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        success: false,
        records: [],
        message: error instanceof Error ? error.message : String(error),
      } as WeeklyCardResponse),
    };
  }
}
