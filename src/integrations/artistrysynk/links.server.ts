/**
 * Server-only storage for ArtistrySynk link records and one-time authorization
 * intents. Zik's Got Talent stores an opaque identity reference plus the small
 * approved profile projection needed for display — never credentials, never a
 * copy of the ArtistrySynk account.
 */

import { createHash, randomBytes } from "node:crypto";

import type { ArtistrySynkProfileProjection } from "./api.server";

export function externalSubjectFor(userId: string): string {
  return `zgt-${userId}`;
}

export function createState(): { state: string; hash: string } {
  const state = randomBytes(32).toString("base64url");
  return { state, hash: hashState(state) };
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
}

export async function recordIntent(input: {
  userId: string;
  stateHash: string;
  intentId: string;
  redirectUri: string;
  externalSubject: string;
  scopes: string[];
  expiresAt: string;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.from("artistrysynk_link_intents").insert({
    user_id: input.userId,
    state_hash: input.stateHash,
    intent_id: input.intentId,
    redirect_uri: input.redirectUri,
    external_subject: input.externalSubject,
    scopes: input.scopes,
    expires_at: input.expiresAt,
  });
  if (error) throw error;
}

/** Single-use: an intent is consumed atomically or rejected. */
export async function consumeIntent(
  stateHash: string,
  userId: string,
): Promise<
  | { ok: true; intent: StoredIntent }
  | { ok: false; reason: "INVALID_STATE" | "EXPIRED" | "ALREADY_USED" }
> {
  const db = await admin();
  const { data, error } = await db
    .from("artistrysynk_link_intents")
    .select("id, user_id, redirect_uri, external_subject, expires_at, consumed_at")
    .eq("state_hash", stateHash)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: "INVALID_STATE" };
  if (data.consumed_at) return { ok: false, reason: "ALREADY_USED" };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };

  const claimed = await db
    .from("artistrysynk_link_intents")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (claimed.error) throw claimed.error;
  if (!claimed.data) return { ok: false, reason: "ALREADY_USED" };
  return { ok: true, intent: data as StoredIntent };
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
  const { error } = await db.from("artistrysynk_links").upsert(
    {
      user_id: input.userId,
      external_subject: input.externalSubject,
      identity_id: input.identityId,
      link_id: input.linkId,
      scopes: input.scopes,
      status: "LINKED",
      linked_at: input.linkedAt,
      profile_snapshot: input.profile ?? {},
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
