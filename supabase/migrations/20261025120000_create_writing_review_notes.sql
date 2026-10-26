begin;

-- Match the deployed IDs without assuming users/posts use bigint or UUID.
create table public.writing_review_notes as
select user_id, id as post_id, ''::text as discovery,
       now() as created_at, now() as updated_at
from public.writing_posts with no data;
alter table public.writing_review_notes
  alter column user_id set not null,
  alter column post_id set not null,
  alter column discovery set not null,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now(),
  add primary key (user_id, post_id),
  add constraint writing_review_note_length check (char_length(btrim(discovery)) between 1 and 4000),
  add foreign key (user_id) references public.users(id) on delete cascade,
  add foreign key (post_id) references public.writing_posts(id) on delete cascade;
-- Only authenticated Netlify Functions may access discoveries. Browser JWTs use
-- a separate identity mapping, so do not add a permissive auth.uid() policy.
alter table public.writing_review_notes enable row level security;
revoke all on public.writing_review_notes from public, anon, authenticated;
grant select, insert, update, delete on public.writing_review_notes to service_role;

create index if not exists writing_posts_owner_week_idx
  on public.writing_posts(user_id, created_at, id) where status = 'published';
-- Supports Chinese substring searches without tokenization or AI.
create extension if not exists pg_trgm;
create index if not exists writing_posts_title_trgm_idx
  on public.writing_posts using gin(title gin_trgm_ops);
commit;
