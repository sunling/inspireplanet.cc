export interface ParticipationPeriod {
  start_date: string;
  end_date: string;
}

export function validateParticipationPeriods(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 100)
    return '参与周期必须为列表，最多 100 个';
  for (const period of value) {
    for (const key of ['start_date', 'end_date']) {
      const date = period?.[key];
      if (
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        return '请填写有效的参与开始日和结束日';
    }
    if (period.start_date > period.end_date)
      return '参与开始日不能晚于参与结束日';
  }
  return null;
}
