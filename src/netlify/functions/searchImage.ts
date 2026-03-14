import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFuntionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export interface SearchImageAction {
  functionName: 'search';
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
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
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
  const requestBody = getDataFromEvent(event);
  const text: string = requestBody.text || '';
  const orientation: string = requestBody.orientation || 'landscape';

  if (!text) {
    return createErrorResponse('缺少文本参数');
  }

  try {
    const OPENROUTER_API_KEY = getOpenRouterApiKey();
    const URL = getUrl();
    const UNSPLASH_ACCESS_KEY = getUnspashAccessKey();

    // 检查 API 密钥是否存在
    if (!OPENROUTER_API_KEY) {
      return createErrorResponse('OpenRouter API 密钥未配置', 400);
    }

    if (!UNSPLASH_ACCESS_KEY) {
      return createErrorResponse('Unsplash API 密钥未配置', 400);
    }

    // 如果文本包含中文，需要通过 AI 翻译成英文再搜索
    const hasChinese = /[\u4e00-\u9fff]/.test(text);

    let query = hasChinese ? 'nature inspiration' : text;
    try {
      const aiController = new AbortController();
      const aiTimeout = setTimeout(() => aiController.abort(), 8000);

      const openRouterResponse = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          signal: aiController.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': URL || 'http://localhost:8888',
            'X-Title': 'Inspiration Planet',
          },
          body: JSON.stringify({
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [
              {
                role: 'system',
                content:
                  "You are a helpful assistant that generates concise English image search queries based on user input. Your response should be a single English search query string, no more than 100 characters, that captures essence of user's input for finding relevant images. Do not include any explanations or additional text. Always respond in English only.",
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

      clearTimeout(aiTimeout);

      if (openRouterResponse.ok) {
        const openRouterData = await openRouterResponse.json();
        const aiQuery = openRouterData.choices?.[0]?.message?.content?.trim();
        if (aiQuery && !/[\u4e00-\u9fff]/.test(aiQuery)) {
          query = aiQuery;
        }
      } else {
        const errData = await openRouterResponse.json().catch(() => ({}));
        console.warn('OpenRouter API error:', errData);
      }
    } catch (aiError: any) {
      console.warn('OpenRouter request failed, using fallback query:', aiError.message);
    }
    const finalQuery = query.length > 100 ? query.substring(0, 100) : query;

    const unsplashController = new AbortController();
    const unsplashTimeout = setTimeout(() => unsplashController.abort(), 10000);

    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        finalQuery
      )}&per_page=6&orientation=${orientation}`,
      {
        signal: unsplashController.signal,
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    clearTimeout(unsplashTimeout);

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
