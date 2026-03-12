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

/**
 * 清理用户输入以防止XSS攻击
 * @param input 输入字符串
 * @param maxLength 最大允许长度
 * @returns 清理后的字符串
 */
export const sanitizeInput = (input: string | undefined, maxLength: number): string => {
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
};
