import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const isUpcomingEvent = (dateString: string): boolean => {
  return dayjs(dateString).isAfter(dayjs());
};

export const formatDateTime = (
  data: string | Date,
  format = 'YYYY-MM-DD HH:mm'
): string => {
  if (!data) return '';
  const d = typeof data === 'string' && data.includes('T')
    ? dayjs.utc(data)
    : dayjs(data);
  return d.format(format);
};

export const formatDate = (
  data: string | Date,
  format = 'YYYY-MM-DD'
): string => {
  if (!data) return '';
  const d = typeof data === 'string' && data.includes('T')
    ? dayjs.utc(data)
    : dayjs(data);
  return d.format(format);
};

export const formatDateCN = (
  data: string | Date,
  format = 'YYYY年MM月DD日'
): string => {
  if (!data) return '';
  const d = typeof data === 'string' && data.includes('T')
    ? dayjs.utc(data)
    : dayjs(data);
  return d.format(format);
};

export const formatTime = (
  data: string | Date,
  format = 'HH:mm'
): string => {
  if (!data) return '';
  const d = typeof data === 'string' && data.includes('T')
    ? dayjs.utc(data)
    : dayjs(data);
  return d.format(format);
};

export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区';
  } catch {
    return '本地时区';
  }
};

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