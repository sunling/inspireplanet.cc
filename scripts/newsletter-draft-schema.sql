create or replace function public.newsletter_save_draft(p_year integer,p_episode integer,p_revision uuid,p_subject text,p_document jsonb,p_html text,p_text text,p_hash text,p_from text,p_actor text,p_prepare boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('newsletter-campaign:'||p_year||':'||p_episode,0));
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode for update;
 if c.id is null then
   if p_revision is not null then return null; end if;
   insert into public.newsletter_campaigns(year,episode,subject,document,body_html,body_text,content_hash,from_email,created_by,auto_edited)
   values(p_year,p_episode,p_subject,p_document,p_html,p_text,p_hash,p_from,p_actor,true) returning * into c;
 else
   if c.status<>'draft' or c.revision is distinct from p_revision then return null; end if;
   update public.newsletter_campaigns set subject=p_subject,document=p_document,body_html=p_html,body_text=p_text,content_hash=p_hash,from_email=p_from,revision=gen_random_uuid(),auto_edited=true where id=c.id;
 end if;
 if p_prepare then
   delete from public.newsletter_deliveries where campaign_id=c.id;
   insert into public.newsletter_deliveries(campaign_id,subscriber_id,email,confirmed_at)
   select c.id,id,email,confirmed_at from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null;
 end if;
 return c.id;
end $$;
revoke all on function public.newsletter_save_draft(integer,integer,uuid,text,jsonb,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.newsletter_save_draft(integer,integer,uuid,text,jsonb,text,text,text,text,text,boolean) to service_role;