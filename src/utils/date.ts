import dayjs from 'dayjs';

export const isUpcomingEvent = (dateString: string): boolean => {
  return dayjs(dateString).isAfter(dayjs());
};

export const formatDateTime = (
  data: string | Date,
  format = 'YYYY-MM-DD HH:mm'
): string => {
  if (!data) return '';
  return dayjs(data).format(format);
};

export const formatDate = (
  data: string | Date,
  format = 'YYYY-MM-DD'
): string => {
  if (!data) return '';
  return dayjs(data).format(format);
};

export const formatTime = (
  data: string | Date,
  format = 'HH:mm'
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
