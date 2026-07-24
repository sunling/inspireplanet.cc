import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types';
import {
  createErrorResponse,
  createSuccessResponse,
  getAuthenticatedUser,
  getDataFromEvent,
  getFunctionNameFromEvent,
  handleOptionsRequest,
} from '../utils/server';

const mapUser = (row: any) => ({
  id: String(row?.id || ''),
  name: row?.name || row?.username || '匿名用户',
  username: row?.username || null,
});

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  const action = getFunctionNameFromEvent(event);
  const input = getDataFromEvent(event);
  const user = await getAuthenticatedUser(event);

  if (action === 'list') {
    const { data: groups, error } = await supabase
      .from('writing_groups')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('created_at');
    if (error) return createErrorResponse('获取讨论组失败', 500);

    const groupIds = (groups || []).map((group) => group.id);
    const [{ data: approved }, { data: memberships }] = await Promise.all([
      groupIds.length
        ? supabase
            .from('writing_group_members')
            .select('group_id')
            .in('group_id', groupIds)
            .eq('status', 'approved')
        : Promise.resolve({ data: [] as any[] }),
      user && groupIds.length
        ? supabase
            .from('writing_group_members')
            .select('group_id, status')
            .eq('user_id', user.id)
            .in('group_id', groupIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const counts = new Map<string, number>();
    (approved || []).forEach((row: any) => {
      const key = String(row.group_id);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const statuses = new Map(
      (memberships || []).map((row: any) => [String(row.group_id), row.status])
    );

    return createSuccessResponse({
      groups: (groups || []).map((group) => ({
        id: String(group.id),
        name: group.name,
        description: group.description,
        is_active: group.is_active,
        member_count: counts.get(String(group.id)) || 0,
        membership_status: statuses.get(String(group.id)) || null,
      })),
    });
  }

  if (!user) return createErrorResponse('请先登录', 401);

  if (action === 'apply') {
    const groupId = String(input.group_id || '');
    if (!/^\d+$/.test(groupId)) return createErrorResponse('讨论组无效');
    const { data: group } = await supabase
      .from('writing_groups')
      .select('id')
      .eq('id', groupId)
      .eq('is_active', true)
      .single();
    if (!group) return createErrorResponse('讨论组不存在', 404);

    const { data: existing } = await supabase
      .from('writing_group_members')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing?.status === 'approved')
      return createErrorResponse('你已经是讨论组成员');
    if (existing?.status === 'pending')
      return createErrorResponse('申请正在审核中');

    const payload = {
      group_id: Number(groupId),
      user_id: Number(user.id),
      status: 'pending',
      applied_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    };
    const query = existing
      ? supabase
          .from('writing_group_members')
          .update(payload)
          .eq('id', existing.id)
      : supabase.from('writing_group_members').insert(payload);
    const { error } = await query;
    if (error) return createErrorResponse('提交申请失败', 500);
    return createSuccessResponse({ message: '申请已提交，请等待审核' }, 201);
  }

  if (action === 'myPartners') {
    const { data: pairs, error } = await supabase
      .from('writing_partner_pairs')
      .select(
        'id, group_id, user_a_id, user_b_id, assignment_type, created_at, group:writing_groups(name)'
      )
      .eq('is_active', true)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);
    if (error) return createErrorResponse('获取书写搭子失败', 500);

    const partnerIds = Array.from(
      new Set(
        (pairs || []).map((pair: any) =>
          String(pair.user_a_id) === user.id
            ? String(pair.user_b_id)
            : String(pair.user_a_id)
        )
      )
    );
    const { data: users } = partnerIds.length
      ? await supabase
          .from('users')
          .select('id, name, username')
          .in('id', partnerIds)
      : { data: [] as any[] };
    const userMap = new Map(
      (users || []).map((row: any) => [String(row.id), row])
    );

    return createSuccessResponse({
      partners: (pairs || []).map((pair: any) => {
        const partnerId =
          String(pair.user_a_id) === user.id
            ? String(pair.user_b_id)
            : String(pair.user_a_id);
        const group = Array.isArray(pair.group) ? pair.group[0] : pair.group;
        return {
          pairing_id: String(pair.id),
          group_id: String(pair.group_id),
          group_name: group?.name || '讨论组',
          user: mapUser(userMap.get(partnerId)),
          assignment_type: pair.assignment_type,
          created_at: pair.created_at,
        };
      }),
    });
  }

  return createErrorResponse('无效的操作类型');
}
