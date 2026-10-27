-- Each registration can record multiple separate visits without duplicating the participant.
alter table public.meetup_rsvps
  add column if not exists participation_periods jsonb not null default '[]'::jsonb;

alter table public.meetup_rsvps
  add constraint meetup_rsvps_participation_periods_array
  check (jsonb_typeof(participation_periods) = 'array');

comment on column public.meetup_rsvps.participation_periods is
  'Ordered participation periods, each with start_date and end_date in YYYY-MM-DD format';
