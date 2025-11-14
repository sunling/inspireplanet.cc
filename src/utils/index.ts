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
