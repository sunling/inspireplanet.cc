/**
 * 验证必填字段
 * @param value 字段值
 * @returns boolean 是否有效
 */
export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns boolean 是否有效
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证手机号码格式
 * @param phone 手机号码
 * @returns boolean 是否有效
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证字符串长度
 * @param value 字符串值
 * @param min 最小长度
 * @param max 最大长度
 * @returns boolean 是否有效
 */
export const validateLength = (value: string, min: number, max: number): boolean => {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
};
