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
import {
  mapWritingPost,
  readWritingPosts,
  WRITING_REVIEW_UPGRADE_MESSAGE,
} from '../utils/writing';
import { reviewWeekRange, writingWeek } from '../../utils/writingReview';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('请先登录', 401);
    const input = getDataFromEvent(event);
    const action = getFunctionNameFromEvent(event);
    if (action === 'weekly' && event.httpMethod === 'GET') {
      const week = String(input.week || writingWeek());
      let range;
      try {
        range = reviewWeekRange(week);
      } catch (error) {
        return createErrorResponse((error as Error).message);
      }
      if (week > writingWeek())
        return createErrorResponse('还不能回看未来的书写');
      const page = Number(input.page || 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
        return createErrorResponse('页码无效');
      const { data, error, count } = await readWritingPosts((columns) =>
        supabase
          .from('writing_posts')
          .select(columns, { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'published')
          .gte('created_at', range.start)
          .lt('created_at', range.end)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(page - 1, page - 1)
      );
      if (error) return createErrorResponse('获取本周书写失败', 500);
      const row = data?.[0];
      let note = null;
      let noteError: string | null = null;
      if (row) {
        const result = await supabase
          .from('writing_review_notes')
          .select('post_id, discovery, updated_at')
          .eq('user_id', user.id)
          .eq('post_id', row.id)
          .maybeSingle();
        if (result.error)
          noteError = ['42P01', 'PGRST205'].includes(result.error.code)
            ? WRITING_REVIEW_UPGRADE_MESSAGE
            : '暂时无法读取已保存的感想，请重试。';
        note = result.data
          ? { ...result.data, post_id: String(result.data.post_id) }
          : null;
      }
      return createSuccessResponse({
        week,
        last_day: range.lastDay,
        post: row ? mapWritingPost(row, user.id) : null,
        note,
        note_error: noteError,
        total: count || 0,
        page,
      });
    }
    if (
      (action === 'save' && event.httpMethod === 'POST') ||
      (action === 'delete' && event.httpMethod === 'DELETE')
    ) {
      const postId = String(input.post_id || '');
      if (!/^\d+$/.test(postId)) return createErrorResponse('书写 ID 无效');
      // The function uses a service role: ownership must be checked for every operation.
      const { data: post, error: postError } = await supabase
        .from('writing_posts')
        .select('id')
        .eq('id', postId)
        .eq('user_id', user.id)
        .eq('status', 'published')
        .maybeSingle();
      if (postError) return createErrorResponse('验证书写失败', 500);
      if (!post) return createErrorResponse('书写不存在或无权回看', 404);
      if (action === 'delete') {
        const { error } = await supabase
          .from('writing_review_notes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        return error
          ? createErrorResponse(
              ['42P01', 'PGRST205'].includes(error.code)
                ? WRITING_REVIEW_UPGRADE_MESSAGE
                : '删除发现失败',
              ['42P01', 'PGRST205'].includes(error.code) ? 503 : 500
            )
          : createSuccessResponse({ post_id: postId });
      }
      if (
        typeof input.discovery !== 'string' ||
        !input.discovery.trim() ||
        input.discovery.trim().length > 4000
      ) {
        return createErrorResponse('请写下 1 至 4000 字的新发现');
      }
      const { data, error } = await supabase
        .from('writing_review_notes')
        .upsert(
          {
            user_id: user.id,
            post_id: postId,
            discovery: input.discovery.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,post_id' }
        )
        .select('post_id, discovery, updated_at')
        .single();
      return error
        ? createErrorResponse(
            ['42P01', 'PGRST205'].includes(error.code)
              ? WRITING_REVIEW_UPGRADE_MESSAGE
              : '保存发现失败，请重试',
            ['42P01', 'PGRST205'].includes(error.code) ? 503 : 500
          )
        : createSuccessResponse({
            note: { ...data, post_id: String(data.post_id) },
          });
    }
    return createErrorResponse('无效的操作或请求方法', 400);
  } catch {
    console.error('[writingReviews] request failed');
    return createErrorResponse('回看暂时不可用，请稍后重试', 500);
  }
}
