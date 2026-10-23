"""Destructive fixtures ONLY in newly created disposable local databases.
Run with PGHOST/PGPORT/PGUSER pointing at a disposable PostgreSQL server;
requires CREATEDB + CREATEROLE/superuser. No production connection permitted.
PG_BIN optionally selects the directory containing psql/createdb/dropdb.
--baseline deliberately tests the unprotected fixture (expected failure).
"""
import os
from pathlib import Path
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[2]
BIN = Path(os.environ.get('PG_BIN', '/usr/bin'))
MIGRATION = ROOT / 'supabase/migrations/20261019180000_protect_users.sql'


def sql(database, content):
    result = subprocess.run([str(BIN / 'psql'), '-X', '-v', 'ON_ERROR_STOP=1', '-d', database], input=content, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)


VERIFY = """
DO $$
DECLARE r text; c text; p text;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.users'::regclass) THEN
    RAISE EXCEPTION 'users RLS is not enabled';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF has_table_privilege(r,'public.users',p) THEN RAISE EXCEPTION '% retains table %',r,p; END IF;
    END LOOP;
    FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        IF has_column_privilege(r,'public.users',c,p) THEN RAISE EXCEPTION '% retains column % %',r,c,p; END IF;
      END LOOP;
    END LOOP;
    IF has_sequence_privilege(r,'public.profile_counter','USAGE') OR has_sequence_privilege(r,'public.profile_counter','SELECT') OR has_sequence_privilege(r,'public.profile_counter','UPDATE') THEN
      RAISE EXCEPTION '% retains sequence access',r;
    END IF;
  END LOOP;
END $$;
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM email FROM public.users; RAISE EXCEPTION 'anon read succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.users(email,name) VALUES ('anon@test.invalid','Anon'); RAISE EXCEPTION 'anon insert succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM email FROM public.users; RAISE EXCEPTION 'authenticated read succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.users SET role='admin'; RAISE EXCEPTION 'authenticated update succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN DELETE FROM public.users; RAISE EXCEPTION 'authenticated delete succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE service_role;
INSERT INTO public.users(email,name) VALUES ('service@test.invalid','Service');
UPDATE public.users SET name='Updated' WHERE email='service@test.invalid';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.users WHERE email='service@test.invalid' AND name='Updated') <> 1 THEN RAISE EXCEPTION 'service CRUD failed'; END IF;
 IF (SELECT count(*) FROM public.users WHERE email='existing@test.invalid' AND role='organizer') <> 1 THEN RAISE EXCEPTION 'existing data lost'; END IF;
END $$;
DELETE FROM public.users WHERE email='service@test.invalid';
RESET ROLE;
"""

for identity in ['bigint DEFAULT nextval(\'public.profile_counter\')', "text DEFAULT ('profile-' || nextval('public.profile_counter'))", 'bigint GENERATED ALWAYS AS IDENTITY']:
    database = 'users_security_' + uuid.uuid4().hex
    subprocess.run([str(BIN / 'createdb'), database], check=True, capture_output=True)
    try:
        sql(database, """
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SEQUENCE public.profile_counter;
CREATE TABLE public.users(id """ + identity + """ PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, role text DEFAULT NULL, counter bigint DEFAULT nextval('public.profile_counter'));
INSERT INTO public.users(email,name,role) VALUES ('existing@test.invalid','Existing','organizer');
GRANT ALL ON public.users TO PUBLIC,anon,authenticated;
GRANT SELECT(email),UPDATE(role) ON public.users TO PUBLIC,anon,authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC,anon,authenticated;
CREATE POLICY legacy_browser_access ON public.users TO PUBLIC USING (true) WITH CHECK (true);
""")
        if '--baseline' not in sys.argv:
            migration = MIGRATION.read_text()
            sql(database, migration)
            sql(database, migration)  # Safe to reapply.
        sql(database, VERIFY)
        print('PASS:', identity)
    finally:
        subprocess.run([str(BIN / 'dropdb'), '--force', database], check=True, capture_output=True)
