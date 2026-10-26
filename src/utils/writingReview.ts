// Calendar weeks follow Asia/Shanghai, independent of the browser/server timezone.
const DAY = 86400000;
export function writingWeek(now = new Date(), offset = 0) {
  const local = new Date(now.getTime() + 8 * 3600000);
  const monday =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    ((local.getUTCDay() + 6) % 7) * DAY +
    offset * 7 * DAY;
  return new Date(monday).toISOString().slice(0, 10);
}
export function reviewWeekRange(week: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error('回看周日期无效');
  const date = new Date(`${week}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== week ||
    date.getUTCDay() !== 1
  ) {
    throw new Error('请选择周一作为回看起始日期');
  }
  const start = date.getTime() - 8 * 3600000;
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + 7 * DAY).toISOString(),
    lastDay: new Date(date.getTime() + 6 * DAY).toISOString().slice(0, 10),
  };
}
export function escapeWritingKeyword(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}
