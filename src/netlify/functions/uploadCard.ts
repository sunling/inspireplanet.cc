import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getActionFromEvent,
} from '../utils/server';

export interface WeeklyCardRecord {
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  image_path?: string | null;
}

export interface WeeklyCardRequest {
  record: WeeklyCardRecord;
}

export interface WeeklyCardResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: string;
  id?: string;
}

export interface SearchImageResponse {
  query: string;
  images: Array<{
    url: string;
    title: string;
    description: string;
    thumb: string;
    credit: {
      name: string;
      username: string;
      link: string;
    };
  }>;
}

export interface UploadCardAction {
  action: 'create';
}

function getBaseUrl(): string {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.URL || 'http://localhost:8888';
    }

    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.URL || 'http://localhost:8888';
      }
    }

    return 'http://localhost:8888';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return 'http://localhost:8888';
  }
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
      case 'create':
        return await handleCreate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('UploadCard handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    if (!event.body) {
      return createErrorResponse('请求体为空');
    }

    const requestData: WeeklyCardRequest = JSON.parse(event.body);
    const record: WeeklyCardRecord = requestData.record;

    if (
      !record.episode ||
      !record.name ||
      !record.title ||
      !record.quote ||
      !record.detail
    ) {
      return createErrorResponse('缺少必填字段');
    }

    const searchResponse: Response = await fetch(
      `${getBaseUrl()}/.netlify/functions/searchImage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'search', text: record.detail }),
      }
    );

    let imagePath: string | null = null;

    if (searchResponse.ok) {
      const searchData: SearchImageResponse = await searchResponse.json();

      if (searchData.images && searchData.images.length > 0) {
        const randomIndex: number = Math.floor(
          Math.random() * searchData.images.length
        );
        imagePath = searchData.images[randomIndex].url;
      }
    } else {
      console.warn('Failed to fetch image, continuing without image');
    }

    const weeklyCardRecord = {
      episode: record.episode,
      name: record.name,
      title: record.title,
      quote: record.quote,
      detail: record.detail,
      image_path: imagePath,
      created: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('weekly_cards')
      .insert([weeklyCardRecord])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return createErrorResponse('提交周卡失败', 500);
    }

    return createSuccessResponse({ message: '周卡提交成功', id: data[0].id });
  } catch (error: any) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

function getMissingFields(record: WeeklyCardRecord): string[] {
  const requiredFields: string[] = [
    'episode',
    'name',
    'title',
    'quote',
    'detail',
  ];
  return requiredFields.filter(
    (field: string) => !record[field as keyof WeeklyCardRecord]
  );
}
