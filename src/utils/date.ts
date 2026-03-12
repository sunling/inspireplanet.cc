import dayjs from 'dayjs';

/**
 * 检查活动是否即将举行
 * @param dateString 日期字符串
 * @returns boolean 是否即将举行
 */
export const isUpcomingEvent = (dateString: string): boolean => {
  return new Date(dateString) > new Date();
};

/**
 * 格式化时间
 * @param data 时间字符串 | Date对象
 * @param format 时间格式，如HH:mm:ss
 * @returns string 格式化后的时间
 */
export const formatDateTime = (
  data: string | Date,
  format = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!data) return '';
  return dayjs(data).format(format);
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
 * 格式化时间
 * @param data 时间字符串 | Date对象
 * @param format 时间格式，如'HH:mm:ss'
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
 * 获取用户时区
 * @returns string 用户时区
 */
export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区';
  } catch {
    return '本地时区';
  }
};

/**
 * 按日期分组卡片
 * @param cards 卡片数组
 * @returns 按日期分组的对象
 */
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
