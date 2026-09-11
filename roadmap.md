# Zik's Got Talent — roadmap

## Done
- Admin panel complete: contestant records, round shortlists, moderation
  (flagged voting, media queue, score corrections) and settings (team roles,
  integrations) now live alongside the existing admin sections.
- ArtistrySynk portal at `/artistrysynk`: a connected creative sees their entry,
  entry code, status and round progress, with links to the fuller dashboard
  views. Linked from the dashboard profile page.
- Production return address wired for ArtistrySynk connections.
- Public entry tracking at `/track` with per-entry reference codes.
- Stage-change and entry alert emails sent through QueenSMTP.

## Open (blocked)
- Branded sender domain for sign-in confirmation and password-reset emails —
  waiting on the user to complete the email domain setup dialog. These emails are
  sent by the platform's own sign-in system, not QueenSMTP.
- Approve the Demo Connect Act entry — waiting on the user to approve the
  ArtistrySynk consent so the linked profile can be verified first.
