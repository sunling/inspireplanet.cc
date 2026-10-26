-- Run only in a disposable database AFTER the F06 migration.
DO $$ DECLARE r text; t text; p text; BEGIN
  FOREACH t IN ARRAY ARRAY['security_rate_buckets','security_mail_deliveries'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=format('public.%I',t)::regclass) THEN RAISE EXCEPTION 'RLS missing'; END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(r,format('public.%I',t),p) THEN RAISE EXCEPTION 'Browser table access: % % %',r,t,p; END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  IF EXISTS (SELECT FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
      ('consume_security_limits','claim_security_mail','finish_security_mail') AND (prosecdef OR proconfig IS NULL)) THEN RAISE EXCEPTION 'Unsafe function security/search path'; END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
      ('consume_security_limits','claim_security_mail','finish_security_mail') AND has_function_privilege(r,oid,'EXECUTE')) THEN RAISE EXCEPTION 'Browser RPC execute access'; END IF;
  END LOOP;
END $$;
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.consume_security_limits('[]'); RAISE EXCEPTION 'Anon RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.security_mail_deliveries; RAISE EXCEPTION 'Anon ledger read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.claim_security_mail(repeat('a',64),'[]'); RAISE EXCEPTION 'Member RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE service_role;
DO $$
DECLARE limits jsonb; combined jsonb; first_claim jsonb; second_claim jsonb; result jsonb;
BEGIN
  limits := jsonb_build_array(jsonb_build_object('key',repeat('a',64),'limit',2,'window',3600));
  IF NOT public.consume_security_limits(limits) OR NOT public.consume_security_limits(limits) THEN RAISE EXCEPTION 'Quota admits too few'; END IF;
  IF public.consume_security_limits(limits) THEN RAISE EXCEPTION 'Quota exceeded'; END IF;
  combined := jsonb_build_array(jsonb_build_object('key',repeat('b',64),'limit',2,'window',3600)) || limits;
  IF public.consume_security_limits(combined) THEN RAISE EXCEPTION 'Group quota bypass'; END IF;
  IF EXISTS(SELECT FROM public.security_rate_buckets WHERE bucket_key LIKE repeat('b',64)||':%') THEN RAISE EXCEPTION 'Partial quota consumption on denial'; END IF;

  limits := jsonb_build_array(jsonb_build_object('key',repeat('f',64),'limit',100,'window',3600));
  first_claim := public.claim_security_mail(repeat('c',64),limits);
  IF first_claim->>'status'<>'claimed' OR first_claim->>'lease' IS NULL THEN RAISE EXCEPTION 'No first lease'; END IF;
  result := public.claim_security_mail(repeat('c',64),limits);
  IF result->>'status'<>'busy' THEN RAISE EXCEPTION 'Concurrent in-flight delivery admitted'; END IF;
  IF public.finish_security_mail(repeat('c',64),gen_random_uuid(),true) THEN RAISE EXCEPTION 'Wrong owner finalized'; END IF;
  IF NOT public.finish_security_mail(repeat('c',64),(first_claim->>'lease')::uuid,true) THEN RAISE EXCEPTION 'Cannot finalize'; END IF;
  result := public.claim_security_mail(repeat('c',64),limits);
  IF result->>'status'<>'duplicate' THEN RAISE EXCEPTION 'Sent delivery replayed'; END IF;

  first_claim := public.claim_security_mail(repeat('d',64),limits);
  UPDATE public.security_mail_deliveries SET lease_until=now()-interval '1 second' WHERE delivery_key=repeat('d',64);
  second_claim := public.claim_security_mail(repeat('d',64),limits);
  IF second_claim->>'status'<>'claimed' OR second_claim->>'lease'=first_claim->>'lease' THEN RAISE EXCEPTION 'Expired lease not recovered'; END IF;
  IF public.finish_security_mail(repeat('d',64),(first_claim->>'lease')::uuid,false) THEN RAISE EXCEPTION 'Stale lease deleted current delivery'; END IF;
  IF NOT public.finish_security_mail(repeat('d',64),(second_claim->>'lease')::uuid,true) THEN RAISE EXCEPTION 'New lease cannot finalize'; END IF;

  first_claim := public.claim_security_mail(repeat('e',64),limits);
  IF NOT public.finish_security_mail(repeat('e',64),(first_claim->>'lease')::uuid,false) THEN RAISE EXCEPTION 'Cannot release failed delivery'; END IF;
  result := public.claim_security_mail(repeat('e',64),limits);
  IF result->>'status'<>'claimed' THEN RAISE EXCEPTION 'Cannot retry released delivery'; END IF;

  result := public.claim_security_mail(repeat('0',64),jsonb_build_array(jsonb_build_object('key',repeat('a',64),'limit',2,'window',3600)));
  IF result->>'status'<>'limited' OR EXISTS(SELECT FROM public.security_mail_deliveries WHERE delivery_key=repeat('0',64)) THEN RAISE EXCEPTION 'Quota denial left a lease'; END IF;

  INSERT INTO public.security_rate_buckets VALUES ('expired-fixture',1,now()-interval '1 day');
  PERFORM public.consume_security_limits(limits);
  IF EXISTS(SELECT FROM public.security_rate_buckets WHERE bucket_key='expired-fixture') THEN RAISE EXCEPTION 'Expired bucket retained'; END IF;

  BEGIN PERFORM public.consume_security_limits('[]'); RAISE EXCEPTION 'Empty quotas accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Empty quotas accepted' THEN RAISE; END IF; END;
  BEGIN PERFORM public.consume_security_limits('[{"key":"invalid","limit":1,"window":60}]'); RAISE EXCEPTION 'Bad key accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Bad key accepted' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
