import dayjs from 'dayjs';
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
 * @param data 时间字符串 | Date对象
 * @param format 时间格式，如HH:mm:ss
 * @returns string 格式化后的时间
 */
export const formatTime = (
  data: string | Date,
  format = 'HH:mm:ss'
): string => {
  if (!data) return '';

  return dayjs(data).format(format);
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
 * @param data 日期字符串 | Date对象
 * @param format 日期格式，如'YYYY-MM-DD'
 * @returns string 格式化后的日期
 */
export const formatDate = (
  data: string | Date,
  format = 'YYYY-MM-DD'
): string => {
  if (!data) return '';

  return dayjs(data).format(format);
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

// 获取当前登录用户信息
export const getCurrentUser = (): {
  username?: string;
  wechatId?: string;
  email?: string;
  name?: string;
} | null => {
  try {
    // 尝试从localStorage获取用户信息，支持多种存储键名
    const userStr =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (e) {
    console.error('解析用户信息失败:', e);
    return null;
  }
};
