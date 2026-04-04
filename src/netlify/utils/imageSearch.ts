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

const IMAGE_TIMEOUT_MS = 8000;

export async function searchImageByText(
  text: string,
  orientation: string = 'landscape'
): Promise<ImageSearchResult | null> {
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

  if (!UNSPLASH_ACCESS_KEY) {
    console.error('缺少 API 密钥: UNSPLASH_ACCESS_KEY');
    return null;
  }

  const query = text.trim().substring(0, 80);
  const encodedQuery = encodeURIComponent(query);

  const [unsplashImages, pexelsImages] = await Promise.all([
    fetchUnsplash(encodedQuery, orientation, UNSPLASH_ACCESS_KEY),
    fetchPexels(encodedQuery, orientation, PEXELS_API_KEY),
  ]);

  const images = [...unsplashImages, ...pexelsImages];

  if (images.length === 0) {
    console.error('Both Unsplash and Pexels returned no results');
    return null;
  }

  return { query, images };
}

async function fetchUnsplash(
  encodedQuery: string,
  orientation: string,
  accessKey: string
): Promise<ImageResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=3&orientation=${orientation}`,
      { signal: controller.signal, headers: { Authorization: `Client-ID ${accessKey}` } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).map((image: any) => ({
      url: image.urls.regular,
      title: image.description || image.alt_description || 'Unsplash Image',
      description: `Photo by ${image.user.name} on Unsplash`,
      thumb: image.urls.thumb,
      credit: { name: image.user.name, username: image.user.username, link: image.user.links.html },
    }));
  } catch {
    return [];
  }
}

async function fetchPexels(
  encodedQuery: string,
  orientation: string,
  apiKey: string
): Promise<ImageResult[]> {
  if (!apiKey) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=3&orientation=${orientation}`,
      { signal: controller.signal, headers: { Authorization: apiKey } }
    );
    clearTimeout(timeout);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.photos || []).map((photo: any) => ({
      url: photo.src.large,
      title: photo.alt || 'Pexels Image',
      description: `Photo by ${photo.photographer} on Pexels`,
      thumb: photo.src.small,
      credit: { name: photo.photographer, username: photo.photographer, link: photo.photographer_url },
    }));
  } catch {
    return [];
  }
}
