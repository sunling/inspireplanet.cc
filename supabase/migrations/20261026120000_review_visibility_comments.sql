begin;
-- Both publication and later visibility changes synchronize the response in
-- the same database statement; no private review excerpt stays published.
create or replace function public.sync_writing_review_comment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.writing_type <> 'review' then return new; end if;
  if new.visibility <> 'public' or new.status <> 'published' or new.review_source_id is null then
    update public.writing_comments set status = 'hidden' where review_post_id = new.id;
    return new;
  end if;
  perform id from public.writing_posts where id = new.review_source_id and user_id = new.user_id;
  if not found then raise exception 'Invalid review source owner'; end if;
  insert into public.writing_comments(post_id, user_id, parent_id, content, anonymous_alias, status, review_post_id)
    values(new.review_source_id, new.user_id, null,
      '【作者回看】' || E'\n' || left(new.body, 440) ||
        case when char_length(new.body) > 440 then E'\n…完整感想见回看书写' else '' end,
      null, 'published', new.id)
    on conflict (review_post_id) do update set
      content = excluded.content, status = 'published', anonymous_alias = null;
  return new;
end $$;
revoke all on function public.sync_writing_review_comment() from public, anon, authenticated;
create trigger sync_writing_review_comment
  after insert or update of writing_type, review_source_id, visibility, status, body
  on public.writing_posts for each row execute function public.sync_writing_review_comment();

-- Retire the old public-only signature. Old callers still use the public default.
drop function public.publish_writing_review(bigint, bigint, bigint, text, jsonb);
create function public.publish_writing_review(
  p_post_id bigint, p_user_id bigint, p_source_id bigint,
  p_editor_mode text, p_body_rich jsonb, p_visibility text default 'public'
) returns bigint language plpgsql security definer set search_path = public
as $$
declare review_row public.writing_posts%rowtype;
begin
  if p_visibility not in ('public', 'private') or p_visibility is null then raise exception 'Invalid review visibility'; end if;
  if p_post_id = p_source_id then raise exception 'A review cannot reference itself'; end if;
  perform id from public.writing_posts
    where id = p_source_id and user_id = p_user_id and status = 'published' for key share;
  if not found then raise exception 'Review source is unavailable or belongs to another author'; end if;
  select * into review_row from public.writing_posts
    where id = p_post_id and user_id = p_user_id and status = 'published' for update;
  if not found then raise exception 'Review is unavailable or belongs to another author'; end if;
  if review_row.review_source_id is not null and review_row.review_source_id <> p_source_id then
    raise exception 'Cannot change the review source';
  end if;
  update public.writing_posts set writing_type = 'review', review_source_id = p_source_id,
    visibility = p_visibility, is_anonymous = false, group_id = null,
    editor_mode = p_editor_mode, body_rich = p_body_rich where id = p_post_id;
  return p_post_id;
end $$;
revoke all on function public.publish_writing_review(bigint, bigint, bigint, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.publish_writing_review(bigint, bigint, bigint, text, jsonb, text) to service_role;
-- Hide any previously published response whose review is already private.
update public.writing_comments c set status = 'hidden'
  from public.writing_posts p where c.review_post_id = p.id
  and (p.visibility <> 'public' or p.status <> 'published');
commit;
