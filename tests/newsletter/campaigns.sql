-- Integration tests: synthetic campaign, no mail provider calls, all changes rolled back.
begin;
set local role service_role;
do $$
declare cid uuid; sid uuid; d record; c public.newsletter_campaigns%rowtype; n integer; old_revision uuid; l uuid:=gen_random_uuid(); token text:=repeat('7',64);
begin
 insert into public.newsletter_subscribers(email,status,consent_version,confirmed_at) values('broadcast-test@example.invalid','subscribed','weekly-recap-v1',now()) returning id into sid;
 cid:=public.newsletter_prepare_campaign(2998,9998,'original','{"type":"doc"}', 'html','text',repeat('a',64),'sender','test');
 select * into c from public.newsletter_campaigns where id=cid; old_revision:=c.revision;
 -- Keep only the fixture in this synthetic campaign; never send or expose actual subscriber data.
 delete from public.newsletter_deliveries where campaign_id=cid and subscriber_id<>sid;
 if public.newsletter_start_campaign(2998,9998,gen_random_uuid()) then raise exception 'stale revision allowed'; end if;
 if not public.newsletter_start_campaign(2998,9998,old_revision) then raise exception 'reviewed revision failed'; end if;
 perform public.newsletter_prepare_campaign(2998,9998,'must not overwrite','{}','evil','evil',repeat('b',64),'different sender','other');
 if (select subject from public.newsletter_campaigns where id=cid)<>'original' then raise exception 'started content changed'; end if;
 select * into d from public.newsletter_claim_deliveries(2998,9998,l,false);
 if d.id is null then raise exception 'delivery not claimed'; end if;
 select count(*) into n from public.newsletter_claim_deliveries(2998,9998,gen_random_uuid(),true);
 if n<>0 then raise exception 'concurrent claim duplicated'; end if;
 if public.newsletter_authorize_delivery(d.id,gen_random_uuid(),token) then raise exception 'wrong lease accepted'; end if;
 if not public.newsletter_authorize_delivery(d.id,l,token) then raise exception 'valid delivery denied'; end if;
 if not public.newsletter_finish_delivery(d.id,l,null) then raise exception 'failed result not recorded'; end if;
 if exists(select 1 from public.newsletter_claim_deliveries(2998,9998,gen_random_uuid(),false)) then raise exception 'failed implicitly retried'; end if;
 select * into d from public.newsletter_claim_deliveries(2998,9998,l,true);
 if not public.newsletter_authorize_delivery(d.id,l,token) then raise exception 'safe retry failed'; end if;
 if not public.newsletter_finish_delivery(d.id,l,'provider-id') then raise exception 'receipt not saved'; end if;
 if exists(select 1 from public.newsletter_claim_deliveries(2998,9998,l,true)) then raise exception 'accepted mail claimed again'; end if;
 perform public.newsletter_campaign_status(2998,9998);
 if (select status from public.newsletter_campaigns where id=cid)<>'completed' then raise exception 'completion not persisted'; end if;
 if not public.newsletter_unsubscribe(token) then raise exception 'delivery unsubscribe did not work'; end if;
 if (select status from public.newsletter_subscribers where id=sid)<>'unsubscribed' then raise exception 'subscriber stayed active'; end if;
 if not public.newsletter_request_subscription('broadcast-test@example.invalid',repeat('e',64),repeat('f',64),repeat('6',64),'/', 'weekly-recap-v1') then raise exception 'renew request failed'; end if;
 if not public.newsletter_unsubscribe(repeat('f',64)) then raise exception 'renew request cancellation failed'; end if;
 if public.newsletter_confirm_subscription(repeat('e',64)) then raise exception 'cancelled renew request confirmed'; end if;
 update public.newsletter_subscribers set status='subscribed',confirmed_at=now()+interval '1 second' where id=sid;
 if public.newsletter_unsubscribe(token) then raise exception 'old mail unsubscribed later consent'; end if;

 cid:=public.newsletter_prepare_campaign(2998,9997,'skip','{}','html','text',repeat('b',64),'sender','test');
 delete from public.newsletter_deliveries where campaign_id=cid and subscriber_id<>sid;
 select * into c from public.newsletter_campaigns where id=cid;
 perform public.newsletter_start_campaign(2998,9997,c.revision);
 select * into d from public.newsletter_claim_deliveries(2998,9997,l,false);
 update public.newsletter_subscribers set status='unsubscribed' where id=sid;
 if public.newsletter_authorize_delivery(d.id,l,repeat('8',64)) then raise exception 'unsubscribed person authorized'; end if;
 if (select status from public.newsletter_deliveries where id=d.id)<>'skipped' then raise exception 'skip not persisted'; end if;

 update public.newsletter_subscribers set status='subscribed' where id=sid;
 cid:=public.newsletter_prepare_campaign(2998,9996,'ambiguous','{}','html','text',repeat('c',64),'sender','test');
 delete from public.newsletter_deliveries where campaign_id=cid and subscriber_id<>sid;
 select * into c from public.newsletter_campaigns where id=cid;
 perform public.newsletter_start_campaign(2998,9996,c.revision);
 select * into d from public.newsletter_claim_deliveries(2998,9996,l,false);
 update public.newsletter_deliveries set locked_until=now()-interval '1 second' where id=d.id;
 if not exists(select 1 from public.newsletter_claim_deliveries(2998,9996,l,true)) then raise exception 'expired lease cannot recover'; end if;
 update public.newsletter_deliveries set first_attempt_at=now()-interval '24 hours',locked_until=now()-interval '1 second' where id=d.id;
 if exists(select 1 from public.newsletter_claim_deliveries(2998,9996,l,true)) then raise exception 'retried outside provider idempotency window'; end if;
 if (select status from public.newsletter_deliveries where id=d.id)<>'uncertain' then raise exception 'ambiguous status missing'; end if;

 if has_table_privilege('anon','public.newsletter_deliveries','SELECT') or has_table_privilege('authenticated','public.newsletter_campaigns','UPDATE') then raise exception 'campaigns exposed to browser'; end if;
 if has_function_privilege('anon','public.newsletter_claim_deliveries(integer,integer,uuid,boolean)','EXECUTE') or has_function_privilege('authenticated','public.newsletter_start_campaign(integer,integer,uuid)','EXECUTE') then raise exception 'broadcast RPC exposed'; end if;
end $$;
rollback;
