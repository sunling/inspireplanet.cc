-- Apply before deploying scheduled newsletter code. Service role only.
begin;
alter table public.newsletter_campaigns
 add column if not exists auto_managed boolean not null default false,
 add column if not exists auto_paused boolean not null default false,
 add column if not exists auto_notice_at timestamptz,
 add column if not exists auto_notice_attempt_at timestamptz,
 add column if not exists auto_send_at timestamptz,
 add column if not exists auto_result_at timestamptz,
 add column if not exists auto_result_attempt_at timestamptz,
 add column if not exists auto_edited boolean not null default false;

create or replace function public.newsletter_auto_create(p_year integer,p_episode integer,p_subject text,p_document jsonb,p_html text,p_text text,p_hash text,p_from text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('newsletter-campaign:'||p_year||':'||p_episode,0));
 insert into public.newsletter_campaigns(year,episode,subject,document,body_html,body_text,content_hash,from_email,created_by,auto_managed)
 values(p_year,p_episode,p_subject,p_document,p_html,p_text,p_hash,p_from,'newsletter-automation',true)
 on conflict(year,episode) do nothing returning id into cid;
 if cid is not null then
 insert into public.newsletter_deliveries(campaign_id,subscriber_id,email,confirmed_at)
 select cid,id,email,confirmed_at from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null;
 end if;
 return cid;
end $$;

create or replace function public.newsletter_auto_start(p_id uuid,p_revision uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype;
begin
 select * into c from public.newsletter_campaigns where id=p_id for update;
 if c.id is null or not c.auto_managed or c.auto_paused or c.status<>'draft' or c.revision<>p_revision
 or c.auto_notice_at is null or c.auto_send_at is null or c.auto_send_at>now() or c.auto_notice_at>now()-interval '24 hours' then return false; end if;
 -- Capture the currently confirmed audience at the actual start, not at preview.
 delete from public.newsletter_deliveries where campaign_id=c.id;
 insert into public.newsletter_deliveries(campaign_id,subscriber_id,email,confirmed_at)
 select c.id,id,email,confirmed_at from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null;
 if not found then return false; end if;
 update public.newsletter_campaigns set status='sending',started_at=now() where id=c.id;
 return true;
end $$;

create or replace function public.newsletter_auto_edit(p_id uuid,p_revision uuid,p_subject text,p_document jsonb,p_html text,p_text text,p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.newsletter_campaigns set subject=p_subject,document=p_document,body_html=p_html,body_text=p_text,content_hash=p_hash,revision=gen_random_uuid(),auto_edited=true
 where id=p_id and revision=p_revision and status='draft' and auto_managed;
 return found;
end $$;

create or replace function public.newsletter_auto_pause(p_id uuid,p_revision uuid,p_paused boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.newsletter_campaigns set auto_paused=p_paused,revision=gen_random_uuid()
 where id=p_id and revision=p_revision and status='draft' and auto_managed;
 return found;
end $$;
revoke all on function public.newsletter_auto_create(integer,integer,text,jsonb,text,text,text,text),public.newsletter_auto_start(uuid,uuid),public.newsletter_auto_edit(uuid,uuid,text,jsonb,text,text,text),public.newsletter_auto_pause(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.newsletter_auto_create(integer,integer,text,jsonb,text,text,text,text),public.newsletter_auto_start(uuid,uuid),public.newsletter_auto_edit(uuid,uuid,text,jsonb,text,text,text),public.newsletter_auto_pause(uuid,uuid,boolean) to service_role;
-- Prevent an already-open manual editor from overwriting a newly created auto draft.
create or replace function public.newsletter_guard_auto_draft()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.auto_managed and new.created_by is distinct from old.created_by then
   raise exception 'Use scheduled draft editor';
 end if;
 return new;
end $$;
drop trigger if exists newsletter_guard_auto_draft on public.newsletter_campaigns;
create trigger newsletter_guard_auto_draft before update on public.newsletter_campaigns
for each row execute function public.newsletter_guard_auto_draft();
revoke all on function public.newsletter_guard_auto_draft() from public,anon,authenticated;
grant execute on function public.newsletter_guard_auto_draft() to service_role;
commit;
