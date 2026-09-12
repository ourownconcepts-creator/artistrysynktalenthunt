/**
 * The real ArtistrySynk identity provider (Integration API v1). Server-only.
 */

import { artistrysynkProfileUrl } from "@/config/app";
import {
  ARTISTRYSYNK_CREATE_SCOPES,
  ARTISTRYSYNK_SCOPES,
  ArtistrySynkError,
  completeLink,
  createIdentityIntent,
  exchangeCode,
  lookupIdentity,
  readArtistrySynkConfig,
  readProfile,
  requireArtistrySynkConfig,
  revokeLink,
  startLink,
  type ArtistrySynkProfileProjection,
} from "./api.server";
import type { ArtistrySynkIdentityProvider } from "./client";
import {
  applyIdentityToApplications,
  claimIntent,
  consumeClaimedIntent,
  consumeIntent,
  deleteIntent,
  externalSubjectFor,
  finalizeIntent,
  findConflictingLink,
  getLink,
  getPendingClaimIntent,
  hashState,
  markRevoked,
  recordIntent,
  releaseIntentClaim,
  saveLink,
} from "./links.server";
import { createPkceTransaction, isValidCodeVerifier, isValidState } from "./pkce.server";
import type {
  ArtistrySynkConnectResult,
  ArtistrySynkConnection,
  ArtistrySynkFailureReason,
  ArtistrySynkIdentity,
} from "./types";

function toIdentity(
  identityId: string,
  projection: ArtistrySynkProfileProjection | Record<string, never> | null,
): ArtistrySynkIdentity {
  const p = (projection ?? {}) as Partial<ArtistrySynkProfileProjection>;
  return {
    identityRef: identityId,
    username: p.username ?? null,
    displayName: p.display_name ?? null,
    bio: p.bio ?? null,
    avatarUrl: p.avatar_url ?? null,
    coverImageUrl: p.cover_image_url ?? null,
    location: p.location ?? null,
    country: p.country ?? null,
    city: p.city ?? null,
    isVerified: Boolean(p.is_verified),
    professionalVerified: Boolean(p.professional_verified),
  };
}

/** Map contract error codes to the states the interface promises the UI. */
function reasonFor(error: unknown): { reason: ArtistrySynkFailureReason; message: string } {
  if (error instanceof ArtistrySynkError) {
    switch (error.code) {
      case "not_configured":
        return { reason: "NOT_CONFIGURED", message: "ArtistrySynk is not configured yet." };
      case "temporarily_unavailable":
      case "rate_limited":
        return {
          reason: "UNAVAILABLE",
          message: "ArtistrySynk is temporarily unavailable. Please try again shortly.",
        };
      case "invalid_client":
      case "invalid_token":
      case "insufficient_scope":
        return {
          reason: "UNAUTHORIZED",
          message: "ArtistrySynk refused this request. Please start the connection again.",
        };
      case "conflict":
        return {
          reason: "DUPLICATE_IDENTITY",
          message: "That ArtistrySynk identity is already connected.",
        };
      case "invalid_redirect_uri":
      case "invalid_request":
        return {
          reason: "INVALID_CALLBACK",
          message: "The ArtistrySynk response could not be verified.",
        };
      default:
        return { reason: "FAILED", message: "The ArtistrySynk connection could not be completed." };
    }
  }
  return { reason: "FAILED", message: "The ArtistrySynk connection could not be completed." };
}

/** Entries that inherit the verified identity reference held on the profile. */
async function countLinkedApplications(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("applications").select("id").eq("user_id", userId);
  return (data ?? []).length;
}

export class RemoteArtistrySynkProvider implements ArtistrySynkIdentityProvider {
  readonly provider = "artistrysynk" as const;

  private redirectUri(origin: string): string {
    return new URL("/oauth/artistrysynk/return", origin).toString();
  }

  async beginConnection(userId: string, origin: string) {
    const config = requireArtistrySynkConfig();
    const externalSubject = externalSubjectFor(userId);
    const redirectUri = this.redirectUri(origin);
    const { state, codeVerifier, codeChallenge } = createPkceTransaction();
    const transactionId = await recordIntent({
      userId,
      stateHash: hashState(state),
      redirectUri,
      externalSubject,
      scopes: [...ARTISTRYSYNK_SCOPES],
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      codeVerifier,
    });

    try {
      const intent = await startLink(config, {
        externalSubject,
        redirectUri,
        state,
        codeChallenge,
      });
      await finalizeIntent(transactionId, {
        intentId: intent.intent_id,
        expiresAt: intent.expires_at,
      });
      return { authorizationUrl: intent.authorization_url, expiresAt: intent.expires_at };
    } catch (error) {
      await deleteIntent(transactionId).catch(() => undefined);
      if (error instanceof ArtistrySynkError && error.validation.length > 0) {
        console.error("ArtistrySynk link validation failed", {
          code: error.code,
          requestId: error.requestId,
          validation: error.validation,
        });
      }
      throw error;
    }
  }

  /** Attach a verified identity to this account and its entries. */
  private async attach(
    userId: string,
    externalSubject: string,
    record: {
      identity_id: string;
      link_id?: string | null;
      linked_at?: string | null;
      scopes?: string[] | null;
      profile?: ArtistrySynkProfileProjection | null;
    },
    config: ReturnType<typeof requireArtistrySynkConfig>,
  ): Promise<ArtistrySynkConnectResult> {
    const conflict = await findConflictingLink(record.identity_id, userId);
    if (conflict) {
      return {
        outcome: "FAILED",
        reason: "DUPLICATE_IDENTITY",
        message:
          "That ArtistrySynk identity is already connected to another Zik's Got Talent account.",
      };
    }
    let projection: ArtistrySynkProfileProjection | null = record.profile ?? null;
    if (!projection) {
      try {
        projection = await readProfile(config, { identityId: record.identity_id });
      } catch {
        projection = null;
      }
    }
    await saveLink({
      userId,
      externalSubject,
      identityId: record.identity_id,
      linkId: record.link_id ?? record.identity_id,
      scopes: record.scopes ?? [...ARTISTRYSYNK_CREATE_SCOPES],
      linkedAt: record.linked_at ?? new Date().toISOString(),
      profile: projection,
    });
    await applyIdentityToApplications(userId, record.identity_id);
    return { outcome: "CONNECTED", connection: await this.getConnection(userId) };
  }

  /**
   * Prepare a new creative identity. ArtistrySynk returns a short-lived,
   * single-use claim URL: the contestant claims the identity there, with their
   * own sign-up/sign-in. ZGT sends only the stable subject, the registered
   * return address, the granted scopes and (optionally) the email — never a
   * password, display name, username, location or discipline.
   */
  async prepareIdentity(
    userId: string,
    input: { email?: string | null },
    origin: string,
  ): Promise<ArtistrySynkConnectResult> {
    const config = readArtistrySynkConfig();
    if (!config) {
      return {
        outcome: "FAILED",
        reason: "NOT_CONFIGURED",
        message: "ArtistrySynk is not configured yet.",
      };
    }

    const existing = await getLink(userId);
    if (existing?.status === "LINKED") {
      return { outcome: "CONNECTED", connection: await this.getConnection(userId) };
    }

    const externalSubject = externalSubjectFor(userId);
    const redirectUri = this.redirectUri(origin);

    try {
      // Already claimed on a previous attempt? Then just attach it.
      const known = await lookupIdentity(config, externalSubject);
      if (known?.identity_id) return this.attach(userId, externalSubject, known, config);

      // Reuse a live, unclaimed intent rather than minting another one.
      const pending = await getPendingClaimIntent(userId);
      if (pending?.claim_url) {
        return {
          outcome: "CLAIM_REQUIRED",
          claimUrl: pending.claim_url,
          expiresAt: pending.expires_at,
        };
      }

      const { state, codeVerifier } = createPkceTransaction();
      // One key per genuinely new attempt: replaying a key returns the earlier
      // intent without a claim URL, and a live intent is reused from storage above.
      const intent = await createIdentityIntent(config, {
        externalSubject,
        redirectUri,
        email: input.email ?? null,
        idempotencyKey: randomUUID(),
      });
      if (!intent.claim_url) {
        return {
          outcome: "FAILED",
          reason: "UNAVAILABLE",
          message: `${"ArtistrySynk"} did not return a claim link. Please try again shortly.`,
        };
      }


      await recordIntent({
        userId,
        kind: "CLAIM",
        stateHash: hashState(state),
        intentId: intent.intent_id,
        claimUrl: intent.claim_url,
        redirectUri,
        externalSubject,
        scopes: [...ARTISTRYSYNK_CREATE_SCOPES],
        expiresAt: intent.expires_at,
        codeVerifier,
      });

      return {
        outcome: "CLAIM_REQUIRED",
        claimUrl: intent.claim_url,
        expiresAt: intent.expires_at,
      };
    } catch (error) {
      console.error("ArtistrySynk identity creation intent failed", {
        code: error instanceof ArtistrySynkError ? error.code : "internal_error",
        status: error instanceof ArtistrySynkError ? error.status : 0,
        requestId: error instanceof ArtistrySynkError ? error.requestId : null,
        validation: error instanceof ArtistrySynkError ? error.validation : [],
      });
      if (
        error instanceof ArtistrySynkError &&
        (error.status === 409 || error.code === "conflict" || error.code === "already_exists")
      ) {
        return {
          outcome: "FAILED",
          reason: "EXISTING_ACCOUNT",
          message: "An ArtistrySynk account already exists for this email.",
        };
      }
      return { outcome: "FAILED", ...reasonFor(error) };
    }
  }

  /**
   * After ArtistrySynk redirects back from the claim page: verify the identity
   * now bound to this contestant's subject and attach it.
   */
  async finalizeClaim(userId: string): Promise<ArtistrySynkConnectResult> {
    const config = readArtistrySynkConfig();
    if (!config) {
      return {
        outcome: "FAILED",
        reason: "NOT_CONFIGURED",
        message: "ArtistrySynk is not configured yet.",
      };
    }
    const existing = await getLink(userId);
    if (existing?.status === "LINKED") {
      return { outcome: "CONNECTED", connection: await this.getConnection(userId) };
    }
    const externalSubject = externalSubjectFor(userId);
    try {
      const record = await lookupIdentity(config, externalSubject);
      if (!record?.identity_id) {
        return {
          outcome: "FAILED",
          reason: "CLAIM_INCOMPLETE",
          message:
            "Your ArtistrySynk identity has not been claimed yet. Finish the ArtistrySynk step, then try again.",
        };
      }
      const pending = await getPendingClaimIntent(userId);
      const result = await this.attach(userId, externalSubject, record, config);
      if (result.outcome === "CONNECTED" && pending) {
        await consumeIntent(pending.id).catch(() => undefined);
      }
      return result;
    } catch (error) {
      console.error("ArtistrySynk claim finalization failed", error);
      return { outcome: "FAILED", ...reasonFor(error) };
    }
  }

  async completeConnection(
    userId: string,
    input: { code: string; state: string },
  ): Promise<ArtistrySynkConnectResult> {
    const config = readArtistrySynkConfig();
    if (!config) {
      return {
        outcome: "FAILED",
        reason: "NOT_CONFIGURED",
        message: "ArtistrySynk is not configured yet.",
      };
    }
    if (!input.code || !isValidState(input.state)) {
      return {
        outcome: "FAILED",
        reason: "INVALID_CALLBACK",
        message: "The ArtistrySynk response was incomplete.",
      };
    }

    const claim = await claimIntent(hashState(input.state), userId);
    if (!claim.ok) {
      const message =
        claim.reason === "EXPIRED"
          ? "That ArtistrySynk authorization expired. Please connect again."
          : claim.reason === "ALREADY_USED"
            ? "That ArtistrySynk authorization was already used."
            : "The ArtistrySynk response could not be verified.";
      return { outcome: "FAILED", reason: claim.reason, message };
    }

    try {
      if (!isValidCodeVerifier(claim.intent.code_verifier)) {
        await consumeClaimedIntent(claim.intent.id);
        return {
          outcome: "FAILED",
          reason: "INVALID_CALLBACK",
          message: "The ArtistrySynk response could not be verified.",
        };
      }
      const token = await exchangeCode(config, {
        code: input.code,
        redirectUri: claim.intent.redirect_uri,
        codeVerifier: claim.intent.code_verifier,
      });
      await consumeClaimedIntent(claim.intent.id);
      if (token.expiresAt <= Date.now()) {
        return {
          outcome: "FAILED",
          reason: "EXPIRED",
          message: "That ArtistrySynk authorization expired. Please connect again.",
        };
      }

      const link = await completeLink(config, {
        accessToken: token.accessToken,
        externalSubject: claim.intent.external_subject,
      });

      const conflict = await findConflictingLink(link.identity_id, userId);
      if (conflict) {
        return {
          outcome: "FAILED",
          reason: "DUPLICATE_IDENTITY",
          message:
            "That ArtistrySynk identity is already connected to another Zik's Got Talent account.",
        };
      }

      // The profile projection is a convenience for display; a read failure must
      // not lose a verified link.
      let projection: ArtistrySynkProfileProjection | null = null;
      try {
        projection = await readProfile(config, {
          accessToken: token.accessToken,
          identityId: link.identity_id,
        });
      } catch {
        projection = null;
      }

      await saveLink({
        userId,
        externalSubject: claim.intent.external_subject,
        identityId: link.identity_id,
        linkId: link.link_id,
        scopes: link.scopes ?? [...ARTISTRYSYNK_SCOPES],
        linkedAt: link.linked_at ?? new Date().toISOString(),
        profile: projection,
      });
      await applyIdentityToApplications(userId, link.identity_id);

      return { outcome: "CONNECTED", connection: await this.getConnection(userId) };
    } catch (error) {
      if (error instanceof ArtistrySynkError && error.code === "temporarily_unavailable") {
        await releaseIntentClaim(claim.intent.id).catch(() => undefined);
      } else {
        await consumeClaimedIntent(claim.intent.id).catch(() => undefined);
      }
      console.error("ArtistrySynk link completion failed", {
        code: error instanceof ArtistrySynkError ? error.code : "internal_error",
        requestId: error instanceof ArtistrySynkError ? error.requestId : null,
        validation: error instanceof ArtistrySynkError ? error.validation : [],
      });
      const mapped = reasonFor(error);
      return { outcome: "FAILED", ...mapped };
    }
  }

  async getConnection(userId: string): Promise<ArtistrySynkConnection> {
    const configured = readArtistrySynkConfig() !== null;
    const record = await getLink(userId);

    if (!record) {
      return {
        status: configured ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        configured,
        identity: null,
        scopes: [],
        linkedAt: null,
        profileUrl: null,
        linkedApplications: 0,
      };
    }

    const identity = toIdentity(record.identity_id, record.profile_snapshot);
    const connected = record.status === "LINKED";
    return {
      status: connected ? "CONNECTED" : "REVOKED",
      configured,
      identity: connected ? identity : null,
      scopes: record.scopes ?? [],
      linkedAt: connected ? record.linked_at : null,
      profileUrl: connected ? artistrysynkProfileUrl(identity.username) : null,
      linkedApplications: connected ? await countLinkedApplications(userId) : 0,
    };
  }

  async isIdentityLinked(userId: string): Promise<boolean> {
    const record = await getLink(userId);
    return record?.status === "LINKED";
  }

  async disconnect(userId: string): Promise<void> {
    const record = await getLink(userId);
    if (!record) return;
    const config = readArtistrySynkConfig();
    if (config) {
      try {
        await revokeLink(config, { externalSubject: record.external_subject });
      } catch (error) {
        console.error("ArtistrySynk revoke failed", error);
      }
    }
    await markRevoked(userId);
    await applyIdentityToApplications(userId, null);
  }
}

let provider: RemoteArtistrySynkProvider | null = null;

export function getArtistrySynkProvider(): ArtistrySynkIdentityProvider {
  if (!provider) provider = new RemoteArtistrySynkProvider();
  return provider;
}
