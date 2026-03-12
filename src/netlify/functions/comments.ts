import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import { sanitizeInput } from '../../utils/text';
import { Comment } from '../types';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
  getFuntionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export interface CommentResponse {
  id: string;
  name: string;
  comment: string;
  created: string;
}

export interface CommentRequest {
  card_id: string;
  name?: string;
  comment?: string;
  user_id?: string;
}

export interface CommentsResponse {
  success: boolean;
  comments?: CommentResponse[];
  message?: string;
  id?: string;
  error?: string;
  details?: string;
}

export interface CommentAction {
  functionName: 'create' | 'getAll' | 'getByCardId';
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
      case 'create':
        return await handleCreate(event);
      case 'getByCardId':
        return await handleGetByCardId(event);
      case 'getAll':
        return await handleGetAll(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Comments handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const commentData = getDataFromEvent(event);

    if (!commentData.card_id) {
      return createErrorResponse('缺少card_id字段');
    }

    const uid = getUserIdFromAuth(event);
    if (!uid) {
      return createErrorResponse('未授权', 401);
    }

    const sanitizedComment = sanitizeInput(commentData.comment || '', 500);
    if (!sanitizedComment) {
      return createErrorResponse('评论不能为空');
    }

    let displayName = '';
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('name, username')
        .eq('id', isNaN(Number(uid)) ? uid : Number(uid))
        .single();
      displayName = sanitizeInput(
        userRow?.name || (userRow?.username ? `@${userRow.username}` : ''),
        100
      );
    } catch {}

    const record: Record<string, any> = {
      card_id: commentData.card_id,
      name: displayName || '匿名用户',
      comment: sanitizedComment,
      created: new Date().toISOString(),
    };
    if (uid) record.user_id = uid;

    const { data, error } = await supabase
      .from('comments')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting comment:', error);
      return createErrorResponse('提交评论失败', 500);
    }

    try {
      const { data: cardRow } = await supabase
        .from('cards')
        .select('id, title, username, creator')
        .eq('id', commentData.card_id)
        .single();
      let ownerId: string | number | null = null;
      const ownerUsername = cardRow?.username || null;
      const ownerCreator = cardRow?.creator || null;
      if (ownerUsername) {
        const { data: ownerUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', ownerUsername)
          .single();
        ownerId = ownerUser?.id || null;
      }
      if (!ownerId && ownerCreator) {
        const { data: ownerByName } = await supabase
          .from('users')
          .select('id')
          .or(`username.eq.${ownerCreator},name.eq.${ownerCreator}`)
          .limit(1)
          .single();
        ownerId = ownerByName?.id || null;
      }
      if (ownerId && (!uid || String(ownerId) !== String(uid))) {
        const title = '卡片收到新评论';
        const snippet =
          sanitizedComment.length > 80
            ? `${sanitizedComment.slice(0, 80)}...`
            : sanitizedComment;
        const content = `${displayName} 评论了你的卡片《${cardRow?.title || ''}》：${snippet}`;
        const path = `/card-detail?id=${commentData.card_id}`;
        await createNotification(ownerId, title, content, path);
      }
    } catch (e) {
      console.error('[comments] createNotification failed:', e);
    }

    return createSuccessResponse({
      message: '评论提交成功',
      id: data[0].id,
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetByCardId(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { cardId } = requestData;

    if (!cardId) {
      return createErrorResponse('缺少card  d参数');
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('card_id', cardId)
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return createErrorResponse('数据库查询错误', 500);
    }

    return createSuccessResponse({
      comments: data.map((row) => ({
        id: row.id,
        name: row.name || '',
        comment: row.comment || '',
        created: row.created,
      })),
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { card_id } = requestData;

    if (!card_id) {
      return createErrorResponse('缺少card_id参数');
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('card_id', card_id)
      .order('created', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return createErrorResponse('数据库查询错误', 500);
    }

    return createSuccessResponse({
      comments: data.map((row) => ({
        id: row.id,
        name: row.name || '',
        comment: row.comment || '',
        created: row.created,
      })),
    });
  } catch (error) {
    console.error('Get all comments error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function createNotification(
  userId: string | number,
  title: string,
  content: string,
  path: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert([
      {
        user_id: userId,
        title,
        content,
        path,
        created: new Date().toISOString(),
        read: false,
      },
    ]);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
