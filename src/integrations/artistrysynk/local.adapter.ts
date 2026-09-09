import { artistrysynkProfileUrl } from "@/config/app";
import type { ArtistrySynkIdentityProvider } from "./client";
import type {
  ArtistrySynkIdentity,
  CreateIdentityInput,
  CreativeProfile,
  CreativeProfilePatch,
  IdentityResolution,
} from "./types";

/**
 * Phase 1 adapter.
 *
 * It satisfies the ArtistrySynkClient contract using local, in-session storage
 * so the registration flow is real and testable, WITHOUT inventing ArtistrySynk
 * endpoints and WITHOUT becoming a second identity database. Identities created
 * here are marked `provider: "local"` and carry a stable email key, so they can
 * be reconciled against real ArtistrySynk identities by email/external id when
 * the platform integration lands.
 *
 * See ./README.md for the credentials and contract still required.
 */

const identities = new Map<string, ArtistrySynkIdentity>();
const profiles = new Map<string, CreativeProfile>();
const links = new Map<string, string>();

function refFor(email: string): string {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return `local_${hash.toString(36)}`;
}

export class LocalArtistrySynkAdapter implements ArtistrySynkIdentityProvider {
  readonly provider = "local" as const;

  async findIdentityByEmail(email: string): Promise<ArtistrySynkIdentity | null> {
    return identities.get(refFor(email)) ?? null;
  }

  async createIdentity(input: CreateIdentityInput): Promise<ArtistrySynkIdentity> {
    const identityRef = refFor(input.email);
    const identity: ArtistrySynkIdentity = {
      identityRef,
      provider: "local",
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      handle: null,
      createdAt: new Date().toISOString(),
    };
    identities.set(identityRef, identity);
    profiles.set(identityRef, {
      identityRef,
      displayName: identity.displayName,
      handle: null,
      bio: "",
      location: input.location ?? "",
      primaryDiscipline: input.primaryDiscipline ?? "",
      links: [],
      avatarUrl: null,
      isPublic: false,
    });
    return identity;
  }

  async resolveIdentity(input: CreateIdentityInput): Promise<IdentityResolution> {
    const existing = await this.findIdentityByEmail(input.email);
    if (existing) return { identity: existing, outcome: "LINKED_EXISTING" };
    return { identity: await this.createIdentity(input), outcome: "CREATED" };
  }

  async linkIdentity(localUserId: string, identityRef: string): Promise<void> {
    links.set(localUserId, identityRef);
  }

  async isIdentityLinked(localUserId: string): Promise<boolean> {
    return links.has(localUserId);
  }

  async getLinkedIdentity(localUserId: string): Promise<ArtistrySynkIdentity | null> {
    const ref = links.get(localUserId);
    return ref ? identities.get(ref) ?? null : null;
  }

  async getCreativeProfile(identityRef: string): Promise<CreativeProfile | null> {
    return profiles.get(identityRef) ?? null;
  }

  async upsertCreativeProfile(
    identityRef: string,
    patch: CreativeProfilePatch,
  ): Promise<CreativeProfile> {
    const current: CreativeProfile = profiles.get(identityRef) ?? {
      identityRef,
      displayName: "",
      handle: null,
      bio: "",
      location: "",
      primaryDiscipline: "",
      links: [],
      avatarUrl: null,
      isPublic: false,
    };
    const next: CreativeProfile = { ...current, ...patch, identityRef };
    profiles.set(identityRef, next);
    return next;
  }

  profileUrl(identityRef: string): string {
    // The canonical destination pattern is owned by ArtistrySynk and comes from
    // configuration — never hard-coded here.
    return artistrysynkProfileUrl(identities.get(identityRef)?.handle ?? null);
  }
}
