/**
 * Contracts for the ArtistrySynk identity platform.
 *
 * IMPORTANT: ArtistrySynk (artistrysynk.app) owns creative identity. Zik's Got
 * Talent (ziksgottalent.com) owns competitions only. Nothing in this project
 * may become a second identity store — competition entities reference an
 * ArtistrySynk identity through the opaque `identityRef` below.
 *
 * These shapes are OUR expectation of the eventual contract, and are
 * intentionally minimal. They are not a claim about existing endpoints.
 */

export type IdentityProvider = "local" | "artistrysynk";

export interface ArtistrySynkIdentity {
  /** Opaque reference every competition entity stores. */
  identityRef: string;
  provider: IdentityProvider;
  email: string;
  displayName: string;
  /** Canonical ArtistrySynk handle, once the real platform assigns one. */
  handle: string | null;
  createdAt: string;
}

export interface CreativeProfile {
  identityRef: string;
  displayName: string;
  handle: string | null;
  bio: string;
  location: string;
  primaryDiscipline: string;
  links: Array<{ label: string; url: string }>;
  avatarUrl: string | null;
  isPublic: boolean;
}

export interface CreateIdentityInput {
  email: string;
  displayName: string;
  location?: string;
  primaryDiscipline?: string;
}

export type CreativeProfilePatch = Partial<
  Omit<CreativeProfile, "identityRef" | "handle" | "isPublic">
> & { isPublic?: boolean };

/** Result of the register-time identity step, surfaced in the UI honestly. */
export interface IdentityResolution {
  identity: ArtistrySynkIdentity;
  outcome: "CREATED" | "LINKED_EXISTING";
}
