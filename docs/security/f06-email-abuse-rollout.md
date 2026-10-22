# F06: email abuse, HTML injection and delivery replay

This PR builds on #75 (which builds on #71/#72). F03 (#73 plus its SQL) remains
necessary to block direct database manipulation. **No production migration,
email, form submission or cancellation was performed during this work.**

## Changes

All outbound email now uses `sendProtectedEmail`, including RSVP approval and
rejection, speaker confirmation, certificates, contact/submission forms,
roundtable notifications and comment notifications. Notification email now uses
the same Resend transport as the other paths; its old unguarded SendGrid fallback
is removed. Existing production configuration uses Resend.

HTML templates escape every dynamic text/attribute interpolation. Subjects are
bounded and stripped of control characters; attachment names are normalized.
Calendar SUMMARY/LOCATION escape CR/LF, backslashes, commas and semicolons, so
form input cannot inject additional ICS properties. Calendar content stays
plain text, independently of HTML encoding. Detail URLs use the canonical HTTPS
site. Certificate HTML/SVG keeps its existing escaping and gains delivery guards.

Contact and article submission remain public, plain-text emails to server-configured
recipients. Request `to`, `cc` and `from` cannot select recipients. Both enforce
string types, name/email/content bounds and honeypot handling. Reply-to is still
a user-provided contact address, not a verified account identity.

Speaker signup remains public. Anonymous signups never email an address supplied
in the form; signed-in confirmations use only the stored account email. The UI
explains this and removes the arbitrary confirmation-address field. Signup still
succeeds if its optional confirmation fails, with a visible warning.

Organizer role and safe-method checks from earlier PRs are retained. Approval
and certificate batches are capped at 25 records per request. Per-record mail
failures do not set `email_sent`; batch/single approval responses and the UI
report notification failure separately from the saved approval. Identical
successful deliveries are suppressed for seven days, including repeated approve/
reject clicks. An otherwise legitimate identical resend in that window is also
suppressed; this is content deduplication, not an overrideable resend feature.
A changed message or different event can send, subject to the same quotas.

Automatic RSVP confirmations use the intended AUTO approval state and await the
protected send; the previous APPROVED comparison could never match that create
path. A mail failure does not undo an already saved RSVP.

Image search now requires a signed-in POST request, bounded query/orientation,
and a shared quota before calling external image services.

## Shared limits and storage

| Scope                                                                       | Fixed-window budget |
| --------------------------------------------------------------------------- | ------------------- |
| Each public contact/submission/speaker/roundtable endpoint, per platform IP | 3 / 15 minutes      |
| Each such endpoint globally                                                 | 100 / hour          |
| Approval/certificate action, per platform IP and per organizer              | 60 / minute         |
| Each approval/certificate action globally                                   | 500 / hour          |
| Image search, per platform IP and per user                                  | 15 / 15 minutes     |
| Image search globally                                                       | 200 / hour          |
| All email requests globally                                                 | 500 / day           |
| Any recipient (including CC), across all email types                        | 20 / hour           |

These constants are in `mailProtection.ts`; tune deliberately against actual
volume/provider quota. Fixed windows can allow bursts around a boundary. Shared
IP users share a budget. Missing/invalid Netlify connection IPs share an unknown
bucket; untrusted X-Forwarded-For is not used to rotate buckets. Global limits
apply independently and protect against IP rotation. The existing roundtable
fingerprint check remains an additional check.

The SQL creates two RLS-enabled, server-only tables and three SECURITY INVOKER
functions with a fixed empty search_path. PUBLIC/anon/authenticated have neither
table access nor RPC execute rights. Only service_role can use the guard.
Ordered transaction advisory locks make checking/consuming a group of quotas
atomic across function instances. A denied group consumes none of its budgets.

Only HMAC fingerprints, counters, leases and expiry timestamps are persisted;
email bodies, addresses and raw IPs are not stored in these guard tables. The
HMAC uses the existing server-only JWT_SECRET with a distinct mail namespace.
Expired metadata is removed in indexed, bounded batches during admitted calls.
Signing-key rotation resets fingerprint-based history; the separate F09 secret
scope/rotation review remains necessary.

A claimed delivery has a five-minute lease token. A stale sender cannot finalize
or delete a newer lease. Provider rejection/exception releases its own lease;
provider-accepted mail is recorded as sent before callers mark it sent. Missing
SQL/configuration or guard errors fail closed, with no unguarded fallback.
The same content fingerprint is also the Resend idempotency key. Resend keeps
keys for 24 hours; the local sent ledger retains seven days of deduplication.
These are distinct windows. A provider acceptance followed by a database/network
failure is uncertain, and no exactly-once inbox-delivery guarantee is claimed.
Guard recovery does not add an automatic queue or bounce/delivery webhook.

## Verification

- 254 selected Vitest cases pass: 56 new mail-security cases, 185 prerequisite
  regression cases and 13 roundtable cases. Provider/API calls are mocked.
- Tests cover HTML/calendar/header injection, fixed recipients, safe profile-only
  confirmations, public/organizer/image quotas, claim/duplicate/busy/error states,
  stable provider keys, failure release and no false email-sent bookkeeping.
- Eight modified Netlify Functions and both modified pages bundle successfully.
- `tests/security/test_f06_migration.py` creates a disposable local database,
  applies the migration twice and runs `f06_mail_assertions.sql`. It verifies
  default-grant revocation, RLS/RPC role isolation, quota atomicity, in-flight and
  sent deduplication, stale/expired/released leases and expiry cleanup.
- The SQL assertions were executed using PostgreSQL 18.6 via PGlite 0.5.11.
  Native production is PostgreSQL 15; real multi-connection load tests and
  authenticated UI smoke tests remain rollout/staging checks.

## Deployment sequence

1. Merge the prerequisite application PRs (#71 → #72 → #75). Complete F03's
   application/SQL rollout under its own instructions. Review mail limits.
2. Verify server-only `JWT_SECRET`, `RESEND_API_KEY`, sender and recipient
   configuration. Do not expose these through VITE variables or browser code.
3. **Before deploying this PR**, apply
   `supabase/migrations/20261022234457_protect_email_delivery.sql` through the
   reviewed migration workflow. It only adds the guard tables/functions and
   does not change business records. The migration is transactional/repeatable.
   Do not blindly push unrelated pending migrations to the existing project.
4. Verify anon/authenticated have no table/execute permissions; run Supabase
   advisors. The two server-only tables intentionally have no browser policies.
5. Merge/deploy this PR. Refresh old clients. Use test accounts/mailboxes in an
   isolated environment for positive sends, provider failures, repeated approvals,
   contact/submission, calendar attachments and guest speaker signups. Check the
   provider dashboard and response/UI failure counts. Production preview guard
   checks must not trigger real mail or external image lookups.

Production has neither new guard tables nor functions at review time. Preview
build success alone does not make positive sending usable before SQL is applied.
If the guard fails, fix its configuration/SQL; do not disable it or restore the
unguarded transport as a fallback. Rolling back to old code restores the original
abuse paths even if these unused tables remain present.

References:

- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://supabase.com/docs/guides/database/functions
- https://docs.netlify.com/build/functions/api/
