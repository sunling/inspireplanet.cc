create table public.newsletter_campaigns (
 id uuid primary key default gen_random_uuid(), year integer not null check(year between 2000 and 9999), episode integer not null check(episode between 1 and 9999),
 subject text not null, document jsonb not null, body_html text not null, body_text text not null, content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'), from_email text not null,
 site_url text not null default 'https://inspireplanet.cc' check(site_url='https://inspireplanet.cc'), created_by text not null,
 status text not null default 'draft' check(status in ('draft','sending','completed')), created_at timestamptz not null default now(), started_at timestamptz,
 revision uuid not null default gen_random_uuid(), unique(year,episode)
);
create table public.newsletter_deliveries (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.newsletter_campaigns(id), subscriber_id uuid not null references public.newsletter_subscribers(id), email text not null, confirmed_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','skipped','uncertain')),
 lease_id uuid, locked_until timestamptz, first_attempt_at timestamptz, last_attempt_at timestamptz, message_id text, unsubscribe_token_hash text unique, attempts integer not null default 0,
 unique(campaign_id,subscriber_id)
);
create index newsletter_deliveries_queue_idx on public.newsletter_deliveries(campaign_id,status);
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;
revoke all on public.newsletter_campaigns,public.newsletter_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.newsletter_campaigns,public.newsletter_deliveries to service_role;

create function public.newsletter_campaign_status(p_year integer,p_episode integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype; result jsonb; total integer;
begin
 update public.newsletter_campaigns c set status='completed' where c.year=p_year and c.episode=p_episode and c.status='sending' and not exists(select 1 from public.newsletter_deliveries d where d.campaign_id=c.id and d.status in ('pending','sending','failed'));
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode;
 select jsonb_object_agg(s,n),coalesce(sum(n),0)::integer into result,total from (
  select s,count(d.id)::integer n from unnest(array['pending','sending','sent','failed','skipped','uncertain']) s
  left join public.newsletter_deliveries d on d.campaign_id=c.id and d.status=s group by s
 ) counts;
 return jsonb_build_object('campaign',case when c.id is null then null else to_jsonb(c)-'created_by'-'from_email'-'site_url' end,'counts',result,'total',total,'available',(select count(*) from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null));
end $$;
create function public.newsletter_prepare_campaign(p_year integer,p_episode integer,p_subject text,p_document jsonb,p_html text,p_text text,p_hash text,p_from text,p_actor text) returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('newsletter-campaign:'||p_year||':'||p_episode,0));
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode for update;
 if c.id is not null and c.status<>'draft' then return c.id; end if;
 if c.id is null then
 insert into public.newsletter_campaigns(year,episode,subject,document,body_html,body_text,content_hash,from_email,created_by)
 values(p_year,p_episode,p_subject,p_document,p_html,p_text,p_hash,p_from,p_actor) returning * into c;
 else
 update public.newsletter_campaigns set revision=gen_random_uuid(),subject=p_subject,document=p_document,body_html=p_html,body_text=p_text,content_hash=p_hash,from_email=p_from,created_by=p_actor where id=c.id;
 end if;
 delete from public.newsletter_deliveries where campaign_id=c.id;
 insert into public.newsletter_deliveries(campaign_id,subscriber_id,email,confirmed_at)
 select c.id,id,email,confirmed_at from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null;
 return c.id;
end $$;
create function public.newsletter_start_campaign(p_year integer,p_episode integer,p_revision uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype;
begin
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode for update;
 if c.id is null or c.revision<>p_revision then return false; end if;
 if c.status<>'draft' then return true; end if;
 if not exists(select 1 from public.newsletter_deliveries where campaign_id=c.id) then return false; end if;
 -- No newcomers are added after previewing this snapshot; unsubscribers are rechecked before send.
 update public.newsletter_campaigns set status='sending',started_at=now() where id=c.id;
 return true;
end $$;
create function public.newsletter_claim_deliveries(p_year integer,p_episode integer,p_lease uuid,p_retry boolean)
returns table(id uuid,email text,subject text,body_html text,body_text text,site_url text,from_email text)
language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype;
begin
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode for update;
 if c.id is null or c.status<>'sending' then return; end if;
 -- Resend's idempotency window is 24h. Never automatically retry an ambiguous send after 23h.
 update public.newsletter_deliveries d set status='uncertain',lease_id=null,locked_until=null
 where d.campaign_id=c.id and d.first_attempt_at<=now()-interval '23 hours' and d.status in ('failed','sending') and (d.locked_until is null or d.locked_until<now());
 return query with candidates as (
 select d.id from public.newsletter_deliveries d where d.campaign_id=c.id and (
 d.status='pending' or (p_retry and (d.status='failed' or (d.status='sending' and d.locked_until<now()))))
 order by d.first_attempt_at nulls first,d.id limit 3 for update skip locked
 ), claimed as (
 update public.newsletter_deliveries d set status='sending',lease_id=p_lease,locked_until=now()+interval '90 seconds',
 first_attempt_at=coalesce(d.first_attempt_at,now()),last_attempt_at=now(),attempts=attempts+1 from candidates x where d.id=x.id returning d.*
 ) select d.id,d.email,c.subject,c.body_html,c.body_text,c.site_url,c.from_email from claimed d;
end $$;
create function public.newsletter_authorize_delivery(p_id uuid,p_lease uuid,p_token_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.newsletter_deliveries%rowtype; s public.newsletter_subscribers%rowtype;
begin
 select * into d from public.newsletter_deliveries where id=p_id for update;
 if d.id is null or d.status<>'sending' or d.lease_id is distinct from p_lease or d.locked_until<now() then return false; end if;
 select * into s from public.newsletter_subscribers where id=d.subscriber_id for update;
 if s.status<>'subscribed' or s.confirmed_at is distinct from d.confirmed_at or s.email<>d.email then
 update public.newsletter_deliveries set status='skipped',lease_id=null,locked_until=null where id=p_id; return false;
 end if;
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 -- The token and final message must remain identical for provider idempotency.
 if d.unsubscribe_token_hash is not null and d.unsubscribe_token_hash<>p_token_hash then
 update public.newsletter_deliveries set status='uncertain',lease_id=null,locked_until=null where id=p_id; return false;
 end if;
 update public.newsletter_deliveries set unsubscribe_token_hash=p_token_hash where id=p_id;
 return true;
end $$;
create function public.newsletter_finish_delivery(p_id uuid,p_lease uuid,p_message_id text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.newsletter_deliveries set status=case when p_message_id is null then 'failed' else 'sent' end,
 message_id=p_message_id,lease_id=null,locked_until=null where id=p_id and status='sending' and lease_id=p_lease;
 return found;
end $$;
-- Includes per-delivery tokens; old mail cannot revoke a later, separately confirmed subscription.
create or replace function public.newsletter_unsubscribe(p_token_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 select s.id into v_id from public.newsletter_subscribers s where s.unsubscribe_token_hash=p_token_hash;
 if v_id is null then
 select s.id into v_id from public.newsletter_deliveries d join public.newsletter_subscribers s on s.id=d.subscriber_id and s.confirmed_at=d.confirmed_at where d.unsubscribe_token_hash=p_token_hash;
 end if;
 if v_id is null then return false; end if;
 update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=now(),confirmation_token_hash=null,confirmation_expires_at=null,unsubscribe_token_hash=null where id=v_id and status<>'unsubscribed';
 return found;
end $$;
-- All orchestration RPCs are server-only and never SECURITY DEFINER.
revoke all on function public.newsletter_campaign_status(integer,integer),public.newsletter_prepare_campaign(integer,integer,text,jsonb,text,text,text,text,text),public.newsletter_start_campaign(integer,integer,uuid),public.newsletter_claim_deliveries(integer,integer,uuid,boolean),public.newsletter_authorize_delivery(uuid,uuid,text),public.newsletter_finish_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.newsletter_campaign_status(integer,integer),public.newsletter_prepare_campaign(integer,integer,text,jsonb,text,text,text,text,text),public.newsletter_start_campaign(integer,integer,uuid),public.newsletter_claim_deliveries(integer,integer,uuid,boolean),public.newsletter_authorize_delivery(uuid,uuid,text),public.newsletter_finish_delivery(uuid,uuid,text) to service_role;
