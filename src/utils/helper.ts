/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeInput(
  input: string | undefined,
  maxLength: number
): string {
  if (!input) return '';

  // Trim leading/trailing spaces
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return sanitized;
}

// 按日期分组卡片
export const groupCardsByDate = (cards: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};

  cards.forEach((card) => {
    const date = new Date(card.created || '').toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(card);
  });

  return grouped;
};

/**
 * 将驼峰命名转换为蛇形命名
 * @param input - 输入值（字符串、对象或数组）
 * @returns 转换后的值
 */
export function camelToSnake(
  input: string | Record<string, any> | any[] | any
): string | Record<string, any> | any[] | any {
  if (typeof input === 'string') {
    return input.replace(/([A-Z])/g, '_$1').toLowerCase();
  } else if (Array.isArray(input)) {
    return input.map((item) => camelToSnake(item));
  } else if (typeof input === 'object' && input !== null) {
    const result: Record<string, any> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = camelToSnake(input[key]);
      }
    }
    return result;
  }
  return input;
}

/**
 * 将蛇形命名转换为驼峰命名
 * @param input - 输入值（字符串、对象或数组）
 * @returns 转换后的值
 */
export function snakeToCamel(
  input: string | Record<string, any> | any[] | any
): string | Record<string, any> | any[] | any {
  if (typeof input === 'string') {
    return input.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  } else if (Array.isArray(input)) {
    return input.map((item) => snakeToCamel(item));
  } else if (typeof input === 'object' && input !== null) {
    const result: Record<string, any> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
          letter.toUpperCase()
        );
        result[camelKey] = snakeToCamel(input[key]);
      }
    }
    return result;
  }
  return input;
}
