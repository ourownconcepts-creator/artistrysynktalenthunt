/** Temporary live security checks for the claim callback. Not part of the suite. */
import { describe, expect, test } from "vitest";

import { getArtistrySynkProvider } from "./provider.server";
import { externalSubjectFor, recordIntent } from "./links.server";
import { createPkceTransaction, base64UrlSha256 } from "./pkce.server";

const USER = "dcabc14b-d703-47b0-bacc-744b4a429ab4";
const OTHER = "b929cf5b-fdb8-4293-b96e-87a261cbddc3";
const provider = getArtistrySynkProvider();

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function seed(minutes: number) {
  const { state, codeVerifier } = createPkceTransaction();
  const id = await recordIntent({
    userId: USER,
    kind: "CLAIM",
    stateHash: base64UrlSha256(state),
    intentId: `test-${Date.now()}`,
    claimUrl: "https://artistrysynk.app/claim/test",
    redirectUri: "https://ziksgottalent.com/oauth/artistrysynk/return",
    externalSubject: externalSubjectFor(USER),
    scopes: ["identity:create"],
    expiresAt: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    codeVerifier,
  });
  return id;
}

async function clean() {
  const client = await db();
  await client.from("artistrysynk_link_intents").delete().eq("user_id", USER);
  await client.from("artistrysynk_links").delete().eq("user_id", USER);
}

const CODE = "a".repeat(48);

describe("claim callback security", () => {
  test("missing or malformed state never reaches ArtistrySynk", async () => {
    await clean();
    await seed(10);
    await expect(provider.completeClaim(USER, { code: CODE, state: "" })).resolves.toMatchObject({
      outcome: "FAILED",
      reason: "INVALID_CALLBACK",
    });
    await expect(provider.completeClaim(USER, { code: "", state: "x".repeat(32) })).resolves
      .toMatchObject({ outcome: "FAILED", reason: "INVALID_CALLBACK" });
  });

  test("no live transaction for this user is rejected without an exchange", async () => {
    await clean();
    await expect(
      provider.completeClaim(USER, { code: CODE, state: "y".repeat(32) }),
    ).resolves.toMatchObject({ outcome: "FAILED", reason: "INVALID_STATE" });
  });

  test("an expired transaction is rejected", async () => {
    await clean();
    await seed(-5);
    await expect(
      provider.completeClaim(USER, { code: CODE, state: "y".repeat(32) }),
    ).resolves.toMatchObject({ outcome: "FAILED", reason: "EXPIRED" });
  });

  test("an invalid ArtistrySynk code fails safely and cannot be replayed", async () => {
    await clean();
    await seed(10);
    const first = await provider.completeClaim(USER, { code: CODE, state: "z".repeat(32) });
    expect(first.outcome).toBe("FAILED");
    const replay = await provider.completeClaim(USER, { code: CODE, state: "z".repeat(32) });
    expect(replay).toMatchObject({ outcome: "FAILED", reason: "ALREADY_USED" });
    const client = await db();
    const { data: links } = await client
      .from("artistrysynk_links")
      .select("user_id")
      .eq("user_id", USER);
    expect(links ?? []).toHaveLength(0);
    const { data: intents } = await client
      .from("artistrysynk_link_intents")
      .select("consumed_at")
      .eq("user_id", USER);
    expect((intents ?? []).every((row) => row.consumed_at !== null)).toBe(true);
  });

  test("another user's transaction is never usable", async () => {
    await clean();
    await seed(10);
    await expect(
      provider.completeClaim(OTHER, { code: CODE, state: "q".repeat(32) }),
    ).resolves.toMatchObject({ outcome: "FAILED" });
    await clean();
  });
});
