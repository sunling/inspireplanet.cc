import dayjs from 'dayjs';

function parseDatePartsToUTCNoon(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export function formatBeijingDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

// 用 UTC 计算下一次发生的时间点（不受浏览器夏令时/冬令时切换影响）
export function nextUTCOccurrenceDate(
  datetimeISO: string,
  now: Date = new Date()
): Date {
  const base = new Date(datetimeISO);
  const baseDay = base.getUTCDay();
  let daysUntil = (baseDay - now.getUTCDay() + 7) % 7;
  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntil,
      base.getUTCHours(),
      base.getUTCMinutes(),
      0,
      0
    )
  );
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate;
}

// 从 meetup datetime 推算当前季节本地时区下的星期几
export function getLocalRecurrenceDay(
  datetime: string,
  now: Date = new Date()
): number {
  return getNextOccurrence(datetime, now).day();
}

// 计算循环活动的下次举办时间（按 UTC 锚定后再转为当前本地时区，自动适配夏/冬令时）
export function getNextOccurrence(
  datetime: string,
  now: Date = new Date()
): dayjs.Dayjs {
  return dayjs(nextUTCOccurrenceDate(datetime, now));
}

// 计算期数（基于日历天数差，避免跨夏令时/冬令时或跨时区导致偏差）
export function getEpisodeNumber(
  episodeStartDate: string,
  targetDate: dayjs.Dayjs | Date | string
): number {
  const startNoon = parseDatePartsToUTCNoon(episodeStartDate);
  const targetStr =
    typeof targetDate === 'string'
      ? targetDate
      : dayjs(targetDate).format('YYYY-MM-DD');
  const targetNoon = parseDatePartsToUTCNoon(targetStr);
  const diffDays = (targetNoon - startNoon) / (24 * 60 * 60 * 1000);
  return Math.round(diffDays / 7) + 1;
}

// 计算当前已经开始（含开场前 2 小时预热窗口）的最新一期信息
export function getLatestActiveEpisode(
  datetimeISO: string,
  episodeStartDate: string,
  now: Date = new Date(),
  leadWindowMs: number = 2 * 60 * 60 * 1000
): { episodeNumber: number; year: number; dateStr: string } | null {
  const base = new Date(datetimeISO);
  if (Number.isNaN(base.getTime()) || !episodeStartDate) return null;

  const shiftedNow = new Date(now.getTime() + leadWindowMs);
  const baseDay = base.getUTCDay();
  const daysSince = (shiftedNow.getUTCDay() - baseDay + 7) % 7;
  const latestOccurrence = new Date(
    Date.UTC(
      shiftedNow.getUTCFullYear(),
      shiftedNow.getUTCMonth(),
      shiftedNow.getUTCDate() - daysSince,
      base.getUTCHours(),
      base.getUTCMinutes(),
      0,
      0
    )
  );
  if (latestOccurrence.getTime() > shiftedNow.getTime()) {
    latestOccurrence.setUTCDate(latestOccurrence.getUTCDate() - 7);
  }

  const dateStr = formatBeijingDateStr(latestOccurrence);
  const episodeNumber = getEpisodeNumber(episodeStartDate, dateStr);
  if (episodeNumber < 1) return null;

  const year = Number(dateStr.slice(0, 4));
  return { episodeNumber, year, dateStr };
}

// 本地 YYYY-MM-DD 字符串
export function toLocalDateStr(d: dayjs.Dayjs): string {
  return d.format('YYYY-MM-DD');
}

// 用 UTC 星期几计算下一次发生日期（北京时间 YYYY-MM-DD），避免本地时区导致日期偏移
export function nextUTCOccurrenceDateStr(
  datetimeISO: string,
  now: Date = new Date()
): string {
  return formatBeijingDateStr(nextUTCOccurrenceDate(datetimeISO, now));
}
