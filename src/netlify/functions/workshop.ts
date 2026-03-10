import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
} from '../utils/server';

export interface WorkshopRegistration {
  name: string;
  wechat: string;
  why?: string;
  expectation?: string;
  paid?: string | boolean;
}

export interface WorkshopRecord extends WorkshopRegistration {
  id?: string;
  created_at: string;
}

export interface WorkshopResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: string;
  id?: string;
  registrations?: WorkshopRecord[];
}

export interface WorkshopAction {
  action: 'create' | 'getAll';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as WorkshopAction;

    switch (action) {
      case 'create':
        return await handleCreate(event);
      case 'getAll':
        return await handleGetAll(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Workshop handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    if (!event.body) {
      return createErrorResponse('请求体为空');
    }

    const registrationData: WorkshopRegistration = JSON.parse(event.body);

    if (!registrationData.name || !registrationData.wechat) {
      return createErrorResponse('缺少必填字段');
    }

    const sanitizedData = {
      name: registrationData.name.trim(),
      wechat: registrationData.wechat.trim(),
      why: registrationData.why?.trim() || '',
      expectation: registrationData.expectation?.trim() || '',
      paid:
        typeof registrationData.paid === 'string'
          ? registrationData.paid === 'true'
          : Boolean(registrationData.paid),
    };

    const record: Omit<WorkshopRecord, 'id'> = {
      ...sanitizedData,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('workshop')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting registration:', error);
      return createErrorResponse('提交注册失败', 500);
    }

    return createSuccessResponse({
      message: '注册提交成功',
      id: data?.[0]?.id,
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const { data, error } = await supabase
      .from('workshop')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return createErrorResponse('获取注册列表失败', 500);
    }

    return createSuccessResponse({ registrations: data || [] });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
