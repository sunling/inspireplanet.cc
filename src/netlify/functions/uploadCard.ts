import { requireMutationUser } from '../utils/authorization';
import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';
import { searchImageByText } from '../utils/imageSearch';

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

export interface UploadCardAction {
  functionName: 'create';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
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
  const auth = await requireMutationUser(event, ['POST'], true);
  if (auth.error) return auth.error;
  try {
    const requestData = getDataFromEvent(event) as WeeklyCardRequest;
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

    let imagePath: string | null = null;
    // 图片搜索功能已关闭，直接存入空值使用纯色/渐变背景

    const { data, error } = await supabase
      .from('weekly_cards')
      .insert([
        {
          episode: record.episode,
          name: record.name,
          title: record.title,
          quote: record.quote,
          detail: record.detail,
          image_path: imagePath,
          created: new Date().toISOString(),
        },
      ])
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
