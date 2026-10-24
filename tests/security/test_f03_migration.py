"""Integration test in NEW disposable local Postgres databases only.
PGHOST/PGPORT/PGUSER must target a disposable server with CREATEDB/CREATEROLE.
PG_BIN optionally selects PostgreSQL binaries. Does not connect to Supabase.
"""
import os
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = next((ROOT / 'supabase/migrations').glob('*_protect_legacy_business_tables.sql'))
BIN = Path(os.environ.get('PG_BIN', '/usr/bin'))

FIXTURE = """
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE SEQUENCE public.shared_counter;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards'] LOOP
    EXECUTE format('CREATE TABLE public.%I (id bigint GENERATED ALWAYS AS IDENTITY, value text, counter bigint DEFAULT nextval(''public.shared_counter''))',t);
    EXECUTE format('INSERT INTO public.%I(value) VALUES (''existing'')',t);
    EXECUTE format('GRANT ALL ON public.%I TO PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('GRANT SELECT(value),UPDATE(value) ON public.%I TO PUBLIC,anon,authenticated,service_role',t);
    EXECUTE format('CREATE POLICY legacy_access ON public.%I TO PUBLIC USING (true) WITH CHECK (true)',t);
  END LOOP;
END $$;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO PUBLIC,anon,authenticated,service_role;
CREATE TABLE public.unrelated(value text);
GRANT SELECT ON public.unrelated TO anon;
CREATE SCHEMA storage;
CREATE TABLE storage.unrelated(value text);
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.unrelated TO anon;
"""

VERIFY = """
DO $$ DECLARE t text; r text; p text; s text; BEGIN
  FOREACH t IN ARRAY ARRAY['cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=format('public.%I',t)::regclass) THEN
      RAISE EXCEPTION 'RLS missing on %',t;
    END IF;
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname='public' AND tablename=t) THEN
      RAISE EXCEPTION 'Legacy policy remains on %',t;
    END IF;
    EXECUTE format('SELECT CASE WHEN count(*)=1 AND min(value)=''existing'' THEN true ELSE false END FROM public.%I',t) INTO STRICT r;
    IF r <> 'true' THEN RAISE EXCEPTION 'Original rows changed on %',t; END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(r,format('public.%I',t),p) THEN RAISE EXCEPTION '% has table % on %',r,p,t; END IF;
      END LOOP;
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
        IF has_any_column_privilege(r,format('public.%I',t),p) THEN RAISE EXCEPTION '% has column % on %',r,p,t; END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  FOR s IN SELECT oid::text FROM pg_class WHERE relkind='S' AND relnamespace='public'::regnamespace LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH p IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP
        IF has_sequence_privilege(r,s::oid,p) THEN RAISE EXCEPTION '% has sequence %',r,p; END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  IF NOT has_table_privilege('anon','public.unrelated','SELECT') OR NOT has_table_privilege('anon','storage.unrelated','SELECT') THEN
    RAISE EXCEPTION 'Unrelated grants changed';
  END IF;
END $$;
SET ROLE anon;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards'] LOOP
    BEGIN EXECUTE format('SELECT value FROM public.%I',t); RAISE EXCEPTION 'anonymous read succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN EXECUTE format('INSERT INTO public.%I(value) VALUES (''attack'')',t); RAISE EXCEPTION 'anonymous insert succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN EXECUTE format('UPDATE public.%I SET value=''attack''',t); RAISE EXCEPTION 'anonymous update succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards'] LOOP
    BEGIN EXECUTE format('SELECT value FROM public.%I',t); RAISE EXCEPTION 'member read succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN EXECUTE format('UPDATE public.%I SET value=''attack''',t); RAISE EXCEPTION 'member update succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN EXECUTE format('DELETE FROM public.%I',t); RAISE EXCEPTION 'member delete succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
END $$;
RESET ROLE;
SET ROLE service_role;
DO $$ DECLARE t text; n int; BEGIN
  FOREACH t IN ARRAY ARRAY['cards','comments','meetups','meetup_rsvps','notifications','users'] LOOP
    EXECUTE format('INSERT INTO public.%I(value) VALUES (''new'')',t);
    EXECUTE format('UPDATE public.%I SET value=''updated'' WHERE value=''new''',t);
    EXECUTE format('SELECT count(*) FROM public.%I WHERE value=''updated''',t) INTO n;
    IF n <> 1 THEN RAISE EXCEPTION 'Service CRUD failed on %',t; END IF;
    EXECUTE format('DELETE FROM public.%I WHERE value=''updated''',t);
  END LOOP;
  BEGIN PERFORM value FROM public.weekly_cards; RAISE EXCEPTION 'service archive read succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.weekly_cards(value) VALUES ('new'); RAISE EXCEPTION 'service archive write succeeded'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
"""


def main():
    database = 'f03_security_' + uuid.uuid4().hex
    subprocess.run([str(BIN / 'createdb'), database], check=True)
    try:
        # Roles are cluster-wide; reuse if previous test fixtures created them.
        fixture = FIXTURE
        for r, attrs in [('anon','NOLOGIN'),('authenticated','NOLOGIN'),('service_role','NOLOGIN BYPASSRLS')]:
            fixture = fixture.replace(f'CREATE ROLE {r} {attrs};', f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{r}') THEN CREATE ROLE {r} {attrs}; END IF; END $$;")
        for sql in [fixture, MIGRATION.read_text(), MIGRATION.read_text(), VERIFY]:
            subprocess.run([str(BIN/'psql'),'-X','-v','ON_ERROR_STOP=1','-d',database],input=sql,text=True,check=True)
        print('PASS: F03 migration twice, browser denials, service CRUD, archive preservation')
    finally:
        subprocess.run([str(BIN/'dropdb'),'--force',database],check=True)


if __name__ == '__main__':
    main()
