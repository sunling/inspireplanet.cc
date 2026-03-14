import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import { CardItem } from '../types';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getUserIdFromAuth,
  getFuntionNameFromEvent,
  getDataFromEvent,
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
  functionName:
    | 'create'
    | 'update'
    | 'delete'
    | 'like'
    | 'get'
    | 'getAll'
    | 'getById';
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
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
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
      case 'getById':
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
    const cardData = getDataFromEvent(event) as CardItem;

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
    const requestData = getDataFromEvent(event);
    const id = requestData.id;

    const pageParam = requestData.page ? parseInt(requestData.page, 10) : null;
    const limitParam = requestData.limit
      ? parseInt(requestData.limit, 10)
      : null;
    const isPaginated = pageParam !== null && limitParam !== null;

    if (!id) {
      return createErrorResponse('缺少卡片ID');
    }

    const cacheKey = String(id);
    if (cache.cardsByIds[cacheKey]) {
      const records = cache.cardsByIds[cacheKey];
      return createSuccessResponse({ records, total: records.length });
    }

    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .limit(25);

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    const records = (data || []).map((row: any) => row);
    cache.cardsByIds[cacheKey] = records;

    return createSuccessResponse({ records, total: records.length });
  } catch (error: any) {
    console.error('Get card error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const userId = requestData.userId;
    const idParam = requestData.id;
    const pageParam = requestData.page ? parseInt(requestData.page, 10) : null;
    const limitParam = requestData.limit
      ? parseInt(requestData.limit, 10)
      : null;
    const isPaginated = pageParam !== null && limitParam !== null;

    if (idParam) {
      // 检查是否是逗号分隔的ID列表
      if (idParam.includes(',')) {
        const ids = idParam
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id);
        const cacheKey = ids.sort().join(',');

        if (cache.cardsByIds[cacheKey]) {
          const records = cache.cardsByIds[cacheKey];
          return createSuccessResponse({ records, total: records.length });
        }
      } else {
        // 单个ID
        if (cache.cardsByIds[idParam]) {
          console.log('Cache hit for ID:', idParam);
          const records = cache.cardsByIds[idParam];
          return createSuccessResponse({ records, total: records.length });
        }
      }
    } else if (!isPaginated && cache.allCards) {
      // 返回缓存中的所有卡片（无分页时）
      console.log('Cache hit for all cards');
      const records = cache.allCards;
      return createSuccessResponse({ records, total: records.length });
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
          .map((id: string) => id.trim())
          .filter((id: string) => id);
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

    const { data: resultData, error, count } = await query;

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    const records = (resultData || []).map((row: any) => row);
    cache.allCards = records;

    // 更新缓存（无分页时才缓存）
    if (idParam) {
      if (idParam.includes(',')) {
        const ids = idParam
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id);
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
    const cardData = getDataFromEvent(event) as CardItem;

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
    const data = getDataFromEvent(event);
    const { id, user_id } = data;

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

    const data = getDataFromEvent(event);
    const card_id = data.card_id;

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

/**
 * 删除卡片
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
async function deleteCard(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  try {
    // 只允许DELETE请求
    if (event.httpMethod !== 'DELETE') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // 获取用户身份
    const userId = getUserId(event);
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // 从查询参数获取卡片ID
    const params = event.queryStringParameters || {};
    const cardId = params.id;

    if (!cardId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing card id' }),
      };
    }

    // 检查卡片是否存在并获取当前数据
    const { data: existingCard, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !existingCard) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found' }),
      };
    }

    // 验证用户权限（检查用户名是否匹配）
    // 从JWT token中获取username
    const auth =
      (event.headers as any)?.authorization ||
      (event.headers as any)?.Authorization;
    const token = String(auth).substring(7);
    let decodedUsername: string | null = null;
    let decodedName: string | null = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      decodedUsername = decoded.username || decoded.user_name || null;
      decodedName = decoded.name || null;
      console.log('Token decoded - username:', decodedUsername, 'name:', decodedName);
      console.log('Card data - username:', existingCard.username, 'creator:', existingCard.creator);
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    let hasPermission = false;

    // 方式1: 通过 username 验证（推荐方式，用于新卡片）
    if (existingCard.username && decodedUsername) {
      if (decodedUsername === existingCard.username) {
        hasPermission = true;
        console.log('Permission granted via username match');
      }
    }

    // 方式2: 如果卡片没有 username，尝试通过 creator 字段验证（兼容旧卡片）
    if (!hasPermission && !existingCard.username && existingCard.creator) {
      if (decodedName === existingCard.creator) {
        hasPermission = true;
        console.log('Permission granted via creator match for legacy card');
      }
    }

    if (!hasPermission) {
      console.log('Permission denied: no matching permission found');
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Permission denied: You can only delete your own cards',
        }),
      };
    }

    // 删除Supabase中的卡片
    console.log('Attempting to delete card from Supabase, id:', cardId);

    // 先检查卡片是否真的存在
    const { data: cardBeforeDelete, error: checkError } = await supabase
      .from('cards')
      .select('id, username, creator')
      .eq('id', cardId)
      .single();

    console.log('Card before delete:', cardBeforeDelete);

    if (checkError || !cardBeforeDelete) {
      console.error('Card check failed:', checkError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found' }),
      };
    }

    // 执行删除操作
    const { data: deleteData, error: deleteError, count } = await supabase
      .from('cards')
      .delete({ count: 'exact' })
      .eq('id', cardId)
      .select();

    console.log('Delete operation result:', {
      error: deleteError,
      count: count,
      dataLength: deleteData?.length,
    });

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to delete card', details: deleteError.message }),
      };
    }

    // 验证删除是否成功
    // 方式1: 检查 data 数组是否有内容（Supabase 会返回被删除的记录）
    // 方式2: 检查 count 是否大于 0
    const deleteSuccess = (deleteData && deleteData.length > 0) || (count !== null && count > 0);

    if (!deleteSuccess) {
      console.error('No records were deleted, count:', count, 'data length:', deleteData?.length);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Delete operation affected 0 rows',
          details: 'The card may have been already deleted or there might be a permission issue',
        }),
      };
    }

    console.log('Card deleted successfully, affected rows:', count ?? deleteData?.length);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Card deleted successfully',
      }),
    };
  } catch (error: any) {
    console.error('Delete card error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
