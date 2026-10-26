import { describe, expect, it } from 'vitest';
import type { Meetup } from '../netlify/functions/meetup';
import {
  getMeetupParticipantCount,
  hasMeetupEpisodes,
} from './meetupParticipantCount';

const base: Meetup = {
  id: '68',
  title: '看见生活实验室',
  description: '',
  datetime: '2026-11-01T15:00:00Z',
  wechat_id: '',
  mode: 'online',
  cover: '',
  creator: '',
  is_recurring: true,
  recurrence_day: 0,
  participant_count: 3,
};
describe('meetup registration counts', () => {
  it('shows actual registrations for recurring meetups without episode setup', () => {
    expect(hasMeetupEpisodes(base)).toBe(false);
    expect(getMeetupParticipantCount(base, {})).toBe(3);
    expect(
      getMeetupParticipantCount(
        { ...base, episode_start_date: null } as unknown as Meetup,
        {}
      )
    ).toBe(3);
  });
  it('uses the same complete configuration for loading and displaying episode counts', () => {
    const configured = { ...base, episode_start_date: '2026-11-01' };
    expect(hasMeetupEpisodes(configured)).toBe(true);
    expect(getMeetupParticipantCount(configured, { '68': 2 })).toBe(2);
    expect(
      getMeetupParticipantCount(
        { ...configured, recurrence_day: undefined },
        {}
      )
    ).toBe(3);
    expect(
      hasMeetupEpisodes({
        ...configured,
        recurrence_day: null,
      } as unknown as Meetup)
    ).toBe(false);
  });
  it('does not substitute historical registrations for a genuinely empty current episode', () => {
    const configured = {
      ...base,
      episode_start_date: '2026-11-01',
      participant_count: 50,
    };
    expect(getMeetupParticipantCount(configured, { '68': 0 })).toBe(0);
    expect(getMeetupParticipantCount(configured, {})).toBe(0);
  });
  it('uses the total for non-recurring events even when an episode count exists', () => {
    expect(
      getMeetupParticipantCount(
        { ...base, is_recurring: false, episode_start_date: '2026-11-01' },
        { '68': 0 }
      )
    ).toBe(3);
  });
  it('defaults genuinely absent counts to zero', () => {
    expect(
      getMeetupParticipantCount({ ...base, participant_count: undefined }, {})
    ).toBe(0);
  });
});
