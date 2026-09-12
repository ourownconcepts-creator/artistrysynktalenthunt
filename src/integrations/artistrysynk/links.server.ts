/**
 * Server-only storage for ArtistrySynk link records and one-time authorization
 * intents. Zik's Got Talent stores an opaque identity reference plus the small
 * approved profile projection needed for display — never credentials, never a
 * copy of the ArtistrySynk account.
 */

import { createHash } from "node:crypto";

import type { ArtistrySynkProfileProjection } from "./api.server";

export function externalSubjectFor(userId: string): string {
  return `zgt-${userId}`;
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export interface StoredIntent {
  id: string;
  user_id: string;
  redirect_uri: string;
  external_subject: string;
  expires_at: string;
  consumed_at: string | null;
  processing_at: string | null;
  code_verifier: string;
}

export async function recordIntent(input: {
  userId: string;
  stateHash: string;
  intentId?: string;
  kind?: "LINK" | "CLAIM";
  claimUrl?: string;
  redirectUri: string;
  externalSubject: string;
  scopes: string[];
  expiresAt: string;
  codeVerifier: string;
}): Promise<string> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_link_intents")
    .insert({
      user_id: input.userId,
      state_hash: input.stateHash,
      intent_id: input.intentId ?? null,
      kind: input.kind ?? "LINK",
      claim_url: input.claimUrl ?? null,
      redirect_uri: input.redirectUri,
      external_subject: input.externalSubject,
      scopes: input.scopes,
      expires_at: input.expiresAt,
      code_verifier: input.codeVerifier,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** The live, unclaimed identity-creation intent for this contestant, if any. */
export async function getPendingClaimIntent(
  userId: string,
): Promise<{ id: string; claim_url: string; expires_at: string } | null> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_link_intents")
    .select("id, claim_url, expires_at")
    .eq("user_id", userId)
    .eq("kind", "CLAIM")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.claim_url ? (data as { id: string; claim_url: string; expires_at: string }) : null;
}

/** Mark any intent consumed (single use), regardless of claim state. */
export async function consumeIntent(id: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("artistrysynk_link_intents")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .is("consumed_at", null);
  if (error) throw error;
}

/**
 * Atomically take ownership of the live identity-creation transaction for this
 * contestant, so a refreshed or replayed claim callback cannot exchange its
 * completion code twice.
 */
export async function claimPendingClaimIntent(
  userId: string,
): Promise<
  | { ok: true; intent: StoredIntent }
  | { ok: false; reason: "INVALID_STATE" | "EXPIRED" | "ALREADY_USED" }
> {
  const db = await admin();
  const now = new Date().toISOString();
  const { data: pending, error: pendingError } = await db
    .from("artistrysynk_link_intents")
    .select("id, expires_at, consumed_at, processing_at")
    .eq("user_id", userId)
    .eq("kind", "CLAIM")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingError) throw pendingError;
  if (!pending) return { ok: false, reason: "INVALID_STATE" };
  if (pending.consumed_at) return { ok: false, reason: "ALREADY_USED" };

  const { data: claimed, error } = await db
    .from("artistrysynk_link_intents")
    .update({ processing_at: now })
    .eq("id", pending.id)
    .eq("user_id", userId)
    .is("consumed_at", null)
    .gt("expires_at", now)
    .select(
      "id, user_id, redirect_uri, external_subject, expires_at, consumed_at, processing_at, code_verifier",
    )
    .maybeSingle();
  if (error) throw error;
  if (!claimed) return { ok: false, reason: "EXPIRED" };
  return { ok: true, intent: claimed as StoredIntent };
}

export async function finalizeIntent(
  id: string,
  input: { intentId: string; expiresAt: string },
): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("artistrysynk_link_intents")
    .update({ intent_id: input.intentId, expires_at: input.expiresAt })
    .eq("id", id)
    .is("consumed_at", null);
  if (error) throw error;
}

export async function deleteIntent(id: string): Promise<void> {
  const db = await admin();
  const { error } = await db.from("artistrysynk_link_intents").delete().eq("id", id);
  if (error) throw error;
}

/** Atomically claim a callback so parallel/replayed processing cannot exchange its code twice. */
export async function claimIntent(
  stateHash: string,
  userId: string,
): Promise<
  | { ok: true; intent: StoredIntent }
  | { ok: false; reason: "INVALID_STATE" | "EXPIRED" | "ALREADY_USED" }
> {
  const db = await admin();
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("artistrysynk_link_intents")
    .update({ processing_at: claimedAt })
    .eq("state_hash", stateHash)
    .eq("user_id", userId)
    .is("processing_at", null)
    .is("consumed_at", null)
    .gt("expires_at", claimedAt)
    .select(
      "id, user_id, redirect_uri, external_subject, expires_at, consumed_at, processing_at, code_verifier",
    )
    .maybeSingle();
  if (claimError) throw claimError;
  if (claimed?.code_verifier) return { ok: true, intent: claimed as StoredIntent };

  const { data: existing, error } = await db
    .from("artistrysynk_link_intents")
    .select("expires_at, consumed_at, processing_at")
    .eq("state_hash", stateHash)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!existing) return { ok: false, reason: "INVALID_STATE" };
  if (existing.consumed_at || existing.processing_at) return { ok: false, reason: "ALREADY_USED" };
  return { ok: false, reason: "EXPIRED" };
}

export async function consumeClaimedIntent(id: string): Promise<void> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_link_intents")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .not("processing_at", "is", null)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("ArtistrySynk transaction was not claimable.");
}

export async function releaseIntentClaim(id: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("artistrysynk_link_intents")
    .update({ processing_at: null })
    .eq("id", id)
    .is("consumed_at", null);
  if (error) throw error;
}

export interface LinkRecord {
  user_id: string;
  external_subject: string;
  identity_id: string;
  link_id: string | null;
  scopes: string[];
  status: string;
  profile_snapshot: ArtistrySynkProfileProjection | Record<string, never>;
  linked_at: string;
}

export async function getLink(userId: string): Promise<LinkRecord | null> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_links")
    .select(
      "user_id, external_subject, identity_id, link_id, scopes, status, profile_snapshot, linked_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as LinkRecord | null) ?? null;
}

/** Another Zik's Got Talent account already holding this identity, if any. */
export async function findConflictingLink(
  identityId: string,
  userId: string,
): Promise<string | null> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_links")
    .select("user_id")
    .eq("identity_id", identityId)
    .eq("status", "LINKED")
    .neq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.user_id ?? null;
}

export async function saveLink(input: {
  userId: string;
  externalSubject: string;
  identityId: string;
  linkId: string;
  scopes: string[];
  linkedAt: string;
  profile: ArtistrySynkProfileProjection | null;
}): Promise<void> {
  const db = await admin();
  const profileSnapshot = input.profile
    ? {
        display_name: input.profile.display_name,
        username: input.profile.username,
        avatar_url: input.profile.avatar_url,
        location: input.profile.location,
      }
    : {};
  const { error } = await db.from("artistrysynk_links").upsert(
    {
      user_id: input.userId,
      external_subject: input.externalSubject,
      identity_id: input.identityId,
      link_id: input.linkId,
      scopes: input.scopes,
      status: "LINKED",
      linked_at: input.linkedAt,
      profile_snapshot: profileSnapshot,
      snapshot_at: input.profile ? new Date().toISOString() : null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function markRevoked(userId: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("artistrysynk_links")
    .update({ status: "REVOKED", profile_snapshot: {}, snapshot_at: null })
    .eq("user_id", userId);
  if (error) throw error;
}

/** Attach (or clear) the verified identity reference on the entrant's entries. */
export async function applyIdentityToApplications(
  userId: string,
  identityRef: string | null,
): Promise<number> {
  const db = await admin();
  const { data, error } = await db.rpc("artistrysynk_apply_link", {
    p_user: userId,
    p_identity_ref: identityRef as unknown as string,
  });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}
