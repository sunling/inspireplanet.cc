-- Run against a database with the subscription migration applied. No emails sent;
-- every fixture and counter is rolled back. Fails on any broken invariant.
begin;
set local role service_role;
do $$
declare v boolean; i integer;
begin
  if not public.newsletter_request_subscription('newsletter-lifecycle@example.invalid', repeat('a',64), repeat('b',64), repeat('1',64), '/', 'weekly-recap-v1') then raise exception 'initial claim failed'; end if;
  if public.newsletter_request_subscription('newsletter-lifecycle@example.invalid', repeat('c',64), repeat('d',64), repeat('1',64), '/', 'weekly-recap-v1') then raise exception 'cooldown failed'; end if;
  if not public.newsletter_confirm_subscription(repeat('a',64)) then raise exception 'confirm failed'; end if;
  if public.newsletter_confirm_subscription(repeat('a',64)) then raise exception 'confirmation replay accepted'; end if;
  if public.newsletter_request_subscription('newsletter-lifecycle@example.invalid', repeat('c',64), repeat('d',64), repeat('2',64), '/', 'weekly-recap-v1') then raise exception 'active address mailed again'; end if;
  if not public.newsletter_unsubscribe(repeat('b',64)) then raise exception 'unsubscribe failed'; end if;
  if public.newsletter_unsubscribe(repeat('b',64)) then raise exception 'unsubscribe token not invalidated'; end if;
  if public.newsletter_confirm_subscription(repeat('a',64)) then raise exception 'old confirmation reactivated unsubscribe'; end if;
  update public.newsletter_subscribers set requested_at = now() - interval '11 minutes' where email = 'newsletter-lifecycle@example.invalid';
  if not public.newsletter_request_subscription('newsletter-lifecycle@example.invalid', repeat('c',64), repeat('d',64), repeat('2',64), '/', 'weekly-recap-v1') then raise exception 'resubscribe request failed'; end if;
  if (select status from public.newsletter_subscribers where email = 'newsletter-lifecycle@example.invalid') <> 'unsubscribed' then raise exception 'resubscribed without consent'; end if;
  if not public.newsletter_confirm_subscription(repeat('c',64)) then raise exception 'resubscribe confirmation failed'; end if;
  if public.newsletter_unsubscribe(repeat('b',64)) then raise exception 'old token affects new subscription'; end if;

  perform public.newsletter_request_subscription('newsletter-expired@example.invalid', repeat('e',64), repeat('f',64), repeat('3',64), '/', 'weekly-recap-v1');
  update public.newsletter_subscribers set confirmation_expires_at = now() - interval '1 second' where email = 'newsletter-expired@example.invalid';
  if public.newsletter_confirm_subscription(repeat('e',64)) then raise exception 'expired token accepted'; end if;
  -- Admin removal invalidates pending confirmation.
  update public.newsletter_subscribers set status = 'unsubscribed', confirmation_token_hash = null, unsubscribe_token_hash = null where email = 'newsletter-expired@example.invalid';
  if public.newsletter_confirm_subscription(repeat('e',64)) then raise exception 'removed subscription reactivated'; end if;

  for i in 1..6 loop
    v := public.newsletter_request_subscription('newsletter-ip-' || i || '@example.invalid', lpad(i::text,64,'0'), lpad((i+10)::text,64,'0'), repeat('4',64), '/', 'weekly-recap-v1');
    if v is distinct from (i <= 5) then raise exception 'IP limit failed at %', i; end if;
  end loop;
  for i in 1..4 loop
    update public.newsletter_subscribers set requested_at = now() - interval '11 minutes' where email = 'newsletter-mailbox-limit@example.invalid';
    v := public.newsletter_request_subscription('newsletter-mailbox-limit@example.invalid', lpad((i+20)::text,64,'0'), lpad((i+30)::text,64,'0'), repeat('5',64), '/', 'weekly-recap-v1');
    if v is distinct from (i <= 3) then raise exception 'Mailbox daily limit failed at %', i; end if;
  end loop;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.newsletter_subscribers','SELECT') or has_table_privilege('authenticated', 'public.newsletter_subscribers','SELECT') then raise exception 'mailboxes exposed'; end if;
  if has_table_privilege('anon', 'public.newsletter_subscribers','INSERT') or has_table_privilege('authenticated', 'public.newsletter_subscribers','UPDATE') then raise exception 'browser may change subscriptions'; end if;
  if has_function_privilege('anon','public.newsletter_request_subscription(text,text,text,text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.newsletter_confirm_subscription(text)','EXECUTE') or has_function_privilege('anon','public.newsletter_unsubscribe(text)','EXECUTE') then raise exception 'subscription RPC exposed'; end if;
  if exists(select 1 from pg_tables where schemaname='public' and tablename like 'newsletter_%' and not rowsecurity) then raise exception 'RLS disabled'; end if;
end $$;
rollback;
