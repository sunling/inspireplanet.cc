import { describe, expect, it } from 'vitest';
import { validateParticipationPeriods } from '../utils/participationPeriods';

describe('participation periods', () => {
  it('supports repeat participation, editing, and clearing all periods', () => {
    expect(
      validateParticipationPeriods([
        { start_date: '2026-01-01', end_date: '2026-01-31' },
        { start_date: '2026-03-01', end_date: '2026-03-31' },
      ])
    ).toBeNull();
    expect(validateParticipationPeriods([])).toBeNull();
    expect(
      validateParticipationPeriods([
        { start_date: '2028-02-29', end_date: '2028-02-29' },
      ])
    ).toBeNull();
  });
  it('rejects missing, malformed, impossible, and reversed dates', () => {
    for (const date of [
      '',
      '2026-02-29',
      '2026-04-31',
      '2026-1-01',
      'invalid',
      null,
    ]) {
      expect(
        validateParticipationPeriods([
          { start_date: date, end_date: '2026-12-31' },
        ])
      ).not.toBeNull();
    }
    expect(
      validateParticipationPeriods([
        { start_date: '2026-02-01', end_date: '2026-01-01' },
      ])
    ).not.toBeNull();
    expect(validateParticipationPeriods([null])).not.toBeNull();
    expect(validateParticipationPeriods({})).not.toBeNull();
    expect(
      validateParticipationPeriods(
        Array(101).fill({ start_date: '2026-01-01', end_date: '2026-01-01' })
      )
    ).not.toBeNull();
  });
});
