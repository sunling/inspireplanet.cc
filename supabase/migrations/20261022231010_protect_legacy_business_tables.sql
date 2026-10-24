-- F03: business data is accessed through authorized Netlify Functions.
-- weekly_cards is retained as an archive; live weekly content comes from GitHub.
-- Deploy PRs #71, #72 and the F03 code before applying this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  table_name text;
  column_list text;
  policy_name text;
  sequence_name text;
  browser_role text;
  privilege_name text;
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'service_role with BYPASSRLS is required';
  END IF;

  FOREACH table_name IN ARRAY ARRAY[
    'cards', 'comments', 'meetups', 'meetup_rsvps',
    'notifications', 'users', 'weekly_cards'
  ] LOOP
    -- Missing tables are errors: never silently skip a production protection.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);

    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO column_list
    FROM pg_attribute
    WHERE attrelid = format('public.%I', table_name)::regclass
      AND attnum > 0 AND NOT attisdropped;
    IF column_list IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated', column_list, table_name);
    END IF;

    -- All seven tables are server-only. Remove permissive policies as a second
    -- barrier against accidental future browser grants (including users' old policies).
    FOR policy_name IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
    END LOOP;

    -- Cover serial, identity, and shared/non-owned sequences used by defaults.
    FOR sequence_name IN
      SELECT DISTINCT format('%I.%I', n.nspname, s.relname)
      FROM pg_class s JOIN pg_namespace n ON n.oid = s.relnamespace
      WHERE s.relkind = 'S' AND (
        EXISTS (
          SELECT FROM pg_depend d
          WHERE d.classid = 'pg_class'::regclass AND d.objid = s.oid
            AND d.refclassid = 'pg_class'::regclass
            AND d.refobjid = format('public.%I', table_name)::regclass
            AND d.deptype IN ('a', 'i')
        ) OR EXISTS (
          SELECT FROM pg_depend d
          JOIN pg_attrdef a ON d.classid = 'pg_attrdef'::regclass AND d.objid = a.oid
          WHERE d.refclassid = 'pg_class'::regclass AND d.refobjid = s.oid
            AND a.adrelid = format('public.%I', table_name)::regclass
        )
      )
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC, anon, authenticated', sequence_name);
      IF table_name <> 'weekly_cards' THEN
        EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %s TO service_role', sequence_name);
      END IF;
    END LOOP;

    IF table_name = 'weekly_cards' THEN
      EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.weekly_cards FROM service_role';
      IF column_list IS NOT NULL THEN
        EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.weekly_cards FROM service_role', column_list);
      END IF;
    ELSE
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
    END IF;

    -- Fail atomically if inheritance or unexpected grants leave direct access open.
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(browser_role, format('public.%I', table_name), privilege_name) THEN
          RAISE EXCEPTION '% retains % on %', browser_role, privilege_name, table_name;
        END IF;
      END LOOP;
      FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        IF has_any_column_privilege(browser_role, format('public.%I', table_name), privilege_name) THEN
          RAISE EXCEPTION '% retains column % on %', browser_role, privilege_name, table_name;
        END IF;
      END LOOP;
    END LOOP;
    FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF has_table_privilege('service_role', format('public.%I', table_name), privilege_name)
         <> (table_name <> 'weekly_cards') THEN
        RAISE EXCEPTION 'Unexpected service_role % on %', privilege_name, table_name;
      END IF;
    END LOOP;
    IF table_name = 'weekly_cards' AND (
      has_any_column_privilege('service_role', 'public.weekly_cards', 'SELECT') OR
      has_any_column_privilege('service_role', 'public.weekly_cards', 'INSERT') OR
      has_any_column_privilege('service_role', 'public.weekly_cards', 'UPDATE')
    ) THEN
      RAISE EXCEPTION 'service_role retains archived column access';
    END IF;
  END LOOP;
END $$;

COMMIT;
