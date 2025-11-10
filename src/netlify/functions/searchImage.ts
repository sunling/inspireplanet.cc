import { sanitizeInput } from '../../utils/helper';
import { NetlifyEvent } from '../types/http';

// 定义数据接口
export interface SearchRequest {
  text: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

export interface ImageResult {
  url: string;
  title: string;
  description: string;
  thumb: string;
  credit: {
    name: string;
    username: string;
    link: string;
  };
}

export interface SearchResponse {
  query: string;
  images: ImageResult[];
  error?: string;
  details?: any;
}

export async function handler(
  event: NetlifyEvent
): Promise<{ statusCode: number; body: string }> {
  try {
    // 支持GET和POST请求
    let text: string | undefined;
    let orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape';

    if (event.httpMethod === 'GET') {
      // 从查询参数中获取数据
      text = event.queryStringParameters?.text;
      orientation =
        (event.queryStringParameters?.orientation as
          | 'landscape'
          | 'portrait'
          | 'squarish') || 'landscape';
    } else if (event.httpMethod === 'POST') {
      // 从请求体中获取数据
      try {
        const requestBody = JSON.parse(event.body || '{}');
        text = requestBody.text;
        orientation = requestBody.orientation || 'landscape';
      } catch (parseError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request body format' }),
        };
      }
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed. Use GET or POST' }),
      };
    }

    // 验证必要参数
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text parameter' }),
      };
    }

    // 使用processImageSearch函数处理搜索逻辑
    return await processImageSearch(sanitizeInput(text, 200), orientation);
  } catch (error: any) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error processing request',
        details: error.message || String(error),
      }),
    };
  }
}

/**
 * 处理图片搜索逻辑
 * @param text 搜索文本
 * @param orientation 图片方向
 * @returns 搜索结果
 */
export async function processImageSearch(
  text: string,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<{ statusCode: number; body: string }> {
  try {
    // Step 1: Generate search query using OpenRouter API with Mixtral 8x7B model
    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
          'HTTP-Referer': process.env.URL || 'http://localhost:8888',
          'X-Title': 'Inspiration Planet',
        },
        body: JSON.stringify({
          model: 'mistralai/mixtral-8x7b-instruct',
          messages: [
            {
              role: 'system',
              content:
                "You are a helpful assistant that generates concise image search queries based on user input. Your response should be a single search query string, no more than 100 characters, that captures the essence of the user's input for finding relevant images. Do not include any explanations or additional text.",
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
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to generate search query',
          details: openRouterData,
        }),
      };
    }

    // Extract the generated query
    const query = openRouterData.choices[0]?.message?.content?.trim() || text;

    // Ensure query is not too long
    const finalQuery = query.length > 100 ? query.substring(0, 100) : query;

    // Step 2: Search for images on Unsplash API
    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        finalQuery
      )}&per_page=6&orientation=${orientation}`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY || ''}`,
        },
      }
    );

    const unsplashData = await unsplashResponse.json();

    if (!unsplashResponse.ok) {
      console.error('Unsplash API error:', unsplashData);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to search for images',
          details: unsplashData,
        }),
      };
    }

    // Format the response
    const images: ImageResult[] = (unsplashData.results as any[]).map(
      (image: any) => ({
        url: image.urls.regular,
        title: image.description || image.alt_description || 'Unsplash Image',
        description: `Photo by ${image.user.name} on Unsplash`,
        thumb: image.urls.thumb,
        credit: {
          name: image.user.name,
          username: image.user.username,
          link: image.user.links.html,
        },
      })
    );

    const response: SearchResponse = {
      query: finalQuery,
      images: images,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error('Search processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error processing request',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
