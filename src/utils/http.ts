import { HttpHeaders } from '../netlify/types/http';

export const getCommonHttpHeader = () => {
  const headers: HttpHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  return headers;
};

export function getBaseUrl(): string {
  if (process && process.env) {
    // Netlify环境变量
    if (process.env.URL) return process.env.URL;
    // Vercel环境变量
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    // 其他环境变量
    if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  }
  // 本地开发回退
  return 'http://localhost:8888';
}
