# ArtistrySynk integration boundary

Zik's Got Talent owns **competitions**. ArtistrySynk owns **creative identity**.
This directory is the only place in the codebase allowed to know about
ArtistrySynk. Everything else depends on `ArtistrySynkClient` (see `client.ts`).

## Current state (Phase 1)

- `LocalArtistrySynkAdapter` implements the contract with local in-session
  storage. Identities it produces are tagged `provider: "local"`.
- No ArtistrySynk endpoints, table names, user IDs, or secrets are assumed or
  fabricated anywhere in this project.
- No competition entity stores identity attributes — only an opaque
  `identityRef`.

## What is required to connect the real platform

1. **Base API URL** for ArtistrySynk (e.g. `ARTISTRYSYNK_API_URL`).
2. **Machine-to-machine credential** for server-to-server calls, stored as a
   secret (`ARTISTRYSYNK_API_KEY` or OAuth client id/secret). Never in client code.
3. **Identity lookup contract** — find an identity by email (or by SSO subject),
   and the canonical id field to persist as `identityRef`.
4. **Identity create/link contract** — create an ArtistrySynk identity for a new
   Zik's Got Talent registrant, and link an existing one without duplicating it.
   Must be idempotent per email/subject.
5. **Creative profile read/write contract** — fields, validation, and which
   fields Zik's Got Talent may write on the user's behalf.
6. **Session strategy** — SSO / OIDC issuer + client, or a token-exchange
   endpoint so an ArtistrySynk-authenticated user is recognised here without a
   second password.
7. **Canonical public profile URL pattern** (for `profileUrl()`).
8. **Media policy** — whether approved audition media may be mirrored into the
   ArtistrySynk profile, and under what rights/consent.

## Rules

- Never create a second ArtistrySynk user database here.
- Never widen the interface to leak ArtistrySynk internals into competition code.
- Registration UI must state plainly that an ArtistrySynk profile is created or
  connected. Do not hide it.
