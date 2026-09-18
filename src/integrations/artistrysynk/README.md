# ArtistrySynk integration — v1 (real API)

ArtistrySynk Creatives Talent Hunt owns competitions. ArtistrySynk owns creative identity. This
folder is the only place that talks to ArtistrySynk, and every call is
server-side.

## Files

- `types.ts` — connection status, permitted profile projection, results.
- `client.ts` — `ArtistrySynkIdentityProvider` boundary interface.
- `api.server.ts` — HTTP transport. Discovery (RFC 9728 protected-resource
  metadata + OIDC `openid-configuration`), then only the documented endpoints:
  `GET /identity/lookup`, `POST /identity/create`,
  `POST /identity/link/start`, `POST /identity/link/complete`,
  `GET /profile/{identity_id}`, `POST /revoke`, plus the discovered token
  endpoint. No endpoint is hard-coded or invented.

## Two connection paths

1. **New identity (default).** `prepareIdentity` looks the external subject up
   (`identity:read`); when there is none it calls `POST /identity/create`, which
   returns a short-lived single-use **claim intent** (`intent_id`, `claim_url`,
   `expires_at`, `status`). ZGT stores the intent server-side and opens the
   `claim_url`; the contestant claims the identity on ArtistrySynk with their own
   sign-up/sign-in. On return, `finalizeClaim` verifies the identity through
   `identity/lookup` and attaches it. Creating an identity is never silent, and
   no ArtistrySynk password ever reaches ZGT.
2. **Existing ArtistrySynk account.** A `409 conflict` (email already belongs to
   an ArtistrySynk identity) returns `EXISTING_ACCOUNT`; the UI then offers
   "Connect existing ArtistrySynk account", which uses the OAuth/PKCE link flow.

The `POST /identity/create` body is exactly `external_subject` (stable ZGT user
subject, trimmed, ≤200 chars), `redirect_uri` (registered HTTPS callback, no
fragment), `scopes` (`identity:create`, `identity:read`, `profile:read`) and the
optional `email`. `display_name`, `username`, `location`, `discipline` and any
password are never sent. Each genuinely new attempt carries a fresh
`Idempotency-Key`; a live unclaimed intent is reused from storage instead.

- `links.server.ts` — one-time hashed OAuth state (intents) and link storage.
- `provider.server.ts` — `RemoteArtistrySynkProvider`: begin/complete
  connection, status, disconnect, duplicate-identity rejection.
- `index.ts` — client-safe brand constants only.

Callers use `src/lib/artistrysynk.functions.ts` (authenticated server
functions). UI uses `src/components/artistrysynk/ConnectArtistrySynk.tsx` and
the popup callback route `src/routes/oauth.artistrysynk.return.tsx`.

## Environment

Two distinct confidential clients, both server-only:

- `ARTISTRYSYNK_SIGNIN_CLIENT_ID` / `ARTISTRYSYNK_SIGNIN_CLIENT_SECRET` — user
  sign-in/approval flow and the authorization-code token exchange. Falls back to
  the legacy `ARTISTRYSYNK_CLIENT_ID` / `ARTISTRYSYNK_CLIENT_SECRET` names.
- `ARTISTRYSYNK_API_CLIENT_ID` (defaults to `zgt-prod-aa3c2403c67a4cb6`) /
  `ARTISTRYSYNK_API_CLIENT_SECRET` — direct Integration API calls: link start,
  link complete, profile read, revoke.
- `ARTISTRYSYNK_BASE_URL` — optional, defaults to `https://artistrysynk.app`.

Scopes requested: `identity:link`, `profile:read`.

## Storage

- `artistrysynk_link_intents` — one-time state hash, redirect URI, expiry.
- `artistrysynk_links` — opaque `identity_id`/`link_id`, scopes, status and the
  approved profile projection.
- `profiles.artistrysynk_identity_ref` / `artistrysynk_provider` — the verified
  reference, written by the guarded `artistrysynk_apply_link` routine.

Both tables are service-role only. No client secret, access token or refresh
token is ever stored or returned to the browser.

## Production configuration still required

The exact `redirect_uri` used by this app
(`https://<host>/oauth/artistrysynk/return`, for every host in use — preview,
`ziksgottalent.com`, `www.ziksgottalent.com`) must be registered on the
ArtistrySynk OAuth client. Unregistered URIs are rejected with
`invalid_redirect_uri`.
