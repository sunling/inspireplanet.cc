import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  AuthenticatedUser,
  createErrorResponse,
  getAuthenticatedUser,
} from './server';

type AccessResult =
  | { user: AuthenticatedUser; error?: never }
  | { user?: never; error: NetlifyResponse };

export async function requireMutationUser(
  event: NetlifyEvent,
  methods: string[],
  organizerOnly = false
): Promise<AccessResult> {
  const user = await getAuthenticatedUser(event);
  if (!user) return { error: createErrorResponse('请先登录', 401) };
  if (organizerOnly && user.role !== 'organizer')
    return { error: createErrorResponse('需要管理员权限', 403) };
  if (!methods.includes(event.httpMethod))
    return { error: createErrorResponse('请求方式不支持', 405) };
  return { user };
}

export function canManage(user: AuthenticatedUser, ownerId: unknown): boolean {
  return (
    user.role === 'organizer' ||
    (ownerId !== null &&
      ownerId !== undefined &&
      String(ownerId) === String(user.id))
  );
}

// Linked resources must belong to the same verified manager before a mutation.
export async function checkManagedLink(
  user: AuthenticatedUser,
  table: 'meetups' | 'surveys',
  id: unknown
): Promise<NetlifyResponse | null> {
  const owner = table === 'meetups' ? 'user_id' : 'created_by';
  const { data, error } = await supabase
    .from(table)
    .select('id, ' + owner)
    .eq('id', id)
    .maybeSingle();
  if (error) return createErrorResponse('读取关联记录失败', 500);
  if (!data) return createErrorResponse('关联记录不存在', 404);
  if (!canManage(user, (data as any)[owner]))
    return createErrorResponse('没有权限管理关联记录', 403);
  return null;
}
