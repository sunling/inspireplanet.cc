# F03: restrict direct database access and retire the weekly archive

This PR builds on #71 and #72. Merge in that order, then deploy this PR's code
before applying the SQL. **The production migration has not been applied.**
The Netlify build does not automatically execute Supabase migrations.

## Result

| Tables                                                       | Browser Data API (`anon` / `authenticated`) | Netlify `service_role`                      |
| ------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------- |
| cards, comments, meetups, meetup_rsvps, notifications, users | No direct table or column access            | Existing CRUD retained                      |
| weekly_cards                                                 | No direct access                            | No table or column access; archive retained |

All seven tables keep RLS enabled and have their old permissive policies removed.
Direct grants to PUBLIC, anon and authenticated, including column-level grants
and associated serial/identity/default sequences, are revoked. No rows are
updated/deleted and no tables/columns are dropped. Unexpected effective browser
privileges or service permissions abort the entire transaction.

The frontend uses Netlify Functions for business data. Its Supabase Auth client
continues to handle login; this migration does not change the auth schema.
Public browsing remains possible through existing public function endpoints;
authorization of management operations depends on #71 and #72.

Weekly cards now read only from `sunling/inspire-planet` on GitHub. Remove all
Supabase fallbacks, including the old 2025 archive merge. GitHub failures retain
the existing cached-tree behavior; if content cannot be fetched, those reads
return empty results rather than querying the retired table. Existing database
records absent from GitHub will no longer appear in weekly listings.

Both legacy write actions, `weeklyCards.create` and `uploadCard.create`, retain
the F02 authentication/organizer/method guards but return 410 for valid organizer
requests without touching the database. The old bulk upload route explains
where to maintain content and links to the GitHub repository.

## Deployment sequence

1. Merge/deploy #71, #72 and this PR. Confirm `SUPABASE_SERVICE_ROLE_KEY` and
   `SUPABASE_URL` exist in Netlify Functions for the production context. Never
   use a browser `VITE_` variable for the service key. The existing server client
   still has an anon fallback: a missing service key will cause permission
   failures after this migration, so verify the environment before applying it.
2. Smoke test public activities, cards, weekly latest/episode/archive views,
   signed-in own card edits, comments, notifications and organizer RSVP management.
   Check GitHub contains all weekly history intended for display.
3. Run `supabase/migrations/20261022231010_protect_legacy_business_tables.sql`
   through the approved migration workflow. It is transactional and repeatable,
   with a 5-second lock timeout. A lock/permission error rolls back; investigate
   before retrying. Do not use an unreviewed `db push` that may apply unrelated
   pending migrations to an existing production database.
4. Re-run application smoke tests using member and organizer test accounts.
   Verify anonymous and signed-in Data API calls cannot read/update these tables.
   Use metadata and synthetic records, avoiding exports of real personal data.

Metadata verification (browser privileges must all be false, service CRUD true
only for the six active tables; no policies should remain on these seven):

```sql
SELECT c.relname, c.relrowsecurity, r.role,
       has_table_privilege(r.role, c.oid, 'SELECT') AS can_select,
       has_table_privilege(r.role, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.role, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.role, c.oid, 'DELETE') AS can_delete,
       has_any_column_privilege(r.role, c.oid, 'SELECT') AS can_select_columns
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) AS r(role)
WHERE n.nspname = 'public' AND c.relname IN
 ('cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards')
ORDER BY c.relname, r.role;

SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename IN
 ('cards','comments','meetups','meetup_rsvps','notifications','users','weekly_cards');
```

## Validation and limits

- 114 Vitest cases pass, including five GitHub-only regression tests and the
  updated tests proving organizers cannot revive either retired write action.
- All three affected Netlify Function bundles compile.
- `tests/security/test_f03_migration.py` defines disposable PostgreSQL fixtures
  with permissive policies, PUBLIC/table/column grants, identity and shared
  default sequences. It verifies two migration applications, real SET ROLE
  denials, service CRUD, archived data preservation, and unrelated grants.
- The SQL fixture and assertions were executed in PostgreSQL 18.6 via PGlite
  0.5.11 locally. Production is PostgreSQL 15; production rollout and authenticated
  UI smoke tests are still required. No production data writes were used in tests.

The migration is intentionally scoped to the six exposed legacy tables and
users policy cleanup. Other public tables, storage, RPC grants, and default
privileges for future objects are unchanged. New public tables must explicitly
review RLS and privileges; this change does not secure future objects by default.

## Recovery

If a function breaks, first inspect its service-key configuration and endpoint
authorization. Keep the direct-access restrictions in place; fix the function
or its explicit service grant rather than restoring PUBLIC policies.
Reverting the application commit alone does not undo the database migration:
pre-F03 weekly code can attempt the now-denied archive fallback/write paths.
Keep GitHub-only reads and the retired write responses during a hotfix.
The historical weekly table remains available to a privileged database operator
for a deliberate future export, without exposing it to site visitors.
