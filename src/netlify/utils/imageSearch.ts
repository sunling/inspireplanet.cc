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

export interface ImageSearchResult {
  query: string;
  images: ImageResult[];
}

export async function searchImageByText(
  text: string,
  orientation: string = 'landscape'
): Promise<ImageSearchResult | null> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
  const URL = process.env.URL || 'http://localhost:8888';

  if (!OPENROUTER_API_KEY || !UNSPLASH_ACCESS_KEY) {
    console.error('缺少 API 密钥: OPENROUTER_API_KEY 或 UNSPLASH_ACCESS_KEY');
    return null;
  }

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
          'HTTP-Referer': URL,
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
            { role: 'user', content: text },
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

  try {
    const unsplashController = new AbortController();
    const unsplashTimeout = setTimeout(() => unsplashController.abort(), 10000);

    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(finalQuery)}&per_page=6&orientation=${orientation}`,
      {
        signal: unsplashController.signal,
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      }
    );

    clearTimeout(unsplashTimeout);

    const unsplashData = await unsplashResponse.json();

    if (!unsplashResponse.ok) {
      console.error('Unsplash API error:', unsplashData);
      return null;
    }

    const images: ImageResult[] = (unsplashData.results || []).map((image: any) => ({
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

    return { query: finalQuery, images };
  } catch (unsplashError: any) {
    console.error('Unsplash request failed:', unsplashError.message);
    return null;
  }
}
