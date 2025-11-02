// src/netlify/functions/fetchWeeklyCards.ts
import { supabase } from '../../database/supabase';

// 定义接口
export interface WeeklyCard {
  id?: string;
  Episode?: string | number;
  Title?: string;
  Name?: string;
  Quote?: string;
  Detail?: string;
  Created?: string | Date;
  ImagePath?: string;
}

export interface WeeklyCardResponse {
  records: WeeklyCard[];
  error?: string;
}

export interface NetlifyEvent {
  httpMethod: string;
  headers?: Record<string, string>;
  body?: string;
  queryStringParameters?: Record<string, string>;
}

export interface NetlifyContext {
  clientContext?: {
    user?: any;
  };
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

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
      Episode: row.Episode,
      Title: row.Title,
      Name: row.Name,
      Quote: row.Quote,
      Detail: row.Detail,
      Created: row.Created,
      ImagePath: row.ImagePath,
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
        records: [],
        message: error instanceof Error ? error.message : String(error),
      } as WeeklyCardResponse),
    };
  }
}
