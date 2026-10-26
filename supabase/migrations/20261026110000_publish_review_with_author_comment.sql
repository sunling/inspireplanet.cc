begin;
-- Include the review metadata prerequisites for databases upgraded directly.
alter table public.writing_posts add column if not exists writing_type text not null default 'original'
  check (writing_type in ('original', 'review'));
do $$
declare id_type text;
begin
  select format_type(atttypid, atttypmod) into id_type from pg_attribute
    where attrelid = 'public.writing_posts'::regclass and attname = 'id';
  execute format('alter table public.writing_posts add column if not exists review_source_id %s references public.writing_posts(id) on delete set null', id_type);
  execute format('alter table public.writing_comments add column if not exists review_post_id %s references public.writing_posts(id) on delete cascade unique', id_type);
end $$;
create index if not exists writing_posts_review_owner_idx on public.writing_posts(user_id, created_at desc)
  where writing_type = 'review';

-- Publish the prepared review and its author's response in one transaction.
-- Calling again for the same review cannot create a second response.
create or replace function public.publish_writing_review(
  p_post_id bigint, p_user_id bigint, p_source_id bigint,
  p_editor_mode text, p_body_rich jsonb
) returns bigint
language plpgsql security definer set search_path = public
as $$
declare review_row public.writing_posts%rowtype;
begin
  if p_post_id = p_source_id then raise exception 'A review cannot reference itself'; end if;
  perform id from public.writing_posts
    where id = p_source_id and user_id = p_user_id and status = 'published'
    for key share;
  if not found then raise exception 'Review source is unavailable or belongs to another author'; end if;
  select * into review_row from public.writing_posts
    where id = p_post_id and user_id = p_user_id and status = 'published' for update;
  if not found then raise exception 'Review is unavailable or belongs to another author'; end if;
  if review_row.review_source_id is not null and review_row.review_source_id <> p_source_id then
    raise exception 'Cannot change the review source';
  end if;
  update public.writing_posts set writing_type = 'review', review_source_id = p_source_id,
    visibility = 'public', is_anonymous = false, group_id = null,
    editor_mode = p_editor_mode, body_rich = p_body_rich
    where id = p_post_id;
  insert into public.writing_comments(post_id, user_id, parent_id, content, anonymous_alias, status, review_post_id)
    values(p_source_id, p_user_id, null,
      '【作者回看】' || E'\n' || left(review_row.body, 440) ||
        case when char_length(review_row.body) > 440 then E'\n…完整感想见回看书写' else '' end,
      null, 'published', p_post_id)
    on conflict (review_post_id) do nothing;
  return p_post_id;
end $$;
revoke all on function public.publish_writing_review(bigint, bigint, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_writing_review(bigint, bigint, bigint, text, jsonb) to service_role;
commit;
