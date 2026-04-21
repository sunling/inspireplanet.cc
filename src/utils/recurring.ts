import dayjs from 'dayjs';

// 从 meetup datetime 推算本地时区下的星期几
export function getLocalRecurrenceDay(datetime: string): number {
  return dayjs(datetime).day();
}

// 计算循环活动的下次举办时间（本地时区）
export function getNextOccurrence(datetime: string): dayjs.Dayjs {
  const base = dayjs(datetime);
  const recurrenceDay = base.day(); // 本地星期几
  const now = dayjs();
  const todayDow = now.day();
  let daysUntil = (recurrenceDay - todayDow + 7) % 7;
  if (daysUntil === 0) {
    const todayOccurrence = now.hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
    if (todayOccurrence.isBefore(now)) daysUntil = 7;
  }
  return now.add(daysUntil, 'day').hour(base.hour()).minute(base.minute()).second(0).millisecond(0);
}

// 计算期数
export function getEpisodeNumber(episodeStartDate: string, targetDate: dayjs.Dayjs): number {
  const start = dayjs(episodeStartDate).startOf('day');
  const target = targetDate.startOf('day');
  return Math.round(target.diff(start, 'day') / 7) + 1;
}

// 本地 YYYY-MM-DD 字符串
export function toLocalDateStr(d: dayjs.Dayjs): string {
  return d.format('YYYY-MM-DD');
}

// 用 UTC 星期几计算下一次发生日期（YYYY-MM-DD），避免本地时区导致日期偏移
export function nextUTCOccurrenceDateStr(datetimeISO: string): string {
  const base = new Date(datetimeISO);
  const baseDay = base.getUTCDay();
  const now = new Date();
  let daysUntil = (baseDay - now.getUTCDay() + 7) % 7;
  if (daysUntil === 0) {
    const todayOccurrence = new Date(now);
    todayOccurrence.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
    if (todayOccurrence <= now) daysUntil = 7;
  }
  const next = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}
