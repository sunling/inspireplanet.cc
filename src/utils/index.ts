import {
  HttpHeaders,
  NetlifyEvent,
  NetlifyResponse,
} from '../netlify/types/http';

/**
 * 检查活动是否即将举行
 * @param dateString 日期字符串
 * @returns boolean 是否即将举行
 */
export const isUpcoming = (dateString: string): boolean => {
  return new Date(dateString) > new Date();
};

/**
 * 格式化时间
 * @param timeString 时间字符串 (HH:mm格式)
 * @returns string 格式化后的时间
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';

  // 处理不同格式的时间字符串
  if (timeString.includes(':')) {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  } else if (typeof timeString === 'string') {
    // 处理日期时间字符串
    const date = new Date(timeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return '';
};

/**
 * HTML转义
 * @param text 需要转义的文本
 * @returns string 转义后的文本
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 格式化日期
 * @param dateString 日期字符串
 * @returns string 格式化后的日期
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString('zh-CN', options);
};

/**
 * 安全检查字符串
 * @param value 要检查的值
 * @returns boolean 是否为安全的非空字符串
 */
export const isSafeString = (value: any): boolean => {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length < 1000
  );
};

/**
 * 检查是否包含危险内容
 * @param raw 原始文本
 * @returns boolean 是否包含危险内容
 */
export const hasDangerousContent = (raw: string): boolean => {
  if (!raw || typeof raw !== 'string') return false;

  const forbiddenTagRegex = /<(script|iframe|svg|img)[^>]*>/i;
  const forbiddenAttrRegex = /onerror\s*=|onclick\s*=|onload\s*=/i;

  return forbiddenTagRegex.test(raw) || forbiddenAttrRegex.test(raw);
};

// 暂存，未处理使用
/**
 * 获取基础URL（服务端专用）
 * 注意：前端代码应使用httpClient中的URL处理逻辑
 * @returns 基础URL字符串
 */
export function getServerBaseUrl() {
  if (process && process.env && process.env.URL) {
    return process.env.URL;
  }

  // 仅用于服务端环境的fallback
  if (typeof window === 'undefined') {
    return 'http://localhost:8888';
  }

  // 客户端环境下不推荐使用此函数
  console.warn('getServerBaseUrl should not be used in browser environment');
  return window.location.origin;
}

/**
 * 创建标准的CORS响应头
 * @returns 配置好的CORS响应头
 */
export function createCorsHeaders(): HttpHeaders {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };
}

/**
 * 处理预检请求
 * @param headers 响应头
 * @returns 预检请求响应
 */
export function handleOptionsRequest(headers: HttpHeaders): NetlifyResponse {
  return {
    statusCode: 200,
    headers,
    body: '',
  };
}

/**
 * 创建成功响应
 * @param data 响应数据
 * @param headers 响应头
 * @param statusCode HTTP状态码
 * @returns 成功响应对象
 */
export function createSuccessResponse<T = any>(
  data: T,
  headers: HttpHeaders,
  statusCode: number = 200
): NetlifyResponse {
  try {
    // 确保数据能被正确序列化
    const body = JSON.stringify(data);
    return {
      statusCode,
      headers,
      body,
    };
  } catch (error) {
    console.error('Failed to stringify response data:', error);
    // 返回序列化错误的响应
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to process response data',
      }),
    };
  }
}

/**
 * 创建错误响应
 * @param error 错误信息
 * @param headers 响应头
 * @param statusCode HTTP状态码
 * @returns 错误响应对象
 */
export function createErrorResponse(
  error: string,
  headers: HttpHeaders,
  statusCode: number = 500
): NetlifyResponse {
  return {
    statusCode,
    headers,
    body: JSON.stringify({ success: false, error }),
  };
}

/**
 * 验证请求方法
 * @param event Netlify事件
 * @param allowedMethods 允许的HTTP方法数组
 * @param headers 响应头
 * @returns 如果方法无效，返回错误响应；否则返回null
 */
export function validateHttpMethod(
  event: NetlifyEvent,
  allowedMethods: string[],
  headers: HttpHeaders
): NetlifyResponse | null {
  if (!allowedMethods.includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Method Not Allowed. Allowed methods: ${allowedMethods.join(
          ', '
        )}`,
      }),
    };
  }
  return null;
}

/**
 * 解析请求体
 * @param event Netlify事件
 * @param throwOnError 是否在解析失败时抛出错误
 * @returns 解析后的请求体对象
 */
export function parseRequestBody<T = any>(
  event: NetlifyEvent,
  throwOnError: boolean = false
): T | null {
  try {
    return event.body ? JSON.parse(event.body) : ({} as T);
  } catch (error) {
    console.error('Failed to parse request body:', error);
    if (throwOnError) {
      throw new Error('Invalid JSON in request body');
    }
    return null;
  }
}

/**
 * 提取查询参数值
 * @param event Netlify事件
 * @param paramName 参数名
 * @param defaultValue 默认值
 * @returns 参数值或默认值
 */
export function getQueryParam(
  event: NetlifyEvent,
  paramName: string,
  defaultValue?: string
): string | undefined {
  return event.queryStringParameters?.[paramName] || defaultValue;
}

/**
 * 创建标准的API响应格式
 * @param success 是否成功
 * @param data 数据（成功时）
 * @param error 错误信息（失败时）
 * @param message 提示消息
 * @returns 标准化的API响应对象
 */
export function createApiResponse<T = any>({
  success,
  data,
  error,
  message,
}: {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}): { success: boolean; data?: T; error?: string; message?: string } {
  return {
    success,
    data,
    error,
    message,
  };
}
