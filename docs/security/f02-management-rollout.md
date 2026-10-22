# F02: management authorization

This batch builds on PR #71. Merge #71 before this PR.
It changes application authorization, with no production SQL or environment changes.

## Access rules

| Action                                            | Allowed caller                                  |
| ------------------------------------------------- | ----------------------------------------------- |
| Create activity or survey                         | Signed-in user; owner is assigned by the server |
| Edit/cancel activity; edit/delete/enable survey   | Stored owner or organizer                       |
| Edit an activity's linked survey questions        | Survey owner or organizer as well               |
| Approve/update registrations                      | Organizer                                       |
| Cancel registration through any legacy alias      | The account owning that row, or organizer       |
| Change speaker signup status; create weekly cards | Organizer                                       |
| Read legacy workshop registration list            | Organizer                                       |

Mutation handlers reject GET. Public browsing and public speaker registration
remain available. Guest RSVP remains available for activities with skip_login
enabled; a supplied user_id cannot impersonate a logged-in account.

For legacy unbound guest RSVPs, a WeChat ID is not proof of identity.
An organizer must cancel those records. Logged-in cancellation by ID and the
legacy activity/WeChat fallback continue to work only for the caller's rows.
This deliberately removes the unauthenticated cancellation vulnerability.
No new guest cancellation token or account-claiming mechanism is introduced.

Public legacy workshop registrations always start unpaid. A request cannot
claim payment status. The legacy workshop table was absent during the audit;
this PR does not recreate it.

## Validation

Local verification: all 109 tests passed, including 61 new F02 cases and
48 prerequisite/existing regression cases. All seven modified Netlify
Functions bundled successfully. See the PR checks for the deployment result.

Automated tests cover unauthenticated requests, unrelated members, stored
owners, organizers, all cancellation aliases, forged owner/approver inputs,
cross-owner linked surveys, safe HTTP methods and public compatibility.
The fixtures use a database query double and mock mail; no production records
or real messages are used.

On the Deploy Preview, verify with designated test records:

1. Owner: create/edit/cancel an activity, create/edit/enable/delete a survey.
2. Another member: repeat against those records and confirm rejection.
3. Organizer: approve a test registration, cancel a guest registration,
   change speaker status and create a test weekly card.
4. Respondent: cancel their own RSVP by ID and confirm another user's
   registration remains unchanged.
5. Visitor: browse activities/surveys and register for a guest-enabled activity;
   confirm guest-disabled activity registration requires login.

Production write tests must use explicit test records. The rollout includes
read-only unauthenticated preview checks; signed-in browser workflows still
need a test-account session.

## Remaining remediation

Do not interpret these handler checks as a complete security fix:

- F03: direct database grants and broad RLS policies still need tightening.
- F04: Markdown rendering is separate.
- F05: survey answer identity/link validation, RSVP survey-submission
  compensation and episode upserts need their own integrity changes.
- Legacy RSVP read projections and other audit findings remain.

F02's participant batch operations and response edit permissions are covered
by the prerequisite PR #71. This PR covers the remaining explicit management
actions and keeps resource ownership decisions on the server.
