# Participant and survey access: first security rollout

This change protects participant administration and existing survey responses.
It does not change database grants or apply a production migration.

## Intended access

| Operation                                | Allowed caller                                   |
| ---------------------------------------- | ------------------------------------------------ |
| Participant list and approval statistics | Organizer                                        |
| Batch approval/rejection                 | Organizer, POST only                             |
| All responses to a survey                | Organizer or that survey's creator               |
| My response list and submission check    | Authenticated respondent, resolved by the server |
| Edit a response                          | Its authenticated respondent, POST/PUT only      |

The existing public survey/guest submission routes are outside this change.
Other audit findings, including RSVP access, legacy survey management, direct
database access and Markdown rendering, still need separate fixes. Merging this
PR does not complete the audit remediation.

## Compatibility

- The frontend already restricts participant administration to organizers.
- Survey creators retain access to their own results.
- Existing client respondent ID parameters are accepted but cannot choose
  another person's response list; the verified caller determines the scope.
- A first-time respondent receives a successful null submission check.
- Batch email notifications remain available to organizers. Approver names
  come from the verified server profile instead of request data.
- Answer edits must use questions from the submission's survey.

## Preview and post-deploy verification

1. Sign in as an organizer: view participant statistics, paginated rows and
   survey answers. On a test activity, approve/reject a test registration.
2. Sign in as an ordinary survey creator: view that survey's results.
3. As a respondent: open the survey, see prior answers and edit one answer.
   As a first-time respondent, verify that the form loads normally.
4. As a different member: confirm that other creators' result lists and
   other respondents' edits are denied.
5. Without authentication: confirm participant lists, batch operations,
   existing-response reads and edits return 401 without data or side effects.
6. Confirm the deployed commit, then repeat the read-only anonymous checks.

Automated tests use in-memory fixtures and mock email delivery. They do not
modify production records or send real messages. Authenticated browser checks
still require signed-in test accounts; a production write test should use
designated test records.
