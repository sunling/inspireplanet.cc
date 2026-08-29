alter table public.roundtable_questions
  alter column email drop not null,
  alter column context set default '';

alter table public.roundtable_questions
  drop constraint if exists roundtable_questions_email_length,
  add constraint roundtable_questions_email_length
    check (
      email is null
      or char_length(btrim(email)) between 3 and 320
    ),
  drop constraint if exists roundtable_questions_context_length,
  add constraint roundtable_questions_context_length
    check (char_length(btrim(context)) <= 5000);

create table if not exists public.roundtable_question_supports (
  id bigint generated always as identity primary key,
  question_id bigint not null
    references public.roundtable_questions(id) on delete cascade,
  supporter_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint roundtable_question_supports_unique
    unique (question_id, supporter_fingerprint)
);

create index if not exists roundtable_question_supports_question_idx
  on public.roundtable_question_supports (question_id, created_at desc);

alter table public.roundtable_question_supports enable row level security;

revoke all on table public.roundtable_question_supports from anon, authenticated;
revoke all on sequence public.roundtable_question_supports_id_seq
  from anon, authenticated;
grant select, insert, delete on table public.roundtable_question_supports
  to service_role;
grant usage, select on sequence public.roundtable_question_supports_id_seq
  to service_role;

comment on table public.roundtable_question_supports is
  'Anonymous one-per-browser support signals for public roundtable questions. Access is restricted to the server-side service role.';

comment on column public.roundtable_question_supports.supporter_fingerprint is
  'One-way hash of a browser-generated identifier; the raw identifier is never stored.';
