create table if not exists public.treehole_questions (
  id bigint generated always as identity primary key,
  content text not null check (char_length(content) between 10 and 2000),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.treehole_question_contacts (
  question_id bigint primary key references public.treehole_questions(id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.treehole_responses (
  id bigint generated always as identity primary key,
  question_id bigint not null references public.treehole_questions(id) on delete cascade,
  content text not null check (char_length(content) between 2 and 2000),
  nickname text not null default '一位路过的人' check (char_length(nickname) between 1 and 40),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists treehole_questions_visible_created_idx
  on public.treehole_questions (is_visible, created_at desc);

create index if not exists treehole_responses_question_created_idx
  on public.treehole_responses (question_id, is_visible, created_at asc);

alter table public.treehole_questions enable row level security;
alter table public.treehole_question_contacts enable row level security;
alter table public.treehole_responses enable row level security;

revoke all on public.treehole_questions from anon, authenticated;
revoke all on public.treehole_question_contacts from anon, authenticated;
revoke all on public.treehole_responses from anon, authenticated;

grant select, insert, update, delete on public.treehole_questions to service_role;
grant select, insert, update, delete on public.treehole_question_contacts to service_role;
grant select, insert, update, delete on public.treehole_responses to service_role;
grant usage, select on all sequences in schema public to service_role;
