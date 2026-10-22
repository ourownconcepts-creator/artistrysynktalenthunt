# Launch-readiness audit — ArtistrySynk Creatives Talent Hunt (read-only)

Nothing was changed. Evidence comes from code reads and one read-only database query run on 22 Oct 2026.

## Verdict: NOT READY TO LAUNCH

The code is broadly in place, but the live database has **no competition, no admin, no judges and no scoring criteria**. Nobody can register, review entries or score them right now. Consent is also not stored, and no flow has been tested end to end.

## VERIFIED

- 30+ routes are present: public pages (index, about, how-it-works, rules, terms, privacy, competitions, categories, talent, contestants, sponsors, announcements, track, vote), auth, dashboard, judge, and admin (applications, submissions, judging, voting, lifecycle, entries detail, competitions).
- Accounts are local to this project. Existing ArtistrySynk accounts are **not** reused, because each project has its own sign-in system. Email/password and Google sign-in are available (`src/routes/auth.tsx`).
- Database: 2 auth users, 0 applications, 0 role rows, 0 competitions, 0 scoring criteria, 0 judge assignments.
- RLS: owner-only policies on `applications` and `profiles` for read, insert and update, with no DELETE. `scores` has judge insert/update policies. `votes` can only be written through `cast_vote`. `user_roles`, `audit_log` and `score_corrections` are read-only to clients.
- Storage: there is one bucket, `avatars`, and it is private.
- Trust fields are protected: `profiles_guard_identity` stops users setting their own verification or featured status.
- Entry form validation uses zod in `RegistrationWizard.tsx` (personal, identity and creative steps). All consent boxes must be ticked before submit.
- The privileged workflow runs through security-definer routines: review, advance, decide result, correct score, void votes, lifecycle status guards, and audit feed.
- No ZGT or ziksgottalent references remain in `src/`.
- `<html lang="en">` is set, and each route has its own head() metadata.

## NOT VERIFIED (could not be inspected or tested)

- Real send of sign-in, entry-confirmation or admin emails. The QueenSMTP sender approval and the email domain choice are still pending.
- Whether DNS for talenthunt.artistrysynk.app resolves and SSL is issued.
- The full deep security scan. It needs to be run from the Security tab.
- Screen-reader and keyboard behaviour, mobile layouts at real sizes, and Lighthouse/performance results.
- Data retention or deletion processes. Nothing about these is visible in code.
- Whether server-side checks re-validate every field that the browser-side form checks.

## MISSING / DEFECTIVE

| # | Sev | Finding | Evidence | Next action |
|---|-----|---------|----------|-------------|
| 1 | P0 | No competition exists, so `/register` shows "No competition is open" | `competitions` table is empty | Create the season, categories, rounds and dates in admin |
| 2 | P0 | No admin or staff roles assigned | `user_roles` count is 0 | Run `claim_first_admin` as the owner, then grant judge and moderator roles |
| 3 | P0 | No scoring criteria or judge assignments, so judging cannot run | Both counts are 0 | Configure criteria and assign judges per category |
| 4 | P0 | Consent is checked in the browser only and not saved with the entry, so there is no proof of consent | `RegistrationWizard.tsx` submit sends no consents; `applications` has no consent column | Store accepted consent text, version and timestamp on the entry, and enforce this on the server |
| 5 | P1 | No automated tests of any kind | No *.test / *.spec files | Add tests for vote limits, scoring windows, role checks and entry submission |
| 6 | P1 | Minors and guardian consent are mentioned in the privacy copy but not enforced | `privacy.tsx:40`; `date_of_birth` is nullable; no guardian fields | Decide the age policy; add an age check or guardian capture |
| 7 | P1 | No end-to-end run done (sign up, enter, review, score, vote, result) | 0 applications | Do a full dry run with test accounts before launch |
| 8 | P1 | Emails are unconfirmed and failures are silent. Entry emails swallow errors and no resend tool was found | `RegistrationWizard.tsx` empty catch | Finish the email domain and QueenSMTP setup; add a failure log or resend option |
| 9 | P1 | No winner/prize workflow beyond round outcomes. Prize pool is free text and there is no winner announcement or prize-claim record | `round_results` only; `prize_pool` text | Define the final-round winner publication and prize fulfilment steps |
| 10 | P1 | Copyright/licence terms for submitted work are not shown as a specific consent | Consent list comes from data (currently empty) | Add licence/usage and originality consents to the competition setup |
| 11 | P2 | No direct media upload; entries are links only | `RegistrationWizard.tsx:498` | Acceptable for v1; record it as a known limitation |
| 12 | P2 | No account or data deletion path; retention period not stated | No delete policy; privacy page | Add a retention statement and a deletion request process |
| 13 | P2 | Lint errors (formatting) are still present | Earlier lint run | Run the formatter |
| 14 | P2 | Profile photo links expire after 24 hours | `talent.ts` signed URLs | Refresh links on page view |
| 15 | P2 | Site and email links point to artistrysynk.app, not the talenthunt subdomain | `src/config/app.ts`, email config | Update once DNS resolves |

## Remediation plan (in order)

1. Claim the first admin and grant judge and moderator roles (P0-2).
2. Configure the competition: season, categories, rounds, scoring criteria, judge assignments, consents including copyright, and dates (P0-1, P0-3, P1-10).
3. Save consent with each entry and enforce it on the server (P0-4). Decide the age and guardian policy (P1-6).
4. Finish email setup: email domain, QueenSMTP sender, test sends, and a resend option (P1-8).
5. Define the winner and prize workflow (P1-9).
6. Add tests for the core rules, then do a full dry run with test accounts (P1-5, P1-7).
7. Run the deep security scan, then an accessibility and mobile pass.
8. Clean up P2 items, switch to the subdomain, and publish.
