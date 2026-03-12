/**
 * 获取通用 HTTP 头
 * @returns HttpHeaders HTTP 头对象
 */
export const getCommonHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
};

/**
 * 获取基础 URL
 * @returns string 基础 URL
 */
export const getBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    // Netlify环境变量
    if (process.env.URL) return process.env.URL;
    // Vercel环境变量
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // 其他环境变量
    if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  }
  // 本地开发回退
  return 'http://localhost:8888';
};

/**
 * 统一 API 调用函数
 * @param url API 地址
 * @param options 请求选项
 * @returns Promise<T> 响应数据
 */
export async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
