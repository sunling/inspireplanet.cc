-- Expand writing posts from 3 images to 9 images.
-- Drop only the legacy count constraint; preserve unrelated URL validation.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'writing_posts'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%image_urls%'
      and (
        pg_get_constraintdef(c.oid) ilike '%array_length%'
        or pg_get_constraintdef(c.oid) ilike '%cardinality%'
      )
      and pg_get_constraintdef(c.oid) ~ '(^|[^0-9])3([^0-9]|$)'
  loop
    execute format(
      'alter table public.writing_posts drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.writing_posts
  drop constraint if exists writing_posts_image_urls_max_9;

alter table public.writing_posts
  add constraint writing_posts_image_urls_max_9
  check (
    image_urls is null
    or (
      jsonb_typeof(image_urls) = 'array'
      and jsonb_array_length(image_urls) <= 9
    )
  );
