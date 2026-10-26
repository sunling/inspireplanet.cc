import type { Meetup } from '../netlify/functions/meetup';

// Recurring meetups can accept registrations without having per-episode setup.
// Only use episode counts when the same configuration is available to load them.
export function hasMeetupEpisodes(meetup: Meetup): boolean {
  return Boolean(
    meetup.is_recurring &&
    meetup.episode_start_date &&
    meetup.recurrence_day !== undefined &&
    meetup.recurrence_day !== null
  );
}

export function getMeetupParticipantCount(
  meetup: Meetup,
  episodeCounts: Record<string, number>
): number {
  return hasMeetupEpisodes(meetup)
    ? (episodeCounts[String(meetup.id)] ?? 0)
    : (meetup.participant_count ?? 0);
}
