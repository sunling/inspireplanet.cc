import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
} from '../utils/server';

export interface UserAction {
  action: 'get' | 'getAll' | 'search';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const { action } = JSON.parse(event.body || '{}') as UserAction;

    switch (action) {
      case 'get':
        return await handleGet(event);
      case 'getAll':
        return await handleGetAll(event);
      case 'search':
        return await handleSearch(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Users handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  const body = event.body ? JSON.parse(event.body) : {};
  const { id } = body;

  if (!id) {
    return createErrorResponse('缺少用户ID');
  }

  const parsedId = isNaN(Number(id)) ? id : Number(id);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, username')
    .eq('id', parsedId)
    .limit(1);

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  if (!users || users.length === 0) {
    return createErrorResponse('用户不存在', 404);
  }

  const userIds = users.map((u: any) => u.id);
  let profilesByUserId: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select(
        'user_id, bio, interests, expertise, availability_text, wechat_id, city, offerings, seeking'
      )
      .in('user_id', userIds as any);
    (profiles || []).forEach((p: any) => {
      profilesByUserId[String(p.user_id)] = p;
    });
  }

  const merged = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    profile: profilesByUserId[String(u.id)] || null,
  }));

  return createSuccessResponse({ user: merged[0] });
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  const body = event.body ? JSON.parse(event.body) : {};
  const { ids = '', limit = '50', offset = '0' } = body;

  let filteredUserIds: Array<number | string> | null = null;
  if (ids) {
    const list = String(ids)
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => (isNaN(Number(x)) ? x : Number(x)));
    if (list.length > 0) filteredUserIds = list;
  }

  let query = supabase.from('users').select('id, name, username');
  if (filteredUserIds) {
    query = query.in('id', filteredUserIds as any);
  }

  const { data: users, error } = await query
    .order('name', { ascending: true })
    .range(
      parseInt(offset, 10),
      parseInt(offset, 10) + parseInt(limit, 10) - 1
    );

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  const userIds = (users || []).map((u: any) => u.id);
  let profilesByUserId: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select(
        'user_id, bio, interests, expertise, availability_text, wechat_id, city, offerings, seeking'
      )
      .in('user_id', userIds as any);
    (profiles || []).forEach((p: any) => {
      profilesByUserId[String(p.user_id)] = p;
    });
  }

  const merged = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    profile: profilesByUserId[String(u.id)] || null,
  }));

  return createSuccessResponse({ users: merged });
}

async function handleSearch(event: NetlifyEvent): Promise<NetlifyResponse> {
  const body = event.body ? JSON.parse(event.body) : {};
  const {
    q = '',
    limit = '50',
    offset = '0',
    offering = '',
    seeking = '',
    interest = '',
    expertise = '',
    theme = '',
    city = '',
    id = '',
    ids = '',
  } = body;

  let filteredUserIds: Array<number | string> | null = null;
  if (ids) {
    const list = String(ids)
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => (isNaN(Number(x)) ? x : Number(x)));
    if (list.length > 0) filteredUserIds = list;
  } else if (id) {
    const parsedId = isNaN(Number(id)) ? id : Number(id);
    filteredUserIds = [parsedId];
  }

  if (offering || seeking || interest || expertise || theme || city) {
    let profileQuery = supabase.from('user_profiles').select('user_id');
    if (offering)
      profileQuery = profileQuery.contains('offerings', [String(offering)]);
    if (seeking)
      profileQuery = profileQuery.contains('seeking', [String(seeking)]);
    if (interest)
      profileQuery = profileQuery.contains('interests', [String(interest)]);
    if (expertise)
      profileQuery = profileQuery.contains('expertise', [String(expertise)]);
    if (city) profileQuery = profileQuery.eq('city', String(city));
    let profilesIds: Array<number | string> = [];
    const { data: profiles, error: pErr } = await profileQuery;
    if (pErr) {
      return createErrorResponse(pErr.message, 500);
    }
    profilesIds = (profiles || []).map((p: any) => p.user_id);
    if (theme) {
      const [pi, pe] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('user_id')
          .contains('interests', [String(theme)]),
        supabase
          .from('user_profiles')
          .select('user_id')
          .contains('expertise', [String(theme)]),
      ]);
      const idsOr = [
        ...(pi.data || []).map((p: any) => p.user_id),
        ...(pe.data || []).map((p: any) => p.user_id),
      ];
      const set = new Set<string | number>([...profilesIds, ...idsOr]);
      filteredUserIds = Array.from(set);
    } else {
      filteredUserIds = profilesIds;
    }
    if (filteredUserIds.length === 0) {
      return createSuccessResponse({ users: [] });
    }
  }

  let query = supabase.from('users').select('id, name, username');
  if (q) {
    const qLower = String(q).toLowerCase();
    query = query.or(`name.ilike.%${qLower}%,username.ilike.%${qLower}%`);
  }
  if (filteredUserIds) {
    query = query.in('id', filteredUserIds as any);
  }

  const { data: users, error } = await query
    .order('name', { ascending: true })
    .range(
      parseInt(offset, 10),
      parseInt(offset, 10) + parseInt(limit, 10) - 1
    );

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  const userIds = (users || []).map((u: any) => u.id);
  let profilesByUserId: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select(
        'user_id, bio, interests, expertise, availability_text, wechat_id, city, offerings, seeking'
      )
      .in('user_id', userIds as any);
    (profiles || []).forEach((p: any) => {
      profilesByUserId[String(p.user_id)] = p;
    });
  }

  const merged = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    profile: profilesByUserId[String(u.id)] || null,
  }));

  return createSuccessResponse({ users: merged });
}
