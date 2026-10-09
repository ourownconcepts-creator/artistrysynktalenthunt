# ArtistrySynk Creatives Talent Hunt — roadmap

## Done
- Full rebrand to ArtistrySynk Creatives Talent Hunt; ZGT references and the
  ArtistrySynk identity/OAuth integration removed from active code.
- Talent Directory at /talent and /talent/$handle: permanent public profiles,
  search/filter/pagination (24/page), competition history and real badges only.
- profiles_guard_identity protects verification_status/featured_until; RLS holds.
- Email config moved to artistrysynk.app: auth webhook sender/links, entry
  emails from noreply@artistrysynk.app, admin alerts to admin@artistrysynk.app.
- Obsolete ZGT_ADMIN_EMAIL / ZGT_EMAIL_FROM secrets deleted.
- BrandLogo component: dark-lettered logo on light surfaces, white on dark.

## Open (blocked on user)
- Email domain: artistrysynk.app not yet selected as this project's email
  domain — user picks it via the email-setup button, then branded sign-in
  emails and a real send test can be done.
- QueenSMTP: noreply@artistrysynk.app must be approved as a sender in the
  QueenSMTP account, or entry emails will be refused.
- Six ARTISTRYSYNK_* secrets (client ID/secret pairs) unread by active code —
  awaiting user's go-ahead to delete.
- GitHub sync: user must connect the repo in Lovable and switch the editor to
  remove-zgt-integration; not verifiable from here until then.
- Migration numbering: profile migration applied as 0012 (0011 was last);
  renumbering to 0014 would break the journal — decision pending.
- No creative accounts exist yet — the first real entry is the first true
  end-to-end test.
