import { describe, expect, it } from 'vitest';
import {
  escapeWritingKeyword,
  reviewWeekRange,
  writingWeek,
} from './writingReview';
describe('Shanghai calendar weeks', () => {
  it('switches weeks at Monday midnight in Shanghai', () => {
    expect(writingWeek(new Date('2026-10-25T15:59:59Z'))).toBe('2026-10-19');
    expect(writingWeek(new Date('2026-10-25T16:00:00Z'))).toBe('2026-10-26');
  });
  it('handles year boundaries and previous weeks', () => {
    expect(writingWeek(new Date('2026-01-01T00:00:00Z'))).toBe('2025-12-29');
    expect(writingWeek(new Date('2026-10-19T04:00:00Z'), -1)).toBe(
      '2026-10-12'
    );
  });
  it('returns a half-open UTC interval without losing Sunday night', () => {
    expect(reviewWeekRange('2026-10-19')).toEqual({
      start: '2026-10-18T16:00:00.000Z',
      end: '2026-10-25T16:00:00.000Z',
      lastDay: '2026-10-25',
    });
  });
  it.each(['2026-02-30', '2026-10-25', 'bad', '2026-13-01'])(
    'rejects invalid week %s',
    (value) => {
      expect(() => reviewWeekRange(value)).toThrow();
    }
  );
});
describe('literal title matching', () => {
  it('escapes PostgreSQL wildcards and backslashes without changing punctuation or Chinese', () => {
    expect(escapeWritingKeyword('成长, (100%)_\\')).toBe(
      '成长, (100\\%)\\_\\\\'
    );
  });
});
