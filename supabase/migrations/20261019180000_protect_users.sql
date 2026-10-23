-- public.users is a server-only identity/profile table. Public directory
-- projections remain available through the Netlify users function.
-- No rows, columns or identity mappings are changed by this migration.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'service_role with BYPASSRLS is required before protecting users';
  END IF;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  columns text;
  sequence_name text;
BEGIN
  -- Table REVOKE does not remove separately granted column privileges.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO columns
  FROM pg_attribute
  WHERE attrelid = 'public.users'::regclass AND attnum > 0 AND NOT attisdropped;
  IF columns IS NOT NULL THEN
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.users FROM PUBLIC, anon, authenticated', columns);
  END IF;

  -- Discover both owned serial/identity sequences and sequences referenced
  -- by column defaults (including shared/non-owned sequences and non-bigint IDs).
  FOR sequence_name IN
    SELECT DISTINCT format('%I.%I', n.nspname, s.relname)
    FROM pg_class s
    JOIN pg_namespace n ON n.oid = s.relnamespace
    WHERE s.relkind = 'S' AND (
      EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass AND d.objid = s.oid
          AND d.refclassid = 'pg_class'::regclass
          AND d.refobjid = 'public.users'::regclass AND d.deptype IN ('a', 'i')
      ) OR EXISTS (
        SELECT 1 FROM pg_depend d
        JOIN pg_attrdef a ON d.classid = 'pg_attrdef'::regclass AND d.objid = a.oid
        WHERE d.refclassid = 'pg_class'::regclass AND d.refobjid = s.oid
          AND a.adrelid = 'public.users'::regclass
      )
    )
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC, anon, authenticated', sequence_name);
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %s TO service_role', sequence_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
COMMIT;
