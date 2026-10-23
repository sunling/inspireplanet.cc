# Protecting `public.users`: operator rollout and incident follow-up

## Boundary and prerequisites

`public.users` holds application IDs, email and roles. It is **not** the Supabase
`auth.users` table: do not assume its IDs equal `auth.uid()`, or cast legacy IDs
to UUID. This change preserves all rows, IDs, relationships and existing roles.
The Netlify `users` function remains the public directory, using its existing
`id, name, username` projection (plus existing public profile fields). Direct
browser/PostgREST access to the underlying identity table is not supported.

`auth/register` and `auth/getProfile` now require a Bearer token verified through
Supabase `auth.getUser(token)`, with an ID, email and confirmed email timestamp.
The request body cannot select an email/profile. Both actions return an existing
profile or create one using **only** that verified email and a display-name
allowlist (`name`, `full_name`, then email prefix). User-editable metadata must
never provide role, ID, username, privileges or additional insert columns.
Existing profiles/roles are never overwritten. Failed lookups or inserts fail
closed; concurrent unique-email insert conflicts are re-read, not upserted.
Email-confirmation signup creates no application row until verified login or
callback. Login, immediate-session signup, Google/email callback, session sync
and OTP recovery pass their returned session token explicitly.

**Hard prerequisite:** Netlify Functions must have a server-only
`SUPABASE_SERVICE_ROLE_KEY` for the same project as `SUPABASE_URL` and the browser
Auth client. Never put this key in a `VITE_*` variable, frontend bundle, logs,
screenshots, shell history or PR. The existing server client can fall back to an
anon key; after this migration that fallback intentionally cannot access users.
Do not deploy the migration until the service-role configuration is verified.
The role must have BYPASSRLS and schema USAGE. The migration checks BYPASSRLS,
grants table CRUD and discovered sequence USAGE/SELECT/UPDATE explicitly.
Do not inject caller Authorization into the server database client's global
headers: it must continue using the service role for table access.

## Preflight: inspect without exporting user data

Run these as an authorized database administrator in staging first. Save the
results to an access-controlled incident/change record, not this repository.
These inspect catalogs only; do not fetch real users to prove exposure.

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner, c.relacl
FROM pg_class c WHERE c.oid = 'public.users'::regclass;
SELECT policyname, roles, cmd, permissive, qual, with_check
FROM pg_policies WHERE schemaname='public' AND tablename='users';
SELECT grantee, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_schema='public' AND table_name='users';
SELECT grantee, column_name, privilege_type, is_grantable
FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='users';
-- Direct ACLs include PUBLIC, which has no pg_roles row.
SELECT attname, attacl FROM pg_attribute
WHERE attrelid='public.users'::regclass AND attnum>0 AND NOT attisdropped;
SELECT rolname, rolbypassrls, rolsuper, rolinherit FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role');
SELECT member.rolname AS member, parent.rolname AS inherited_role
FROM pg_auth_members m
JOIN pg_roles member ON member.oid=m.member
JOIN pg_roles parent ON parent.oid=m.roleid;
SELECT has_schema_privilege('service_role','public','USAGE');
-- Review every actual ID/default, uniqueness and nonprivileged role default.
SELECT column_name, data_type, column_default, is_identity
FROM information_schema.columns
WHERE table_schema='public' AND table_name='users';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.users'::regclass;
```

Require a unique constraint/index on `users.email`; investigate duplicates using
aggregate counts only and resolve deliberately before rollout. Do not rewrite
or lowercase existing emails en masse: auth-to-profile linking currently uses
Supabase's verified email verbatim, preserving the existing mapping. Check that
`role` defaults to NULL or an ordinary nonprivileged member role and that insert
triggers do not grant privileges. Audit historical profiles and organizer/admin
assignments: this fix cannot tell which old rows were created maliciously.

Discover sequences the migration touches (owned serial/identity sequences AND
sequences referenced by defaults, even if not owned by the ID column):

```sql
SELECT DISTINCT s.oid::regclass AS sequence, s.relacl
FROM pg_class s
WHERE s.relkind='S' AND (
 EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass
  AND d.objid=s.oid AND d.refclassid='pg_class'::regclass
  AND d.refobjid='public.users'::regclass AND d.deptype IN ('a','i'))
 OR EXISTS (SELECT 1 FROM pg_depend d JOIN pg_attrdef a
  ON d.classid='pg_attrdef'::regclass AND d.objid=a.oid
  WHERE d.refclassid='pg_class'::regclass AND d.refobjid=s.oid
  AND a.adrelid='public.users'::regclass));
```

If a sequence is shared with another table, removing browser sequence access
can break that table's direct inserts: route those writes through an authorized
backend as well before rollout. Function-generated/dynamically selected sequence
defaults do not expose a catalog sequence dependency; inspect such functions and
explicitly grant/revoke their sequences in a reviewed follow-up migration.

The migration removes table **and separate column** grants from PUBLIC, anon,
and authenticated; RLS is enabled without inventing ownership policies. Existing
policies remain for audit/history, but grants are required before they can grant
access. Review and remove obsolete broad policies in a separate reviewed change.
Audit inherited/custom roles, views/materialized views, SECURITY DEFINER RPCs,
other endpoints and default privileges: direct revokes from these three roles
cannot remove access inherited from another role or a data-returning view/RPC.
Do not certify closure if effective privilege verification below finds any path.
Never restore broad grants to work around deployment failures.

## Deployment order

1. Preserve catalog evidence and available Supabase/Netlify logs; record the
   incident window. Back up the database with approved tooling. No destructive
   data migration is included here.
2. In an isolated staging project, verify matching project URLs and server-only
   service-role configuration. Run the integration matrix below against real
   Supabase Auth/PostgREST and a preview Functions deployment.
3. Deploy the backend auth fix and matching frontend **before** the SQL migration.
   The old email-body-only frontend is incompatible with protected auth endpoints;
   refresh stale browser tabs. Confirm explicit fresh tokens in test-account
   flows, without copying tokens into tickets or logs.
4. Verify the backend directory and other existing server routes work using the
   service role. Apply
   `supabase/migrations/20261019180000_protect_users.sql` as the authorized DB
   owner/admin using the normal tracked migration mechanism. It is transactional
   and safe to reapply; it does not drop tables, users, rows or relationships.
5. Immediately run SQL effective-privilege and HTTP checks below. Monitor auth
   401s, profile 500s, signup conversion and directory failures. A 500 after
   migration commonly means the backend is still using anon credentials or a
   default/trigger/sequence prerequisite was missed; diagnose without printing
   credentials or granting browser access.
6. If urgently needed, roll forward configuration/backend fixes or temporarily
   disable impacted features. Do not roll back to vulnerable auth handlers or
   disable RLS/re-grant browser users access. Keep the lock-down in place.

## SQL acceptance checks after migration

```sql
SELECT relrowsecurity FROM pg_class WHERE oid='public.users'::regclass;
-- Must be true.
SELECT r, p, has_table_privilege(r,'public.users',p) AS allowed
FROM unnest(ARRAY['anon','authenticated']) r
CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p;
-- Every allowed must be false (including inherited and PUBLIC access).
SELECT r, a.attname, p, has_column_privilege(r,'public.users',a.attname,p) AS allowed
FROM unnest(ARRAY['anon','authenticated']) r
CROSS JOIN pg_attribute a
CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p
WHERE a.attrelid='public.users'::regclass AND a.attnum>0 AND NOT a.attisdropped;
-- Every allowed must be false; table REVOKE alone is insufficient.
SELECT p, has_table_privilege('service_role','public.users',p) AS allowed
FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p;
-- Every allowed must be true; also recheck BYPASSRLS/schema USAGE.
```

For each sequence returned by preflight, use
`has_sequence_privilege(role, sequence_name, privilege)` for USAGE, SELECT and
UPDATE: anon/authenticated must all be false; service_role must all be true.
Re-run catalog ACL inspection to confirm no direct PUBLIC grant remains.
Do not use an empty SELECT result as proof of revoked grants; check privileges
and actual denied requests as well.

## Real DB / end-to-end integration matrix

Use a disposable staging Supabase project and synthetic test accounts A/B only.
Record status codes, privilege booleans and assertion outcomes, not PII/tokens.

- Run `python3 tests/security/test_users_migration.py` against a **disposable local
  PostgreSQL server** using standard PGHOST/PGPORT/PGUSER and optional PG_BIN. It
  needs CREATEDB/CREATEROLE or superuser, creates/drops randomized test databases,
  and never connects to production. `--baseline` is expected to fail. It checks
  dirty table/column/PUBLIC grants, a legacy permissive policy, all effective
  browser privileges, denial of actual browser operations, service-role CRUD,
  preserved existing data, idempotence, bigint/non-owned-default/text-ID/identity
  sequence discovery. This is PostgreSQL SQL/ACL testing, not Supabase integration.
- Against staging PostgREST, with only anon API key, make `HEAD /rest/v1/users`
  with count requested (no response rows), then a column-specific HEAD for email.
  Expect permission denial, not a successful count. Repeat with A's authenticated
  session. In the disposable project only, test denied direct inserts/updates/
  deletes against synthetic fixtures; inspect affected counts to avoid false
  confidence from a successful no-op.
- Against preview Netlify auth, both register/getProfile without Bearer, malformed
  Bearer, expired/revoked Supabase token and a legacy application JWT must return
  401 with no user-table query/write. OPTIONS must still succeed.
- With A's valid token and B's email/name/role/ID in the request, both endpoints
  must return only A's profile. Verify B's row/role unchanged using synthetic
  fixture IDs. Verify DB permissions/unique errors return 500 without a fake
  success; restore intentionally revoked staging service grants afterward.
- Existing password login must return its original application ID and stored
  role. Immediate-session signup creates one ordinary-role row. Confirmation-
  required signup creates **no** users row before confirmation; after confirming,
  login/callback provisions exactly one row. Google first login and repeated
  callback do likewise; verify a full_name-only identity and concurrent first
  callback/session sync. User-editable `role`, `id`, `email` metadata must never
  influence database identity/privileges.
- OTP password recovery, background session refresh and stale cached-token login
  must work with the fresh token explicitly sent. A backend profile failure must
  not authenticate a fabricated profile in login/signup/callback.
- Anonymous Netlify `users` get/getAll/search and public directory UI remain
  functional, returning their existing public projection but not email/role.
  Direct browser Supabase requests remain forbidden. Smoke-test cards, RSVP and
  other backend joins after RLS is enabled.

Local automated SQL verification was performed on PostgreSQL 17.11 with
synthetic fixture databases (three ID/default variants, migration applied twice).
No production DB connection, production writes, real-user fetches or real
Supabase Auth/PostgREST integration were performed by this change. The operator
must execute the staging matrix and production catalog/HEAD acceptance checks;
unit tests and local PostgreSQL do not establish production closure.

## Exposure investigation

Treat the reported anonymous HEAD count (154 rows, with email/name/username/id/
role/created_at readable columns) as evidence of potential exposure, not proof
that only HEAD requests occurred or that data was not downloaded. Avoid fetching
rows to reproduce it. Preserve Supabase API/database audit logs, Netlify access
logs, deployment history, schema migration history and credential/grant changes
before retention expires. Establish when grants/RLS/policies became permissive,
which endpoints/RPC/views could expose users, request volumes/IPs/agents and
whether tokens/keys appeared in logs or bundles. Inspect authorization changes,
new accounts, suspicious role changes and affected application actions using
approved private incident tooling.

Assess confidentiality (especially email), integrity (browser writes and
unauthenticated profile creation) and downstream privilege effects separately.
Inventory other exposed tables and storage without bulk-fetching user data.
Rotate a service credential if it was exposed; rotating the public anon key
alone is not a fix for permissive grants. Review Supabase Auth email-change and
confirmation settings and historical role/default/trigger behavior. Coordinate
user/regulatory notification decisions with the incident owner and counsel;
this code change does not determine notification obligations. Retain evidence
securely, minimize access and document both confirmed and unknown impact.
