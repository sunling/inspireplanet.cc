// 获取环境变量，同时支持客户端和服务端环境
function getOpenRouterApiKey(): string {
  try {
    // 首先尝试服务端环境变量（Netlify Functions）
    if (typeof process !== 'undefined' && process.env) {
      return (
        process.env.OPENROUTER_API_KEY ||
        process.env.VITE_OPENROUTER_API_KEY ||
        ''
      );
    }

    // 然后尝试客户端环境变量（Vite）
    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.VITE_OPENROUTER_API_KEY || '';
      }
    }

    // 兜底方案
    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

function getUrl(): string {
  try {
    // 首先尝试服务端环境变量（Netlify Functions）
    if (typeof process !== 'undefined' && process.env) {
      return process.env.URL || '';
    }

    // 然后尝试客户端环境变量（Vite）
    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.VITE_URL || '';
      }
    }

    // 兜底方案
    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

function getUnspashAccessKey(): string {
  try {
    // 首先尝试服务端环境变量（Netlify Functions）
    if (typeof process !== 'undefined' && process.env) {
      return process.env.UNSPLASH_ACCESS_KEY || '';
    }

    // 然后尝试客户端环境变量（Vite）
    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return metaEnv.VITE_UNSPLASH_ACCESS_KEY || '';
      }
    }

    // 兜底方案
    console.error('获取环境变量出错！');
    return '';
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return '';
  }
}

interface NetlifyEvent {
  httpMethod: string;
  body: string;
  headers?: Record<string, string>;
}

interface NetlifyResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export const handler = async function (
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Only POST requests are allowed' }),
    };
  }

  // Parse request body
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body format' }),
    };
  }

  // Check if text parameter is provided
  const { text, orientation = 'landscape' } = requestBody;
  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing text parameter' }),
    };
  }

  try {
    const OPENROUTER_API_KEY = getOpenRouterApiKey();
    const URL = getUrl();
    const UNSPLASH_ACCESS_KEY = getUnspashAccessKey();
    // Step 1: Generate search query using OpenRouter API with Mixtral 8x7B model
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
    const query = openRouterData.choices?.[0]?.message?.content?.trim() || text;

    // Ensure query is not too long
    const finalQuery = query.length > 100 ? query.substring(0, 100) : query;

    // Step 2: Search for images on Unsplash API
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
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to search for images',
          details: unsplashData,
        }),
      };
    }

    // Format the response
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        query: finalQuery,
        images: images,
      }),
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error processing request',
        details: error.message || 'Unknown error',
      }),
    };
  }
};
