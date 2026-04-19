import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export interface User {
  id: number;
  email: string;
  name: string;
  role?: string | null;
}


export async function handler(
  event: NetlifyEvent,
  _context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    const functionName = getFunctionNameFromEvent(event);
    switch (functionName) {
      case 'register':
        return await handleRegister(event);
      case 'getProfile':
        return await handleGetProfile(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// Creates the users table profile after Supabase Auth signup
async function handleRegister(event: NetlifyEvent): Promise<NetlifyResponse> {
  const { email, name } = getDataFromEvent(event);

  if (!email || !name?.trim()) {
    return createErrorResponse('姓名和邮箱为必填项');
  }

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    // Profile already exists, return it
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single();
    return createSuccessResponse({ user });
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ email, name: name.trim() })
    .select('id, email, name, role')
    .single();

  if (error || !newUser) {
    console.error('Insert user error:', error);
    return createErrorResponse('注册失败，请稍后重试', 500);
  }



  return createSuccessResponse({ user: newUser }, 201);
}

// Fetch user profile by email (called after Supabase Auth login)
async function handleGetProfile(event: NetlifyEvent): Promise<NetlifyResponse> {
  const { email } = getDataFromEvent(event);
  if (!email) return createErrorResponse('缺少邮箱');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('email', email)
    .single();

  if (error || !user) return createErrorResponse('用户不存在', 404);

  return createSuccessResponse({ user });
}
