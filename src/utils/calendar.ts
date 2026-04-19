import { Meetup } from '../netlify/functions/meetup';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export function downloadICS(meetup: Meetup, eventDate?: dayjs.Dayjs) {
  const meetupTime = dayjs(meetup.datetime);
  const start = eventDate
    ? eventDate.hour(meetupTime.hour()).minute(meetupTime.minute()).second(0).millisecond(0)
    : meetupTime;
  const durationHours = meetup.duration ? Number(meetup.duration) : 1;
  const end = start.add(durationHours, 'hour');

  const fmt = (d: dayjs.Dayjs) => d.utc().format('YYYYMMDDTHHmmss') + 'Z';
  const escape = (s: string) => s.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//启发星球//inspireplanet.cc//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(meetup.title)}`,
    meetup.description ? `DESCRIPTION:${escape(meetup.description)}` : '',
    meetup.location ? `LOCATION:${escape(meetup.location)}` : '',
    `URL:${window.location.href}`,
    `UID:inspireplanet-meetup-${meetup.id}-${start.valueOf()}@inspireplanet.cc`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meetup.title.replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
