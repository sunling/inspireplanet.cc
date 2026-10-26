-- F06: shared, atomic quotas and delivery leases. No message content or PII.
-- Apply before deploying the F06 functions. Existing business rows are untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.security_rate_buckets (
  bucket_key text PRIMARY KEY,
  uses integer NOT NULL CHECK (uses > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_expiry ON public.security_rate_buckets(expires_at);
CREATE TABLE IF NOT EXISTS public.security_mail_deliveries (
  delivery_key text PRIMARY KEY CHECK (delivery_key ~ '^[0-9a-f]{64}$'),
  lease_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('pending','sent')),
  lease_until timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS security_mail_expiry ON public.security_mail_deliveries(expires_at);
ALTER TABLE public.security_rate_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_mail_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_rate_buckets, public.security_mail_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_rate_buckets, public.security_mail_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.consume_security_limits(p_limits jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb; k text; w integer; lim integer; slot text; n integer;
BEGIN
  IF jsonb_typeof(p_limits) IS DISTINCT FROM 'array' OR jsonb_array_length(p_limits) NOT BETWEEN 1 AND 32 THEN
    RAISE EXCEPTION 'invalid limit list';
  END IF;
  IF (SELECT count(DISTINCT x->>'key') FROM jsonb_array_elements(p_limits) x) <> jsonb_array_length(p_limits) THEN
    RAISE EXCEPTION 'duplicate limit key';
  END IF;
  -- Deterministic lock order across instances. No check-then-write race.
  FOR item IN SELECT x FROM jsonb_array_elements(p_limits) x ORDER BY x->>'key' LOOP
    k := item->>'key'; w := (item->>'window')::integer; lim := (item->>'limit')::integer;
    IF k IS NULL OR k !~ '^[0-9a-f]{64}$' OR w IS NULL OR w NOT BETWEEN 1 AND 86400 OR lim IS NULL OR lim NOT BETWEEN 1 AND 10000 THEN
      RAISE EXCEPTION 'invalid limit';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('quota:' || k, 0));
    slot := k || ':' || floor(extract(epoch FROM now()) / w)::text;
    SELECT uses INTO n FROM public.security_rate_buckets WHERE bucket_key = slot;
    IF coalesce(n,0) >= lim THEN RETURN false; END IF;
  END LOOP;
  FOR item IN SELECT x FROM jsonb_array_elements(p_limits) x LOOP
    k := item->>'key'; w := (item->>'window')::integer;
    slot := k || ':' || floor(extract(epoch FROM now()) / w)::text;
    INSERT INTO public.security_rate_buckets(bucket_key,uses,expires_at)
    VALUES (slot,1,to_timestamp((floor(extract(epoch FROM now()) / w)+1)*w))
    ON CONFLICT (bucket_key) DO UPDATE SET uses = public.security_rate_buckets.uses + 1;
  END LOOP;
  -- Bound per-request cleanup work; indexed expiry avoids whole-table scans.
  DELETE FROM public.security_rate_buckets WHERE bucket_key IN
    (SELECT bucket_key FROM public.security_rate_buckets WHERE expires_at < now() ORDER BY expires_at LIMIT 100);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.claim_security_mail(p_key text, p_limits jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE prior public.security_mail_deliveries; token uuid := gen_random_uuid();
BEGIN
  IF p_key IS NULL OR p_key !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid delivery key'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('mail:' || p_key, 0));
  SELECT * INTO prior FROM public.security_mail_deliveries WHERE delivery_key=p_key;
  IF prior.expires_at > now() AND prior.state='sent' THEN RETURN jsonb_build_object('status','duplicate'); END IF;
  IF prior.expires_at > now() AND prior.lease_until > now() AND prior.state='pending' THEN RETURN jsonb_build_object('status','busy'); END IF;
  IF NOT public.consume_security_limits(p_limits) THEN RETURN jsonb_build_object('status','limited'); END IF;
  INSERT INTO public.security_mail_deliveries(delivery_key,lease_id,state,lease_until,expires_at)
  VALUES (p_key,token,'pending',now()+interval '5 minutes',now()+interval '7 days')
  ON CONFLICT (delivery_key) DO UPDATE SET lease_id=excluded.lease_id,state='pending',lease_until=excluded.lease_until,expires_at=excluded.expires_at;
  DELETE FROM public.security_mail_deliveries WHERE delivery_key IN
    (SELECT delivery_key FROM public.security_mail_deliveries WHERE expires_at < now() ORDER BY expires_at LIMIT 100);
  RETURN jsonb_build_object('status','claimed','lease',token);
END $$;

CREATE OR REPLACE FUNCTION public.finish_security_mail(p_key text, p_lease uuid, p_sent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE changed integer;
BEGIN
  IF p_sent THEN
    UPDATE public.security_mail_deliveries SET state='sent'
      WHERE delivery_key=p_key AND lease_id=p_lease AND state='pending';
  ELSE
    DELETE FROM public.security_mail_deliveries
      WHERE delivery_key=p_key AND lease_id=p_lease AND state='pending';
  END IF;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;
REVOKE ALL ON FUNCTION public.consume_security_limits(jsonb), public.claim_security_mail(text,jsonb), public.finish_security_mail(text,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_security_limits(jsonb), public.claim_security_mail(text,jsonb), public.finish_security_mail(text,uuid,boolean) TO service_role;
COMMIT;
