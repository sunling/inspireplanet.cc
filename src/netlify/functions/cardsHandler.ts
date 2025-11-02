import { supabase } from '../../database/supabase';
import dotenv from 'dotenv';
dotenv.config();

// 定义卡片数据接口
export interface CardData {
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

// 定义数据库卡片记录接口
export interface CardRecord {
  id: string;
  Title: string;
  Quote: string;
  Detail: string;
  Font: string;
  ImagePath: string;
  Upload: string;
  Creator: string;
  Created: string;
  GradientClass: string;
  Username: string | null;
}

// 定义Netlify事件接口
interface NetlifyEvent {
  httpMethod: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
}

// 定义Netlify上下文接口
interface NetlifyContext {
  clientContext?: {
    identity?: {
      url: string;
      token: string;
    };
    user?: {
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
      id: string;
      aud: string;
      email?: string;
    };
  };
}

// 定义响应接口
interface NetlifyResponse {
  statusCode: number;
  body: string;
}

// 内存缓存
interface Cache {
  allCards: CardRecord[] | null;
  cardsByIds: Record<string, CardRecord[]>;
}

const cache: Cache = {
  allCards: null,
  cardsByIds: {},
};

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
    cache.allCards = null;
    cache.cardsByIds = {};
    console.log('Saving card');
    return await save(event, context);
  } else if (event.httpMethod === 'PUT') {
    cache.allCards = null;
    cache.cardsByIds = {};
    console.log('Updating card');
    return await update(event, context);
  } else if (event.httpMethod === 'GET') {
    console.log('Fetching cards');
    return await fetch(event, context);
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
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
      Font: cardData.font || '',
      Title: cardData.title,
      Quote: cardData.quote,
      ImagePath: cardData.imagePath || '',
      Detail: cardData.detail,
      Upload: cardData.upload || '',
      Creator: cardData.creator || '',
      Created: new Date().toISOString(),
      GradientClass: cardData.gradientClass || '',
      Username: cardData.username || null,
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
    } else if (cache.allCards) {
      // 返回缓存中的所有卡片
      console.log('Cache hit for all cards');
      return {
        statusCode: 200,
        body: JSON.stringify({ records: cache.allCards }),
      };
    }

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
    query = query.order('Created', { ascending: false }).limit(25);

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
      Title: row.Title,
      Quote: row.Quote,
      Detail: row.Detail,
      Font: row.Font,
      ImagePath: row.ImagePath,
      Upload: row.Upload,
      Creator: row.Creator,
      Created: row.Created,
      GradientClass: row.GradientClass,
      Username: row.Username,
    }));

    // 更新缓存
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
    } else {
      cache.allCards = records;
    }

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
      existingCard.Username &&
      cardData.username !== existingCard.Username
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
      Title: cardData.title,
      Quote: cardData.quote,
      Detail: cardData.detail,
      Creator: cardData.creator || existingCard.Creator,
      Font: cardData.font || existingCard.Font,
      GradientClass: cardData.gradientClass || existingCard.GradientClass,
      ImagePath: cardData.imagePath || existingCard.ImagePath,
      Upload: cardData.upload || existingCard.Upload,
      Username: cardData.username || existingCard.Username,
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
