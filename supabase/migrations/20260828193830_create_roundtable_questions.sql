create table if not exists public.roundtable_questions (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  question text not null,
  context text not null,
  boundaries text,
  available_dates text[] not null default '{}',
  other_availability text,
  status text not null default 'open',
  scheduled_session text,
  request_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roundtable_questions_name_length
    check (char_length(btrim(name)) between 1 and 80),
  constraint roundtable_questions_email_length
    check (char_length(btrim(email)) between 3 and 320),
  constraint roundtable_questions_question_length
    check (char_length(btrim(question)) between 5 and 500),
  constraint roundtable_questions_context_length
    check (char_length(btrim(context)) between 10 and 5000),
  constraint roundtable_questions_boundaries_length
    check (boundaries is null or char_length(btrim(boundaries)) <= 2000),
  constraint roundtable_questions_other_availability_length
    check (
      other_availability is null
      or char_length(btrim(other_availability)) <= 500
    ),
  constraint roundtable_questions_status_valid
    check (status in ('open', 'contacted', 'scheduled', 'completed', 'hidden')),
  constraint roundtable_questions_scheduled_session_length
    check (
      scheduled_session is null
      or char_length(btrim(scheduled_session)) <= 120
    )
);

create index if not exists roundtable_questions_public_idx
  on public.roundtable_questions (created_at desc, id desc)
  where status <> 'hidden';

create index if not exists roundtable_questions_admin_status_idx
  on public.roundtable_questions (status, created_at desc, id desc);

create index if not exists roundtable_questions_rate_limit_idx
  on public.roundtable_questions (request_fingerprint, created_at desc)
  where request_fingerprint is not null;

alter table public.roundtable_questions enable row level security;

revoke all on table public.roundtable_questions from anon, authenticated;
revoke all on sequence public.roundtable_questions_id_seq from anon, authenticated;
grant select, insert, update, delete on table public.roundtable_questions to service_role;
grant usage, select on sequence public.roundtable_questions_id_seq to service_role;

comment on table public.roundtable_questions is
  'Questions submitted for the Inspire Planet question roundtable. Public reads are served through a Netlify Function that selects only non-sensitive fields.';

comment on column public.roundtable_questions.request_fingerprint is
  'One-way hash used only for short-window abuse prevention.';
