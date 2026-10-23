# F05: registration identity and answer-sheet ownership

This PR builds on #71 and #72 and must follow those application changes. F03
(#73 plus its separately executed SQL) is also needed to close the direct
Data API bypass; this PR fixes the application endpoints. F04 can merge
independently. No SQL or new environment variable is introduced here.
**Production remains unchanged until merge/deploy.**

## Request boundaries

- Both `survey.submit` and `surveySubmission.submit` use one handler. Standalone
  submissions require the verified signed-in profile. Supplied respondent IDs,
  email and request-metadata overrides cannot select another identity. Email
  comes from the stored profile; IP/user-agent come from request headers.
- Both submit paths and answer updates enforce active/start/end dates, question
  membership, unique question IDs, required answers, supported types and valid
  choices/rating/date/text values before writes. Duplicate checks fail closed
  on database errors. New answers and updates use bulk database statements.
- Meetup forms now send answers with the RSVP request. The server selects the
  questionnaire from the activity, creates or reuses the authenticated caller's
  sheet, and links it internally. A questionnaire's stored meetup binding must
  match as well. Existing authenticated clients may attach their own existing
  sheet only when both respondent and survey match the activity. Guest clients
  cannot attach externally supplied sheets.
- On RSVP failure, cleanup can delete only a sheet actually created by this
  handler, using its returned ID and respondent. Existing or reused sheets are
  never deleted as compensation. Answer-insert failures also clean up only the
  server-created sheet. Existing sheets reused for registrations can retain the
  newly validated answers if the subsequent RSVP write fails.
- Reusing an owned activity sheet honors a questionnaire configured for a single
  submission without blocking a later registration/re-registration. Standalone
  duplicate creation still fails and directs users to edit their own sheet.
- Choice arrays are serialized as JSON in the database's text column and decoded
  according to the stored question type on reads. Older comma-separated choices
  remain readable; text such as `123` stays text.

## Guests

Only activities with `skip_login=true` accept guest RSVPs. A guest sheet's
respondent is a server-generated `guest_<random UUID>`; it never becomes a
real account's user ID. RSVP `user_id` stays null. Standalone anonymous survey
submission is rejected, matching the standalone UI's existing login requirement.
Activity-specific questionnaires are submitted through the RSVP flow.

Successful guest registration returns a 7-day cancellation capability. It is
HMAC-SHA256 authenticated using a domain-separated key derived from the existing
server `JWT_SECRET`, and binds purpose, RSVP ID, activity ID and expiry. Its
format is separate from login JWTs. It grants only cancellation of that exact
account-unbound record; it cannot read or edit answers, approve registration,
choose other IDs, or act as a logged-in user. Cancellation is idempotent while
the receipt remains valid, not a general login or a one-time token.

The detail page keeps the receipt in sessionStorage, keyed by activity/date,
and provides a guest cancellation button. The token is sent in a POST body,
never a URL. Closing the browser session, losing storage, expiry or signing-key
rotation can remove this self-service path; an organizer can still cancel the
record. Existing historical guest RSVPs receive no retroactive credentials.
Guests without any receipt cannot claim records using a name or WeChat ID.

The backend checks signing configuration before accepting a guest registration.
Verify the existing server-only `JWT_SECRET` in production and preview Functions
before rollout. Do not expose it through client variables. The broader F09
secret-scope cleanup remains separate; this PR does not modify Netlify secrets.

## Recurring activities

Signup never changes an existing episode's date, number, theme or description.
Existing episodes are selected by stored activity/date and checked against any
supplied episode number/ID. For a missing virtual next episode, derive the date
and number from the activity's stored schedule and create it with conflict-ignore
semantics. Arbitrary future dates and mismatched numbers are rejected.

The existing database uniqueness is `(meetup_id, episode_number)` without a
year component. If an older year already owns the derived number on a different
date, signup returns 409 rather than overwriting history. Organizer resolution
or a separately reviewed episode-identity migration is required in that case.

## Verification and deployment

185 Vitest cases pass: 76 new F05 cases and 109 previous security/regression
cases. Coverage includes both submission aliases, forgery, lifecycle and lookup
failures, foreign/duplicate/invalid/missing answers, guest boundaries, cleanup
scope on database/network errors, existing-sheet reuse, typed stored answers,
capability tampering/expiry/scope, and existing/virtual/conflicting episodes.
Three affected Netlify Functions and both modified pages bundle successfully.
The live schema's answer foreign keys and conflict targets were checked using
read-only metadata queries; no production submissions, emails or RSVPs were made.

After the prerequisite PRs, merge/deploy this PR's backend and frontend together.
Refresh old cached activity pages: old two-request guest/questionnaire flows
are deliberately rejected. Netlify's PR preview supplies the full build check.
Use synthetic test accounts/data to smoke test member and guest questionnaire
registration, guest cancellation after a page refresh, normal standalone survey
submit/edit, and organizer participant/answer views. Verify original records
remain after an intentionally failed RSVP in an isolated environment.

## Remaining limits

These application checks are not a cross-request database transaction or a
replacement for F03 access restrictions. Capacity and single-submission checks
can still race with parallel requests; a disconnect after a committed write can
leave an uncertain response/orphan. Strict concurrent uniqueness, capacity,
retry idempotency and all-or-nothing RSVP-plus-answer persistence require a
separate database transaction/constraint design. Guest credentials prove
possession of one receipt, not uniqueness of a human visitor; this change does
not provide anti-spam/rate limits (F06). No existing records are reassigned,
exported, repaired, or deleted by rollout.
