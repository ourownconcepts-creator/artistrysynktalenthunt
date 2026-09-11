# Fix ArtistrySynk PKCE Identity Link

## Goal
Repair the existing ArtistrySynk connection without changing credentials, scopes, registered return addresses, or the integration boundary. Keep the test entry unapproved.

## Implementation
- Add a server-only PKCE helper that generates a high-entropy verifier and `S256` base64url challenge using Web Crypto-compatible primitives.
- Extend the ArtistrySynk start request with `code_challenge`, `code_challenge_method: "S256"`, and the existing secure state.
- Extend token exchange with the matching stored `code_verifier`; never return, log, or expose it to browser code.
- Improve provider error parsing so field-level validation details are logged as safe field/issue diagnostics while users receive non-sensitive messages.

## Temporary Transaction Security
- Add server-only transaction fields for the PKCE verifier and an atomic processing claim.
- Persist the transaction before requesting the authorization URL, then attach the returned intent ID and provider expiry.
- Validate state hash, signed-in user, expiry, and single-use status before exchange.
- Atomically claim callbacks to prevent parallel/replayed processing; mark consumed only after successful exchange and safely release a claim only for retryable provider outages.
- Preserve exact redirect URI, requested scopes, existing CSRF middleware, confidential credentials, and server-only link/profile storage.

## Callback and Identity Attachment
- Keep the existing same-origin popup relay at `/oauth/artistrysynk/return`.
- Handle cancellation distinctly from invalid callbacks.
- Complete the token exchange and identity link on the server, save only the approved profile projection, and apply the verified identity reference to the existing contestant/application.
- Preserve disconnect/reconnect behavior and duplicate-identity rejection.

## Tests and Verification
- Add automated coverage for PKCE generation/request shape, missing or short state/challenge, incorrect verifier exchange, state mismatch, expiry, replay/duplicate callbacks, cancellation, success, identity attachment, disconnect/reconnect, and provider unavailability.
- Apply the additive database migration, regenerate database types, and run focused tests plus type/build validation.
- Run the live flow as `zgt.connect.demo@example.com`: open ArtistrySynk consent, approve it, verify the Connected state, and confirm “Demo Connect Act” has one opaque identity reference plus only name, username, avatar, and location from the approved profile projection.
- Do not approve the competition entry.

## Expected Files
- ArtistrySynk server transport, provider, and transaction-storage modules
- Focused ArtistrySynk test files
- One additive database migration and regenerated database types
- Popup UI only if cancellation/error-state handling needs a narrow correction
