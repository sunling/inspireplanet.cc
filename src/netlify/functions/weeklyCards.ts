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

    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .order('Created', { ascending: false });

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
      episode: row.Episode,
      title: row.Title,
      name: row.Name,
      quote: row.Quote,
      detail: row.Detail,
      created: row.Created,
      imagePath: row.ImagePath,
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
