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
import { mapWritingTemplate, mapWritingTopic } from '../utils/writing';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  const user = await getAuthenticatedUser(event);
  if (!user) return createErrorResponse('未授权', 401);
  if (user.role !== 'organizer')
    return createErrorResponse('需要管理员权限', 403);
  const action = getFunctionNameFromEvent(event);
  const input = getDataFromEvent(event);

  if (action === 'dashboard') {
    const [
      posts,
      publicPosts,
      writers,
      resonances,
      comments,
      topicLinks,
      topics,
      templates,
      groups,
      members,
      pairs,
    ] = await Promise.all([
      supabase
        .from('writing_posts')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('writing_posts')
        .select('id', { count: 'exact', head: true })
        .eq('visibility', 'public')
        .eq('status', 'published'),
      supabase.from('writing_posts').select('user_id'),
      supabase
        .from('writing_resonances')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('writing_comments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabase.from('writing_post_topics').select('topic_id'),
      supabase
        .from('writing_topics')
        .select('id, name, slug, description, sort_order, is_user_created')
        .order('sort_order'),
      supabase
        .from('writing_templates')
        .select('id, name, slug, description, prompts, version, sort_order')
        .order('sort_order'),
      supabase
        .from('writing_groups')
        .select('id, name, description, is_active, created_at')
        .order('created_at'),
      supabase
        .from('writing_group_members')
        .select(
          'id, group_id, user_id, status, applied_at, user:users!writing_group_members_user_id_fkey(id, name, username)'
        )
        .order('applied_at', { ascending: false }),
      supabase
        .from('writing_partner_pairs')
        .select(
          'id, group_id, user_a_id, user_b_id, assignment_type, is_active, created_at'
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);
    if (
      topics.error ||
      templates.error ||
      groups.error ||
      members.error ||
      pairs.error
    )
      return createErrorResponse('获取后台数据失败', 500);
    const counts = new Map<string, number>();
    (topicLinks.data || []).forEach((row) =>
      counts.set(
        String(row.topic_id),
        (counts.get(String(row.topic_id)) || 0) + 1
      )
    );
    const mappedTopics = (topics.data || []).map(mapWritingTopic);
    return createSuccessResponse({
      stats: {
        total_posts: posts.count || 0,
        public_posts: publicPosts.count || 0,
        active_writers: new Set(
          (writers.data || []).map((row) => String(row.user_id))
        ).size,
        total_resonances: resonances.count || 0,
        total_comments: comments.count || 0,
        popular_topics: mappedTopics
          .map((topic) => ({ ...topic, post_count: counts.get(topic.id) || 0 }))
          .sort((a, b) => b.post_count - a.post_count)
          .slice(0, 10),
      },
      topics: mappedTopics,
      templates: (templates.data || []).map(mapWritingTemplate),
      groups: (groups.data || []).map((group) => ({
        ...group,
        id: String(group.id),
      })),
      members: (members.data || []).map((member: any) => ({
        ...member,
        id: String(member.id),
        group_id: String(member.group_id),
        user_id: String(member.user_id),
        user: Array.isArray(member.user) ? member.user[0] : member.user,
      })),
      pairs: (pairs.data || []).map((pair) => ({
        ...pair,
        id: String(pair.id),
        group_id: String(pair.group_id),
        user_a_id: String(pair.user_a_id),
        user_b_id: String(pair.user_b_id),
      })),
    });
  }

  if (action === 'saveGroup') {
    const name = String(input.name || '').trim();
    if (!name || name.length > 60)
      return createErrorResponse('讨论组名称需为 1-60 个字');
    const payload = {
      name,
      description: String(input.description || '').trim() || null,
      is_active: input.is_active !== false,
      updated_at: new Date().toISOString(),
    };
    const query = input.id
      ? supabase.from('writing_groups').update(payload).eq('id', input.id)
      : supabase.from('writing_groups').insert({
          ...payload,
          created_by: Number(user.id),
        });
    const { data, error } = await query
      .select('id, name, description, is_active')
      .single();
    if (error || !data) return createErrorResponse('保存讨论组失败', 400);
    if (!input.id) {
      await supabase.from('writing_group_members').insert({
        group_id: data.id,
        user_id: Number(user.id),
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: Number(user.id),
      });
    }
    return createSuccessResponse({ group: { ...data, id: String(data.id) } });
  }

  if (action === 'reviewMembership') {
    const status =
      input.status === 'approved'
        ? 'approved'
        : input.status === 'rejected'
          ? 'rejected'
          : '';
    if (!/^\d+$/.test(String(input.id || '')) || !status)
      return createErrorResponse('审核参数无效');
    const { error } = await supabase
      .from('writing_group_members')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: Number(user.id),
      })
      .eq('id', input.id);
    if (error) return createErrorResponse('审核申请失败', 500);
    return createSuccessResponse({ message: '审核完成' });
  }

  if (action === 'assignPartner') {
    const groupId = String(input.group_id || '');
    const userAId = String(input.user_a_id || '');
    const userBId = String(input.user_b_id || '');
    if (
      !/^\d+$/.test(groupId) ||
      !/^\d+$/.test(userAId) ||
      !/^\d+$/.test(userBId) ||
      userAId === userBId
    )
      return createErrorResponse('搭子分配参数无效');
    const { data: approved } = await supabase
      .from('writing_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'approved')
      .in('user_id', [userAId, userBId]);
    if ((approved || []).length !== 2)
      return createErrorResponse('只能为同一讨论组的正式成员分配搭子');
    await supabase
      .from('writing_partner_pairs')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('is_active', true)
      .or(
        `user_a_id.in.(${userAId},${userBId}),user_b_id.in.(${userAId},${userBId})`
      );
    const { error } = await supabase.from('writing_partner_pairs').insert({
      group_id: Number(groupId),
      user_a_id: Number(userAId),
      user_b_id: Number(userBId),
      assigned_by: Number(user.id),
      assignment_type: 'manual',
    });
    if (error) return createErrorResponse('分配书写搭子失败', 500);
    return createSuccessResponse({ message: '书写搭子已分配' });
  }

  if (action === 'randomAssignPartners') {
    const groupId = String(input.group_id || '');
    if (!/^\d+$/.test(groupId)) return createErrorResponse('讨论组无效');
    const { data: approved, error: memberError } = await supabase
      .from('writing_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'approved');
    if (memberError) return createErrorResponse('获取讨论组成员失败', 500);
    const ids = (approved || []).map((row) => Number(row.user_id));
    if (ids.length < 2) return createErrorResponse('至少需要 2 名正式成员');
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    }
    await supabase
      .from('writing_partner_pairs')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('is_active', true);
    const rows = [];
    for (let index = 0; index + 1 < ids.length; index += 2) {
      rows.push({
        group_id: Number(groupId),
        user_a_id: ids[index],
        user_b_id: ids[index + 1],
        assigned_by: Number(user.id),
        assignment_type: 'random',
      });
    }
    const { error } = await supabase.from('writing_partner_pairs').insert(rows);
    if (error) return createErrorResponse('随机分配书写搭子失败', 500);
    return createSuccessResponse({
      message: `已生成 ${rows.length} 组书写搭子`,
      unpaired_user_id: ids.length % 2 ? String(ids[ids.length - 1]) : null,
    });
  }

  if (action === 'saveTopic') {
    const name = String(input.name || '').trim();
    if (!name || name.length > 40)
      return createErrorResponse('话题名称需为 1-40 个字');
    const payload = {
      name,
      slug: slugify(String(input.slug || name)) || `topic-${Date.now()}`,
      description: String(input.description || '').trim() || null,
      sort_order: Number(input.sort_order) || 0,
      is_active: true,
    };
    const query = input.id
      ? supabase.from('writing_topics').update(payload).eq('id', input.id)
      : supabase.from('writing_topics').insert(payload);
    const { data, error } = await query
      .select('id, name, slug, description, sort_order, is_user_created')
      .single();
    if (error || !data)
      return createErrorResponse('保存话题失败，请检查名称或标识是否重复', 400);
    return createSuccessResponse(
      { topic: mapWritingTopic(data) },
      input.id ? 200 : 201
    );
  }

  if (action === 'saveTemplate') {
    const name = String(input.name || '').trim();
    const prompts = Array.isArray(input.prompts)
      ? input.prompts
          .map((item: any, index: number) => ({
            key: String(item.key || `item-${index + 1}`).trim(),
            prompt: String(item.prompt || '').trim(),
            placeholder: String(item.placeholder || '').trim(),
            required: Boolean(item.required),
          }))
          .filter((item: any) => item.prompt)
      : [];
    if (!name || name.length > 60)
      return createErrorResponse('模板名称需为 1-60 个字');
    if (!prompts.length || prompts.length > 10)
      return createErrorResponse('模板需包含 1-10 个问题');
    const payload: any = {
      name,
      slug: slugify(String(input.slug || name)) || `template-${Date.now()}`,
      description: String(input.description || '').trim() || null,
      prompts,
      sort_order: Number(input.sort_order) || 0,
      is_active: true,
    };
    if (input.id) payload.version = (Number(input.version) || 1) + 1;
    const query = input.id
      ? supabase.from('writing_templates').update(payload).eq('id', input.id)
      : supabase.from('writing_templates').insert(payload);
    const { data, error } = await query
      .select('id, name, slug, description, prompts, version, sort_order')
      .single();
    if (error || !data)
      return createErrorResponse('保存模板失败，请检查名称或标识是否重复', 400);
    return createSuccessResponse(
      { template: mapWritingTemplate(data) },
      input.id ? 200 : 201
    );
  }
  return createErrorResponse('无效的操作类型');
}
