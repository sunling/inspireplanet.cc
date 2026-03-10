import dayjs from 'dayjs';

/**
 * 日期时间工具函数
 */
export const dateTime = {
  /**
   * 检查活动是否即将举行
   * @param dateString 日期字符串
   * @returns boolean 是否即将举行
   */
  isUpcoming: (dateString: string): boolean => {
    return new Date(dateString) > new Date();
  },

  /**
   * 格式化时间
   * @param data 时间字符串 | Date对象
   * @param format 时间格式，如HH:mm:ss
   * @returns string 格式化后的时间
   */
  format: (data: string | Date, format = 'YYYY-MM-DD HH:mm:ss'): string => {
    if (!data) return '';
    return dayjs(data).format(format);
  },

  /**
   * 格式化日期
   * @param data 日期字符串 | Date对象
   * @param format 日期格式，如'YYYY-MM-DD'
   * @returns string 格式化后的日期
   */
  formatDate: (data: string | Date, format = 'YYYY-MM-DD'): string => {
    if (!data) return '';
    return dayjs(data).format(format);
  },

  /**
   * 格式化时间
   * @param data 时间字符串 | Date对象
   * @param format 时间格式，如'HH:mm:ss'
   * @returns string 格式化后的时间
   */
  formatTime: (data: string | Date, format = 'HH:mm:ss'): string => {
    if (!data) return '';
    return dayjs(data).format(format);
  },

  /**
   * 获取用户时区
   * @returns string 用户时区
   */
  getTimeZone: (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区';
    } catch {
      return '本地时区';
    }
  },

  /**
   * 按日期分组卡片
   * @param cards 卡片数组
   * @returns 按日期分组的对象
   */
  groupCardsByDate: (cards: any[]): Record<string, any[]> => {
    const grouped: Record<string, any[]> = {};

    cards.forEach((card) => {
      const date = new Date(card.created || '').toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    return grouped;
  },
};

/**
 * 字符串工具函数
 */
export const string = {
  /**
   * HTML转义
   * @param text 需要转义的文本
   * @returns string 转义后的文本
   */
  escapeHtml: (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 安全检查字符串
   * @param value 要检查的值
   * @returns boolean 是否为安全的非空字符串
   */
  isSafeString: (value: any): boolean => {
    return (
      typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().length < 1000
    );
  },

  /**
   * 检查是否包含危险内容
   * @param raw 原始文本
   * @returns boolean 是否包含危险内容
   */
  hasDangerousContent: (raw: string): boolean => {
    if (!raw || typeof raw !== 'string') return false;

    const forbiddenTagRegex = /<(script|iframe|svg|img)[^>]*>/i;
    const forbiddenAttrRegex = /onerror\s*=|onclick\s*=|onload\s*=/i;

    return forbiddenTagRegex.test(raw) || forbiddenAttrRegex.test(raw);
  },

  /**
   * 清理用户输入以防止XSS攻击
   * @param input 输入字符串
   * @param maxLength 最大允许长度
   * @returns 清理后的字符串
   */
  sanitizeInput: (input: string | undefined, maxLength: number): string => {
    if (!input) return '';

    let sanitized = input.trim();

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    return sanitized;
  },
};

/**
 * 用户工具函数
 */
export const user = {
  /**
   * 存储用户信息，确保登录状态
   * @param token 认证令牌
   * @param userInfo 用户信息
   */
  setAuth: (token: string, userInfo: any) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  },

  /**
   * 获取认证令牌
   * @returns string | null 认证令牌
   */
  getAuth: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * 判断用户是否已经登录
   * @returns boolean 是否已登录
   */
  isLogin: () => {
    const token = localStorage.getItem('authToken');
    return Boolean(token);
  },

  /**
   * 获取全局唯一的userId
   * @returns string | null 用户ID
   */
  getId: () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsedUserInfo = JSON.parse(userInfo);
        return parsedUserInfo.id;
      } catch (e) {
        console.error('解析用户信息失败:', e);
        return null;
      }
    }
    return null;
  },

  /**
   * 获取用户名
   * @returns string | null 用户名
   */
  getName: () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsedUserInfo = JSON.parse(userInfo);
        return parsedUserInfo.name;
      } catch (e) {
        console.error('解析用户信息失败:', e);
        return null;
      }
    }
    return null;
  },

  /**
   * 获取用户信息
   * @returns any | null 用户信息
   */
  getInfo: () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error('解析用户信息失败:', e);
        return null;
      }
    }
    return null;
  },

  /**
   * 退出登录
   */
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
  },
};

/**
 * HTTP 工具函数
 */
export const http = {
  /**
   * 获取通用 HTTP 头
   * @returns HttpHeaders HTTP 头对象
   */
  getCommonHeaders: () => {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };
  },

  /**
   * 获取基础 URL
   * @returns string 基础 URL
   */
  getBaseUrl: (): string => {
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
  },

  /**
   * 统一 API 调用函数
   * @param url API 地址
   * @param options 请求选项
   * @returns Promise<T> 响应数据
   */
  async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
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
  },
};

/**
 * 表单验证工具函数
 */
export const validation = {
  /**
   * 验证必填字段
   * @param value 字段值
   * @returns boolean 是否有效
   */
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns boolean 是否有效
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证手机号码格式
   * @param phone 手机号码
   * @returns boolean 是否有效
   */
  phone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  /**
   * 验证字符串长度
   * @param value 字符串值
   * @param min 最小长度
   * @param max 最大长度
   * @returns boolean 是否有效
   */
  length: (value: string, min: number, max: number): boolean => {
    if (typeof value !== 'string') return false;
    const length = value.trim().length;
    return length >= min && length <= max;
  },
};

/**
 * React 工具函数
 */
export const react = {
  /**
   * 处理API响应
   * @param response API响应对象
   * @param onSuccess 成功回调
   * @param onError 失败回调
   * @returns boolean 是否成功
   */
  handleApiResponse: <T = any>(
    response: { success: boolean; data?: T; error?: string },
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): boolean => {
    if (response.success) {
      if (onSuccess) onSuccess(response.data as T);
      return true;
    } else {
      if (onError) onError(response.error || '操作失败');
      return false;
    }
  },

  /**
   * 创建异步加载函数
   * @param asyncFn 异步函数
   * @param setLoading 设置加载状态的函数
   * @param setError 设置错误状态的函数
   * @returns 包装后的异步函数
   */
  withLoading: <T extends any[]>(
    asyncFn: (...args: T) => Promise<any>,
    setLoading: (loading: boolean) => void,
    setError?: (error: string | null) => void
  ) => {
    return async (...args: T) => {
      try {
        setLoading(true);
        if (setError) setError(null);
        return await asyncFn(...args);
      } catch (error: any) {
        const errorMessage = error?.message || '操作失败，请稍后再试';
        if (setError) setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    };
  },
};
