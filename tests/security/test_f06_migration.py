"""Run only against a disposable local Postgres server with CREATEDB/CREATEROLE.
PGHOST/PGPORT/PGUSER choose the local server; PG_BIN optionally locates binaries.
Creates and drops a fresh database, never connects to Supabase.
"""
import os
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[2]
BIN = Path(os.environ.get('PG_BIN', '/usr/bin'))
MIGRATION = next((ROOT / 'supabase/migrations').glob('*_protect_email_delivery.sql'))
FIXTURE = """
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;
"""

if __name__ == '__main__':
    database = 'f06_mail_' + uuid.uuid4().hex
    subprocess.run([str(BIN/'createdb'), database],check=True)
    try:
        for sql in [FIXTURE, MIGRATION.read_text(), MIGRATION.read_text(), (ROOT/'tests/security/f06_mail_assertions.sql').read_text()]:
            subprocess.run([str(BIN/'psql'),'-X','-v','ON_ERROR_STOP=1','-d',database],input=sql,text=True,check=True)
        print('PASS: F06 quota, lease, deduplication and permissions')
    finally:
        subprocess.run([str(BIN/'dropdb'),'--force',database],check=True)
