# Zik's Got Talent — roadmap

## Done
- Production return address wired: ArtistrySynk connections use the registered
  return addresses only (production first), configurable via
  `ARTISTRYSYNK_RETURN_ORIGINS`.
- Public entry tracking: every entry gets a reference code, `/track` looks up a
  stage with code + email, code shown in the dashboard and in the entry
  confirmation email.
- Stage-change emails already sent through QueenSMTP for every decision.

## Open (blocked)
- Branded account-confirmation and password-reset emails — waiting on the email
  domain setup dialog to be completed by the user.
- Approve the Demo Connect Act entry through the round states — waiting on the
  user to sign in as zgt.connect.demo@example.com and approve ArtistrySynk
  consent, so the linked profile can be verified first.
