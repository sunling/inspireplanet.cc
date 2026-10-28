-- Mailboxes and token digests are server-only. No direct browser grants or policies.
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and length(email) between 3 and 254),
  status text not null default 'pending' check (status in ('pending', 'subscribed', 'unsubscribed')),
  source text not null default '/' check (length(source) <= 100),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  requested_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  confirmation_token_hash text unique check (confirmation_token_hash ~ '^[a-f0-9]{64}$'),
  confirmation_expires_at timestamptz,
  unsubscribe_token_hash text unique check (unsubscribe_token_hash ~ '^[a-f0-9]{64}$')
);
create index newsletter_subscribers_status_created_idx on public.newsletter_subscribers(status, created_at desc);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_subscribers to service_role;

create table public.newsletter_subscription_limits (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table public.newsletter_subscription_limits enable row level security;
revoke all on public.newsletter_subscription_limits from public, anon, authenticated;
grant select, insert, update, delete on public.newsletter_subscription_limits to service_role;

-- Atomic across concurrent Netlify instances. Caller is the server service_role only.
create function public.newsletter_request_subscription(
  p_email text, p_confirmation_hash text, p_unsubscribe_hash text,
  p_ip_hash text, p_source text, p_consent_version text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_row public.newsletter_subscribers%rowtype;
  v_ip_key text := 'ip:' || p_ip_hash;
  v_email_key text := 'email:' || md5(p_email);
  v_ip_count integer;
  v_email_count integer;
begin
  if p_email is null or p_email <> lower(btrim(p_email)) or length(p_email) > 254 or position('@' in p_email) < 2
    or p_confirmation_hash is null or p_confirmation_hash !~ '^[a-f0-9]{64}$'
    or p_unsubscribe_hash is null or p_unsubscribe_hash !~ '^[a-f0-9]{64}$'
    or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$'
    or p_source is null or p_source !~ '^/(episodes/[0-9]{4}/[0-9]{1,4})?$'
    or p_consent_version is distinct from 'weekly-recap-v1' then
    raise exception 'Invalid subscription request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('newsletter:' || v_ip_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('newsletter:' || v_email_key, 0));
  delete from public.newsletter_subscription_limits where window_started_at < now() - interval '2 days';
  insert into public.newsletter_subscription_limits as limits(key, window_started_at, attempts)
    values(v_ip_key, now(), 1)
    on conflict (key) do update set
      attempts = case when limits.window_started_at <= now() - interval '1 hour' then 1 else limits.attempts + 1 end,
      window_started_at = case when limits.window_started_at <= now() - interval '1 hour' then now() else limits.window_started_at end
    returning attempts into v_ip_count;
  if v_ip_count > 5 then return false; end if;
  select * into v_row from public.newsletter_subscribers where email = p_email for update;
  -- Public callers receive the same generic response in all of these cases.
  if found and (v_row.status = 'subscribed' or v_row.requested_at > now() - interval '10 minutes') then return false; end if;
  insert into public.newsletter_subscription_limits as limits(key, window_started_at, attempts)
    values(v_email_key, now(), 1)
    on conflict (key) do update set
      attempts = case when limits.window_started_at <= now() - interval '1 day' then 1 else limits.attempts + 1 end,
      window_started_at = case when limits.window_started_at <= now() - interval '1 day' then now() else limits.window_started_at end
    returning attempts into v_email_count;
  if v_email_count > 3 then return false; end if;
  insert into public.newsletter_subscribers(email, source, consent_version, requested_at, confirmation_token_hash, confirmation_expires_at, unsubscribe_token_hash)
    values(p_email, p_source, p_consent_version, now(), p_confirmation_hash, now() + interval '24 hours', p_unsubscribe_hash)
    on conflict(email) do update set source = excluded.source, consent_version = excluded.consent_version,
      consented_at = now(), requested_at = now(), confirmation_token_hash = excluded.confirmation_token_hash,
      confirmation_expires_at = excluded.confirmation_expires_at, unsubscribe_token_hash = excluded.unsubscribe_token_hash;
  -- A previously unsubscribed address stays unsubscribed until confirmation.
  return true;
end;
$$;

create function public.newsletter_confirm_subscription(p_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  update public.newsletter_subscribers set status = 'subscribed', confirmed_at = now(), unsubscribed_at = null,
    confirmation_token_hash = null, confirmation_expires_at = null
    where confirmation_token_hash = p_token_hash and confirmation_expires_at > now() and status <> 'subscribed';
  return found;
end;
$$;
create function public.newsletter_unsubscribe(p_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now(),
    confirmation_token_hash = null, confirmation_expires_at = null, unsubscribe_token_hash = null
    where unsubscribe_token_hash = p_token_hash;
  return found;
end;
$$;
revoke all on function public.newsletter_request_subscription(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.newsletter_confirm_subscription(text) from public, anon, authenticated;
revoke all on function public.newsletter_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.newsletter_request_subscription(text,text,text,text,text,text) to service_role;
grant execute on function public.newsletter_confirm_subscription(text) to service_role;
grant execute on function public.newsletter_unsubscribe(text) to service_role;
