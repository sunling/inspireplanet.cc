import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
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
    const action = getFunctionNameFromEvent(event);
    if (action !== 'register' && action !== 'getProfile')
      return createErrorResponse('无效的操作类型');
    const authorization =
      event.headers?.authorization || event.headers?.Authorization;
    const match =
      typeof authorization === 'string' &&
      /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) return createErrorResponse('未授权，请重新登录', 401);
    let identity;
    try {
      const { data, error } = await supabase.auth.getUser(match[1]);
      if (
        error ||
        !data.user?.id ||
        !data.user.email ||
        !data.user.email_confirmed_at
      )
        return createErrorResponse('未授权，请重新登录', 401);
      identity = data.user;
    } catch {
      return createErrorResponse('未授权，请重新登录', 401);
    }
    // The legacy users IDs are not auth UUIDs. Resolve only by the email
    // returned by Supabase's verified identity, never by request data.
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', identity.email!)
      .maybeSingle();
    if (error) return createErrorResponse('读取用户资料失败，请稍后重试', 500);
    if (user) return createSuccessResponse({ user });
    // Metadata is user-editable: allow only a display name, never roles/IDs.
    const metadata = identity.user_metadata || {};
    const name = [metadata.name, metadata.full_name].find(
      (value) => typeof value === 'string' && value.trim()
    );
    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({
        email: identity.email!,
        name:
          typeof name === 'string'
            ? name.trim()
            : identity.email!.split('@')[0],
      })
      .select('id, email, name, role')
      .single();
    // Concurrent callback/background sync can race on the unique email key.
    // Never upsert: that could overwrite an existing profile or its role.
    if (insertError?.code === '23505') {
      const { data: existing, error: retryError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('email', identity.email!)
        .maybeSingle();
      if (!retryError && existing)
        return createSuccessResponse({ user: existing });
    }
    if (insertError || !created)
      return createErrorResponse('创建用户资料失败，请稍后重试', 500);
    return createSuccessResponse(
      { user: created },
      action === 'register' ? 201 : 200
    );
  } catch {
    return createErrorResponse('服务器内部错误', 500);
  }
}
