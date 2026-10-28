create or replace function public.newsletter_campaign_status(p_year integer,p_episode integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.newsletter_campaigns%rowtype; result jsonb; total integer;
begin
 update public.newsletter_campaigns campaign set status='completed' where campaign.year=p_year and campaign.episode=p_episode and campaign.status='sending' and not exists(select 1 from public.newsletter_deliveries d where d.campaign_id=campaign.id and d.status in ('pending','sending','failed'));
 select * into c from public.newsletter_campaigns where year=p_year and episode=p_episode;
 select jsonb_object_agg(s,n),coalesce(sum(n),0)::integer into result,total from (
  select s,count(d.id)::integer n from unnest(array['pending','sending','sent','failed','skipped','uncertain']) s
  left join public.newsletter_deliveries d on d.campaign_id=c.id and d.status=s group by s
 ) counts;
 return jsonb_build_object('campaign',case when c.id is null then null else to_jsonb(c)-'created_by'-'from_email'-'site_url' end,'counts',result,'total',total,'available',(select count(*) from public.newsletter_subscribers where status='subscribed' and confirmed_at is not null));
end $$;