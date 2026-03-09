import { supabase } from '../../database/supabase';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
// 本地定义 CardData 接口，避免从缺失的模块导入
interface CardData {
  id?: string;
  title: string;
  quote: string;
  detail: string;
  font?: string;
  imagePath?: string;
  upload?: string;
  creator?: string;
  gradientClass?: string;
  username?: string | null;
}
import jwt from 'jsonwebtoken';

// 定义数据库卡片记录接口
export interface CardRecord {
  id: string;
  title: string;
  quote: string;
  detail: string;
  font: string;
  imagePath: string;
  upload: string;
  creator: string;
  created: string;
  gradientClass: string;
  username: string | null;
}

// 注意：内存缓存已禁用以确保删除操作后数据一致性
// Netlify Functions 的无状态特性导致缓存在不同实例间不一致
// interface Cache {
//   allCards: CardRecord[] | null;
//   cardsByIds: Record<string, CardRecord[]>;
// }
// const cache: Cache = {
//   allCards: null,
//   cardsByIds: {},
// };

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
  if (event.httpMethod === 'POST') {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || '';
    if (action === 'like') {
      // 缓存已禁用，无需清空
      return await like(event, context);
    }
    // 缓存已禁用，无需清空
    console.log('Saving card');
    return await save(event, context);
  } else if (event.httpMethod === 'PUT') {
    // 缓存已禁用，无需清空
    console.log('Updating card');
    return await update(event, context);
  } else if (event.httpMethod === 'GET') {
    console.log('Fetching cards');
    return await fetch(event, context);
  } else if (event.httpMethod === 'DELETE') {
    // 缓存已禁用，无需清空
    console.log('Deleting card');
    return await deleteCard(event, context);
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
}

const JWT_SECRET = process.env.JWT_SECRET as string;
function getUserId(event: any) {
  const auth =
    (event.headers as any)?.authorization ||
    (event.headers as any)?.Authorization;
  if (!auth || !String(auth).startsWith('Bearer ')) return null;
  const token = String(auth).substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.user_id || null;
  } catch {
    return null;
  }
}

/**
 * 保存新卡片
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
async function save(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  try {
    // 只允许POST请求
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // 解析请求体
    const cardData: CardData = JSON.parse(event.body || '{}');

    // 验证必填字段
    if (!cardData.title || !cardData.quote || !cardData.detail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // 准备插入数据库的记录
    const record = {
      font: cardData.font || '',
      title: cardData.title,
      quote: cardData.quote,
      image_path: cardData.imagePath || '',
      detail: cardData.detail,
      upload: cardData.upload || '',
      creator: cardData.creator || '',
      created: new Date().toISOString(),
      gradient_class: cardData.gradientClass || '',
      username: cardData.username || null,
      likes_count: 0,
    };

    // 插入Supabase
    const { data, error } = await supabase
      .from('cards')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting card:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to submit card',
          details: error.message,
          success: false,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Card submitted successfully',
        success: true,
        id: data?.[0]?.id,
      }),
    };
  } catch (error: any) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        success: false,
      }),
    };
  }
}

/**
 * 获取卡片
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
async function fetch(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  try {
    // 检查查询参数中是否有id
    const params = event.queryStringParameters || {};
    const idParam = params.id;

    // 禁用内存缓存以确保删除操作后数据一致性
    // Netlify Functions 的无状态特性导致缓存在不同实例间不一致

    // if (idParam) {
    //   // 检查是否是逗号分隔的ID列表
    //   if (idParam.includes(',')) {
    //     const ids = idParam
    //       .split(',')
    //       .map((id) => id.trim())
    //       .filter((id) => id);
    //     const cacheKey = ids.sort().join(',');

    //     if (cache.cardsByIds[cacheKey]) {
    //       return {
    //         statusCode: 200,
    //         body: JSON.stringify({ records: cache.cardsByIds[cacheKey] }),
    //       };
    //     }
    //   } else {
    //     // 单个ID
    //     if (cache.cardsByIds[idParam]) {
    //       console.log('Cache hit for ID:', idParam);
    //       return {
    //         statusCode: 200,
    //         body: JSON.stringify({ records: cache.cardsByIds[idParam] }),
    //       };
    //     }
    //   }
    // } else if (cache.allCards) {
    //   // 返回缓存中的所有卡片
    //   console.log('Cache hit for all cards');
    //   return {
    //     statusCode: 200,
    //     body: JSON.stringify({ records: cache.allCards }),
    //   };
    // }

    // 构建查询
    let query = supabase.from('cards').select('*');

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

    // 应用排序
    query = query.order('created', { ascending: false }).limit(25);

    // 执行查询
    const { data, error } = await query;

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    const records = (data || []).map((row, index) => ({
      id: row.id || `row_${index}`,
      title: row.title,
      quote: row.quote,
      detail: row.detail,
      font: row.font,
      imagePath: row.image_path,
      upload: row.upload,
      creator: row.creator,
      created: row.created,
      gradientClass: row.gradient_class,
      username: row.username,
      likesCount: row.likes_count || 0,
    }));

    // 缓存已禁用以确保数据一致性
    // if (idParam) {
    //   if (idParam.includes(',')) {
    //     const ids = idParam
    //       .split(',')
    //       .map((id) => id.trim())
    //       .filter((id) => id);
    //     const cacheKey = ids.sort().join(',');
    //     cache.cardsByIds[cacheKey] = records;
    //   } else {
    //     cache.cardsByIds[idParam] = records;
    //   }
    // } else {
    //   cache.allCards = records;
    // }

    const responseBody = JSON.stringify({ records });
    console.log(
      'Response payload size: ',
      Buffer.byteLength(responseBody, 'utf8')
    );

    return {
      statusCode: 200,
      body: responseBody,
    };
  } catch (error: any) {
    console.error('Fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

async function like(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  try {
    const userId = getUserId(event);
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
      };
    }
    const payload = event.body ? JSON.parse(event.body) : {};
    const cardId = payload.cardId;
    if (!cardId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Missing cardId' }),
      };
    }
    // 读取当前计数
    const { data: card, error: fetchError } = await supabase
      .from('cards')
      .select('id, likes_count')
      .eq('id', cardId)
      .single();
    if (fetchError || !card) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Card Not Found' }),
      };
    }
    const current = Number(card.likes_count) || 0;
    const next = current + 1;
    const { error: updateError } = await supabase
      .from('cards')
      .update({ likes_count: next })
      .eq('id', cardId);
    if (updateError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: updateError.message }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, likesCount: next }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: e.message || 'Server Error',
      }),
    };
  }
}

/**
 * 更新卡片
 * @param event 事件对象
 * @param context 上下文对象
 * @returns 响应对象
 */
async function update(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  try {
    // 只允许PUT请求
    if (event.httpMethod !== 'PUT') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    // 解析请求体
    const cardData: CardData = JSON.parse(event.body || '{}');

    // 验证必填字段
    if (
      !cardData.id ||
      !cardData.title ||
      !cardData.quote ||
      !cardData.detail
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: id, title, quote, detail',
        }),
      };
    }

    // 检查卡片是否存在并获取当前数据
    const { data: existingCard, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardData.id)
      .single();

    if (fetchError || !existingCard) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Card not found' }),
      };
    }

    // 验证用户权限（检查用户名是否匹配）
    if (
      cardData.username &&
      existingCard.username &&
      cardData.username !== existingCard.username
    ) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Permission denied: You can only edit your own cards',
        }),
      };
    }

    // 准备更新数据
    const updateData = {
      title: cardData.title,
      quote: cardData.quote,
      detail: cardData.detail,
      creator: cardData.creator || existingCard.creator,
      font: cardData.font || existingCard.font,
      gradient_class: cardData.gradientClass || existingCard.gradient_class,
      image_path: cardData.imagePath || existingCard.image_path,
      upload: cardData.upload || existingCard.upload,
      username: cardData.username || existingCard.username,
    };

    // 更新Supabase中的卡片
    const { data, error } = await supabase
      .from('cards')
      .update(updateData)
      .eq('id', cardData.id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to update card in database' }),
      };
    }

    console.log('Card updated successfully:', data?.[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Card updated successfully',
        card: data?.[0],
      }),
    };
  } catch (error: any) {
    console.error('Update card error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

/**
 * 为卡片生成哈希值（用于防止重复）
 * @param card 卡片数据
 * @returns 哈希值
 */
function generateHash(card: CardData): string | null {
  if (!card.title || !card.quote || !card.detail) return null;

  const normalized = [
    card.title.trim().replace(/\s+/g, ' '),
    card.quote.trim().replace(/\s+/g, ' '),
    card.detail.trim().replace(/\s+/g, ' '),
  ].join('|');

  // 使用简单的base64编码作为哈希
  return Buffer.from(normalized).toString('base64');
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
