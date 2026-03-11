import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import { CardItem } from '../types';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
  getActionFromEvent,
} from '../utils/server';

// 内存缓存
interface Cache {
  allCards: CardItem[] | null;
  cardsByIds: Record<string, CardItem[]>;
}

const cache: Cache = {
  allCards: null,
  cardsByIds: {},
};

// 定义CardAction接口
export interface CardAction {
  action: 'create' | 'update' | 'delete' | 'like' | 'get' | 'getAll';
}

/**
 * Netlify函数处理器
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const action = getActionFromEvent(event);

    switch (action) {
      case 'create':
        cache.allCards = null;
        cache.cardsByIds = {};
        return await handleCreate(event);
      case 'update':
        cache.allCards = null;
        cache.cardsByIds = {};
        return await handleUpdate(event);
      case 'delete':
        cache.allCards = null;
        cache.cardsByIds = {};
        return await handleDelete(event);
      case 'like':
        cache.allCards = null;
        cache.cardsByIds = {};
        return await handleLike(event);
      case 'get':
        return await handleGet(event);
      case 'getAll':
        return await handleGetAll(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Cards handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const cardData: CardItem = JSON.parse(event.body || '{}');

    if (!cardData.title || !cardData.quote || !cardData.detail) {
      return createErrorResponse('缺少必填字段');
    }

    const record = {
      font: cardData.font || '',
      title: cardData.title,
      quote: cardData.quote,
      image_path: cardData.image_path || '',
      detail: cardData.detail,
      upload: cardData.upload || '',
      creator: cardData.creator || '',
      created: new Date().toISOString(),
      gradient_class: cardData.gradient_class || '',
      username: cardData.username || null,
      likes_count: 0,
      user_id: cardData.user_id || null,
      update_time: new Date().toDateString(),
    };

    const { data, error } = await supabase
      .from('cards')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting card:', error);
      return createErrorResponse('提交卡片失败', 500);
    }

    return createSuccessResponse({
      message: '卡片提交成功',
      id: data?.[0]?.id,
    });
  } catch (error: any) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGet(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const params = event.queryStringParameters || {};
    const idParam = params.id;
    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id;
    const pageParam = params.page ? parseInt(params.page, 10) : null;
    const limitParam = params.limit ? parseInt(params.limit, 10) : null;
    const isPaginated = pageParam !== null && limitParam !== null;

    if (!id) {
      return createErrorResponse('缺少卡片ID');
    }

    const cacheKey = String(id);
    if (cache.cardsByIds[cacheKey]) {
      return createSuccessResponse({ records: cache.cardsByIds[cacheKey] });
    }

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .limit(25);

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    const records = (data || []).map((row) => row);
    cache.cardsByIds[cacheKey] = records;

    return createSuccessResponse({ records });
  } catch (error: any) {
    console.error('Get card error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = body.userId;

    // 检查查询参数中是否有id
    const params = event.queryStringParameters || {};
    const idParam = params.id;
    const pageParam = params.page ? parseInt(params.page, 10) : null;
    const limitParam = params.limit ? parseInt(params.limit, 10) : null;
    const isPaginated = pageParam !== null && limitParam !== null;

    if (cache.allCards) {
      return createSuccessResponse({ records: cache.allCards });
    }

    if (idParam) {
      // 检查是否是逗号分隔的ID列表
      if (idParam.includes(',')) {
        const ids = idParam
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id);
        const cacheKey = ids.sort().join(',');

        if (cache.cardsByIds[cacheKey]) {
          return {
            statusCode: 200,
            body: JSON.stringify({ records: cache.cardsByIds[cacheKey] }),
          };
        }
      } else {
        // 单个ID
        if (cache.cardsByIds[idParam]) {
          console.log('Cache hit for ID:', idParam);
          return {
            statusCode: 200,
            body: JSON.stringify({ records: cache.cardsByIds[idParam] }),
          };
        }
      }
    } else if (!isPaginated && cache.allCards) {
      // 返回缓存中的所有卡片（无分页时）
      console.log('Cache hit for all cards');
      return {
        statusCode: 200,
        body: JSON.stringify({ records: cache.allCards }),
      };
    }

    let query = supabase.from('cards').select('*', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query.order('created', { ascending: false }).limit(25);
    // 如果存在id参数，按id过滤
    if (idParam) {
      // 检查是否是逗号分隔的ID列表
      if (idParam.includes(',')) {
        const ids = idParam
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id);
        query = query.in('id', ids);
      } else {
        // 单个ID
        query = query.eq('id', idParam);
      }
    }

    // 应用排序和分页
    if (isPaginated && !idParam) {
      const page = Math.max(1, pageParam!);
      const limit = Math.min(50, Math.max(1, limitParam!));
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.order('created', { ascending: false }).range(from, to);
    } else {
      query = query.order('created', { ascending: false }).limit(25);
    }

    const { data, error, count } = await query;

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    const records = (data || []).map((row) => row);
    cache.allCards = records;

    // 更新缓存（无分页时才缓存）
    if (idParam) {
      if (idParam.includes(',')) {
        const ids = idParam
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id);
        const cacheKey = ids.sort().join(',');
        cache.cardsByIds[cacheKey] = records;
      } else {
        cache.cardsByIds[idParam] = records;
      }
    } else if (!isPaginated) {
      cache.allCards = records;
    }

    return createSuccessResponse({ records, total: count ?? records.length });
  } catch (error: any) {
    console.error('Get all cards error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const cardData: CardItem = JSON.parse(event.body || '{}');

    if (
      !cardData.id ||
      !cardData.title ||
      !cardData.quote ||
      !cardData.detail
    ) {
      return createErrorResponse('缺少必填字段: id, title, quote, detail');
    }

    const { data: existingCard, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardData.id)
      .single();

    if (fetchError || !existingCard) {
      return createErrorResponse('卡片不存在', 404);
    }

    if (cardData.user_id !== existingCard.user_id) {
      return createErrorResponse('没有权限修改此卡片', 403);
    }

    const updateData = {
      title: cardData.title,
      quote: cardData.quote,
      detail: cardData.detail,
      creator: cardData.creator || existingCard.creator,
      font: cardData.font || existingCard.font,
      gradient_class: cardData.gradient_class || existingCard.gradient_class,
      image_path: cardData.image_path || existingCard.image_path,
      upload: cardData.upload || existingCard.upload,
      username: cardData.username || existingCard.username,
      update_time: new Date().toDateString(),
    };

    const { data, error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardData.id)
      .select();

    if (error) {
      return createErrorResponse('更新卡片失败', 500);
    }

    return createSuccessResponse({
      message: '卡片更新成功',
      detail: data,
    });
  } catch (error: any) {
    console.error('Update card error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleDelete(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, user_id } = body;

    if (!id) {
      return createErrorResponse('缺少卡片ID');
    }

    const { data: existingCard, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingCard) {
      return createErrorResponse('卡片不存在', 404);
    }

    if (user_id !== existingCard.user_id) {
      return createErrorResponse('没有权限删除此卡片', 403);
    }

    const { error } = await supabase.from('cards').delete().eq('id', id);

    if (error) {
      return createErrorResponse('删除卡片失败', 500);
    }

    return createSuccessResponse({
      message: '卡片删除成功',
    });
  } catch (error: any) {
    console.error('Delete card error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleLike(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const userId = getUserIdFromAuth(event);
    if (!userId) {
      return createErrorResponse('未授权', 401);
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const card_id = body.card_id;

    if (!card_id) {
      return createErrorResponse('缺少卡片ID');
    }

    const { data: card, error: fetchError } = await supabase
      .from('cards')
      .select('id, likes_count')
      .eq('id', card_id)
      .single();

    if (fetchError || !card) {
      return createErrorResponse('卡片不存在', 404);
    }

    const current = Number(card.likes_count) || 0;
    const next = current + 1;

    const { error: updateError } = await supabase
      .from('cards')
      .update({ likes_count: next })
      .eq('id', card_id);

    if (updateError) {
      return createErrorResponse(updateError.message, 500);
    }

    return createSuccessResponse({ likesCount: next });
  } catch (e: any) {
    return createErrorResponse(e.message || '服务器错误', 500);
  }
}
