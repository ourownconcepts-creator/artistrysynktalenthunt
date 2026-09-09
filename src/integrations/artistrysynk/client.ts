import type {
  ArtistrySynkIdentity,
  CreateIdentityInput,
  CreativeProfile,
  CreativeProfilePatch,
  IdentityResolution,
} from "./types";

/**
 * THE INTEGRATION BOUNDARY — the ArtistrySynk identity provider contract.
 *
 * Every part of Zik's Got Talent that touches identity or creative profiles
 * goes through this interface — nothing else. Swapping the temporary local
 * provider for a real ArtistrySynk provider must require zero changes outside
 * src/integrations/artistrysynk.
 */
export interface ArtistrySynkIdentityProvider {
  readonly provider: "local" | "artistrysynk";

  /** Find an existing ArtistrySynk identity. */
  findIdentityByEmail(email: string): Promise<ArtistrySynkIdentity | null>;

  /** New Zik's Got Talent registrant → ArtistrySynk identity. */
  createIdentity(input: CreateIdentityInput): Promise<ArtistrySynkIdentity>;

  /** Create-or-link in one call; used by the registration wizard. */
  resolveIdentity(input: CreateIdentityInput): Promise<IdentityResolution>;

  /** Bind a Zik's Got Talent session user to an existing ArtistrySynk identity. */
  linkIdentity(localUserId: string, identityRef: string): Promise<void>;

  /** Is this session user already linked to an ArtistrySynk identity? */
  isIdentityLinked(localUserId: string): Promise<boolean>;

  /** The linked identity for a session user, if any. */
  getLinkedIdentity(localUserId: string): Promise<ArtistrySynkIdentity | null>;

  getCreativeProfile(identityRef: string): Promise<CreativeProfile | null>;

  /** Create or update the minimum required creative profile information. */
  upsertCreativeProfile(identityRef: string, patch: CreativeProfilePatch): Promise<CreativeProfile>;

  /** Canonical public profile destination on ArtistrySynk. */
  profileUrl(identityRef: string): string;
}

/** Legacy alias kept so existing imports keep working. */
export type ArtistrySynkClient = ArtistrySynkIdentityProvider;
