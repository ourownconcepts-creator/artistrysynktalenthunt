# Zik's Got Talent — roadmap

## Done
- Twelve real contestant entries seeded across categories with judge marks and
  public votes, so Contestants, Shortlists and Moderation show live records.
- Contestant portal shows the stage, progress state, decision note and time of
  the last admin change, refreshing on its own.
- Admin panel complete: contestant records, round shortlists, moderation
  (flagged voting, media queue, score corrections) and settings (team roles,
  integrations) now live alongside the existing admin sections.
- ArtistrySynk portal at `/artistrysynk`: a connected creative sees their entry,
  entry code, status and round progress, with links to the fuller dashboard
  views. Linked from the dashboard profile page.
- Production return address wired for ArtistrySynk connections.
- Public entry tracking at `/track` with per-entry reference codes.
- Stage-change and entry alert emails sent through QueenSMTP.

- Public contestant portal at `/track` in the gold-on-white look of the entry
  alerts: category browsing, entry route and code-based stage tracking.
- Admin "Creative identities" panel: ArtistrySynk status per entrant, pending
  claim expiry, linked identity, and a one-off invitation sender.
- Connection invitation emailed to ourownconcepts@gmail.com.

## Open (blocked)
- Sending from notify.ziksgottalent.com is refused by the email service until
  that exact subdomain is verified there; entry alerts and the invitation go out
  from ziksgottalent.com meanwhile.
- Branded sign-in emails from notify.ziksgottalent.com are built and styled;
  they start sending as soon as the domain's DNS check finishes.
- Approve the Demo Connect Act entry — waiting on the user to approve the
  ArtistrySynk consent so the linked profile can be verified first.

## Release Gate 1 (security) — 12 Sep 2026
- Fixed: artistrysynk_apply_link was executable by any signed-in user with an arbitrary target user (identity hijack). EXECUTE revoked to service_role only.
- Added profiles_guard_identity trigger: Data API callers cannot write artistrysynk_identity_ref/provider.
- Unique indexes: one ArtistrySynk identity per ZGT profile; one CONNECTED link per identity.
- Least privilege: anon is read-only on all tables; writes to user_roles, votes, audit_log, score_corrections, round_results and applications review columns only via guarded routines; artistrysynk_links/intents are service-role only.
- Launch requirements: enable email confirmation in production auth; verify notify.ziksgottalent.com DNS; no storage buckets exist (audition media is external URLs).
