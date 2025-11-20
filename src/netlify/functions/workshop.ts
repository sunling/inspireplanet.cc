// src/netlify/functions/workshopHandler.ts
import { supabase } from '../../database/supabase';
import { getCommonHttpHeader } from '../../utils/http';
import { NetlifyContext, NetlifyEvent } from '../types/http';

// 定义接口
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

  // Only allow POST requests for registrations
  if (event.httpMethod === 'POST') {
    return await saveRegistration(event, headers);
  } else {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method Not Allowed',
        success: false,
      } as WorkshopResponse),
    };
  }
}

async function saveRegistration(
  event: NetlifyEvent,
  headers: Record<string, string>
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    // 检查请求体是否存在
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Request body is required',
          success: false,
        } as WorkshopResponse),
      };
    }

    // Parse the request body
    const registrationData: WorkshopRegistration = JSON.parse(event.body);

    // Validate required fields
    if (!registrationData.name || !registrationData.wechat) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          success: false,
        } as WorkshopResponse),
      };
    }

    // 清理输入数据
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

    // Prepare the record for Supabase
    const record: Omit<WorkshopRecord, 'id'> = {
      ...sanitizedData,
      created_at: new Date().toISOString(),
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('workshop')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting registration:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to submit registration',
          details: error.message,
          success: false,
        } as WorkshopResponse),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Registration submitted successfully',
        success: true,
        id: data?.[0]?.id,
      } as WorkshopResponse),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
        success: false,
      } as WorkshopResponse),
    };
  }
}
