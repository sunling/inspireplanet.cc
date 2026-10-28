create or replace function public.newsletter_unsubscribe(p_token_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_confirmed timestamptz;
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 select s.id,s.confirmed_at into v_id,v_confirmed from public.newsletter_subscribers s where s.unsubscribe_token_hash=p_token_hash;
 if v_id is null then
 select s.id,s.confirmed_at into v_id,v_confirmed from public.newsletter_deliveries d join public.newsletter_subscribers s on s.id=d.subscriber_id and s.confirmed_at=d.confirmed_at where d.unsubscribe_token_hash=p_token_hash;
 end if;
 if v_id is null then return false; end if;
 update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=now(),confirmation_token_hash=null,confirmation_expires_at=null,unsubscribe_token_hash=null where id=v_id and confirmed_at is not distinct from v_confirmed;
 return found;
end $$;