import type { Meetup } from '../netlify/functions/meetup';
import { hasMeetupEpisodes } from './meetupParticipantCount';
import { formatBeijingDateStr, nextUTCOccurrenceDate } from './recurring';

// The roundtable belongs to the weekly sharing series, not all online meetups.
export function getCurrentRoundtableDate(
  meetup: Meetup,
  requestedDate: string | null,
  now: Date = new Date()
): string | null {
  if (
    Number(meetup.id) !== 39 ||
    meetup.mode !== 'online' ||
    !hasMeetupEpisodes(meetup) ||
    meetup.status !== 'active'
  )
    return null;

  const occurrence = nextUTCOccurrenceDate(meetup.datetime, now);
  if (Number.isNaN(occurrence.getTime())) return null;
  const sessionDate = formatBeijingDateStr(occurrence);
  // Calendar links use the viewer's local date. Accept all calendar dates of
  // this instant (UTC-12 through UTC+14), then use Beijing's date for APIs.
  const dateAt = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(occurrence);
  const aliases = [
    sessionDate,
    dateAt('Etc/GMT+12'),
    dateAt('Pacific/Kiritimati'),
  ];
  return !requestedDate || aliases.includes(requestedDate) ? sessionDate : null;
}
