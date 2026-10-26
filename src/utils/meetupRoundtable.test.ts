import { describe, expect, it } from 'vitest';
import { getCurrentRoundtableDate } from './meetupRoundtable';
import type { Meetup } from '../netlify/functions/meetup';

const weekly = {
  id: '39',
  mode: 'online',
  is_recurring: true,
  status: 'active',
  datetime: '2026-04-25T00:00:00+00:00',
  recurrence_day: 6,
  episode_start_date: '2026-01-10',
} as Meetup;
const now = new Date('2026-10-26T18:00:00Z');

describe('weekly meetup roundtable', () => {
  it.each([null, '2026-10-30', '2026-10-31'])(
    'maps current calendar link %s to the Beijing session date',
    (date) => {
      expect(getCurrentRoundtableDate(weekly, date, now)).toBe('2026-10-31');
    }
  );
  it.each(['2026-10-23', '2026-10-24', '2026-11-06', '2026-11-07', 'invalid'])(
    'does not show the current roundtable on another occurrence: %s',
    (date) => {
      expect(getCurrentRoundtableDate(weekly, date, now)).toBeNull();
    }
  );
  it('excludes the ordinary recurring activity, even with episode configuration', () => {
    expect(
      getCurrentRoundtableDate({ ...weekly, id: '68' }, '2026-11-01', now)
    ).toBeNull();
    expect(
      getCurrentRoundtableDate({ ...weekly, id: '68' }, null, now)
    ).toBeNull();
  });
  it.each([
    { mode: 'offline' },
    { is_recurring: false },
    { status: 'cancelled' },
    { episode_start_date: undefined },
    { datetime: 'invalid' },
  ])('requires an active configured online sharing series: %o', (overrides) => {
    expect(
      getCurrentRoundtableDate({ ...weekly, ...overrides }, null, now)
    ).toBeNull();
  });
  it('advances after the weekly meeting starts', () => {
    const after = new Date('2026-10-31T03:00:00Z');
    expect(getCurrentRoundtableDate(weekly, '2026-10-30', after)).toBeNull();
    expect(getCurrentRoundtableDate(weekly, null, after)).toBe('2026-11-07');
  });
});
