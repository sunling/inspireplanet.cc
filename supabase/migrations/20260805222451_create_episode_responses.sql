create table if not exists public.episode_responses (
  id bigint generated always as identity primary key,
  meetup_id bigint not null references public.meetups(id) on delete cascade,
  episode_number integer not null,
  content text not null,
  author text not null default '匿名',
  status text not null default 'published',
  request_fingerprint text,
  created_at timestamptz not null default now(),
  constraint episode_responses_episode_number_positive
    check (episode_number > 0),
  constraint episode_responses_content_length
    check (char_length(btrim(content)) between 1 and 500),
  constraint episode_responses_author_length
    check (char_length(btrim(author)) between 1 and 24),
  constraint episode_responses_status_valid
    check (status in ('published', 'hidden'))
);

create index if not exists episode_responses_wall_idx
  on public.episode_responses
  (meetup_id, episode_number, status, created_at, id);

create index if not exists episode_responses_rate_limit_idx
  on public.episode_responses
  (request_fingerprint, created_at)
  where request_fingerprint is not null;

alter table public.episode_responses enable row level security;

revoke all on table public.episode_responses from anon, authenticated;
revoke all on sequence public.episode_responses_id_seq from anon, authenticated;

comment on table public.episode_responses is
  'Public, opt-in responses submitted after an Inspire Planet episode.';

comment on column public.episode_responses.request_fingerprint is
  'One-way hash used only for short-window abuse prevention.';
