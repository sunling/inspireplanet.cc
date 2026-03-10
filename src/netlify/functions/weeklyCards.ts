// src/netlify/functions/fetchWeeklyCards.ts
import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import { WeeklyCard, WeeklyCardResponse } from '../types';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
} from '../utils/server';

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    if (event.httpMethod !== 'GET') {
      return createErrorResponse('Method Not Allowed', 405);
    }

    const params = event.queryStringParameters || {};
    const episodeParam = params.episode;
    const limitParam = params.limit
      ? parseInt(params.limit as string, 10)
      : undefined;

    let query = supabase.from('weekly_cards').select('*');
    if (episodeParam) {
      const digits = episodeParam.match(/\d+/)?.[0] || '';
      if (digits) {
        query = query.ilike('episode', `%${digits}%`);
      } else {
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

    return createSuccessResponse({ records } as { records: WeeklyCard[] });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
