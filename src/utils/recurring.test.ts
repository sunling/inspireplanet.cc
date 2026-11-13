import { describe, expect, it } from 'vitest';
import { getEpisodeDatetime } from './recurring';

describe('getEpisodeDatetime', () => {
  it('uses the selected date and preserves the Beijing meeting time', () => {
    expect(
      getEpisodeDatetime('2026-04-25T00:00:00Z', '2026-11-14')
    ).toBe('2026-11-14T00:00:00.000Z');
  });

  it('uses the previous UTC day for an early morning Beijing meeting', () => {
    expect(
      getEpisodeDatetime('2026-04-24T17:30:00Z', '2026-11-14')
    ).toBe('2026-11-13T17:30:00.000Z');
  });
});
