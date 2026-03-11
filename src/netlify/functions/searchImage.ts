import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getCommonHttpHeader,
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getActionFromEvent,
} from '../utils/server';

export interface SearchImageAction {
  action: 'search';
}

function getOpenRouterApiKey(): string {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.OPENROUTER_API_KEY || '';
    }

    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.OPENROUTER_API_KEY || '';
      }
    }

    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

function getUrl(): string {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.URL || '';
    }

    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.URL || '';
      }
    }

    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

function getUnspashAccessKey(): string {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.UNSPLASH_ACCESS_KEY || '';
    }

    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.UNSPLASH_ACCESS_KEY || '';
      }
    }

    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const action = getActionFromEvent(event);

    switch (action) {
      case 'search':
        return await handleSearch(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('SearchImage handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleSearch(event: NetlifyEvent): Promise<NetlifyResponse> {
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return createErrorResponse('无效的请求体格式');
  }

  const { text, orientation = 'landscape' } = requestBody;
  if (!text) {
    return createErrorResponse('缺少文本参数');
  }

  try {
    const OPENROUTER_API_KEY = getOpenRouterApiKey();
    const URL = getUrl();
    const UNSPLASH_ACCESS_KEY = getUnspashAccessKey();

    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY || ''}`,
          'HTTP-Referer': URL || 'http://localhost:8888',
          'X-Title': 'Inspiration Planet',
        },
        body: JSON.stringify({
          model: 'mistralai/mixtral-8x7b-instruct',
          messages: [
            {
              role: 'system',
              content:
                "You are a helpful assistant that generates concise image search queries based on user input. Your response should be a single search query string, no more than 100 characters, that captures essence of user's input for finding relevant images. Do not include any explanations or additional text.",
            },
            {
              role: 'user',
              content: text,
            },
          ],
          max_tokens: 50,
        }),
      }
    );

    const openRouterData = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', openRouterData);
      return createErrorResponse('生成搜索查询失败', 500);
    }

    const query = openRouterData.choices?.[0]?.message?.content?.trim() || text;
    const finalQuery = query.length > 100 ? query.substring(0, 100) : query;

    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        finalQuery
      )}&per_page=6&orientation=${orientation}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY || ''}`,
        },
      }
    );

    const unsplashData = await unsplashResponse.json();

    if (!unsplashResponse.ok) {
      console.error('Unsplash API error:', unsplashData);
      return createErrorResponse('搜索图片失败', 500);
    }

    const images = (unsplashData.results || []).map((image: any) => ({
      url: image.urls.regular,
      title: image.description || image.alt_description || 'Unsplash Image',
      description: `Photo by ${image.user.name} on Unsplash`,
      thumb: image.urls.thumb,
      credit: {
        name: image.user.name,
        username: image.user.username,
        link: image.user.links.html,
      },
    }));

    return createSuccessResponse({ query: finalQuery, images: images });
  } catch (error: any) {
    console.error('Error:', error);
    return createErrorResponse('处理请求错误', 500);
  }
}
