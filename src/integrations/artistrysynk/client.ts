import type {
  ArtistrySynkIdentity,
  CreateIdentityInput,
  CreativeProfile,
  CreativeProfilePatch,
  IdentityResolution,
} from "./types";

/**
 * THE INTEGRATION BOUNDARY.
 *
 * Every part of Zik's Got Talent that touches identity or creative profiles
 * goes through this interface — nothing else. Swapping the Phase 1 local
 * adapter for a real ArtistrySynk adapter must require zero changes outside
 * src/integrations/artistrysynk.
 */
export interface ArtistrySynkClient {
  readonly provider: "local" | "artistrysynk";

  findIdentityByEmail(email: string): Promise<ArtistrySynkIdentity | null>;

  /** New Zik's Got Talent registrant → ArtistrySynk identity. */
  createIdentity(input: CreateIdentityInput): Promise<ArtistrySynkIdentity>;

  /** Create-or-link in one call; used by the registration wizard. */
  resolveIdentity(input: CreateIdentityInput): Promise<IdentityResolution>;

  /** Bind a Zik's Got Talent session user to an existing ArtistrySynk identity. */
  linkIdentity(localUserId: string, identityRef: string): Promise<void>;

  getCreativeProfile(identityRef: string): Promise<CreativeProfile | null>;

  upsertCreativeProfile(identityRef: string, patch: CreativeProfilePatch): Promise<CreativeProfile>;

  /** Canonical public profile destination on ArtistrySynk. */
  profileUrl(identityRef: string): string;
}
