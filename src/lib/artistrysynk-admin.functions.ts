/**
 * Admin views over the ArtistrySynk connection state. The link and intent
 * records are service-role only, so every read happens here on the server and
 * only after the caller is confirmed to be an admin. No credential, token or
 * completion code is ever returned to the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ArtistrySynkAdminStatus =
  "CONNECTED" | "REVOKED" | "AWAITING_CLAIM" | "EXPIRED" | "NOT_CONNECTED";

export interface ArtistrySynkAdminRow {
  userId: string;
  email: string | null;
  displayName: string;
  handle: string | null;
  status: ArtistrySynkAdminStatus;
  identityRef: string | null;
  identityUsername: string | null;
  identityName: string | null;
  linkedAt: string | null;
  intentKind: string | null;
  intentExpiresAt: string | null;
  intentConsumedAt: string | null;
  entries: number;
}

async function assertAdmin(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("Forbidden");
}

export const listArtistrySynkConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArtistrySynkAdminRow[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: applications }, { data: links }, { data: intents }] = await Promise.all([
      supabaseAdmin
        .from("applications")
        .select("user_id, display_name, handle, email, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("artistrysynk_links")
        .select("user_id, identity_id, status, linked_at, profile_snapshot"),
      supabaseAdmin
        .from("artistrysynk_link_intents")
        .select("user_id, kind, expires_at, consumed_at, created_at")
        .order("created_at", { ascending: false }),
    ]);

    type LinkRow = NonNullable<typeof links>[number];
    const linkByUser = new Map<string, LinkRow>();
    for (const link of links ?? [])
      if (!linkByUser.has(link.user_id)) linkByUser.set(link.user_id, link);

    type IntentRow = NonNullable<typeof intents>[number];
    const intentByUser = new Map<string, IntentRow>();
    for (const intent of intents ?? [])
      if (!intentByUser.has(intent.user_id)) intentByUser.set(intent.user_id, intent);

    const entrants = new Map<string, ArtistrySynkAdminRow>();
    const now = Date.now();

    for (const row of applications ?? []) {
      const existing = entrants.get(row.user_id);
      if (existing) {
        existing.entries += 1;
        continue;
      }
      const link = linkByUser.get(row.user_id) ?? null;
      const intent = intentByUser.get(row.user_id) ?? null;
      const snapshot = (link?.profile_snapshot ?? {}) as Record<string, unknown>;

      let status: ArtistrySynkAdminStatus = "NOT_CONNECTED";
      if (link?.status === "CONNECTED") status = "CONNECTED";
      else if (link?.status === "REVOKED") status = "REVOKED";
      else if (intent && !intent.consumed_at)
        status = new Date(intent.expires_at).getTime() > now ? "AWAITING_CLAIM" : "EXPIRED";

      entrants.set(row.user_id, {
        userId: row.user_id,
        email: row.email ?? null,
        displayName: row.display_name,
        handle: row.handle ?? null,
        status,
        identityRef: link?.identity_id ?? null,
        identityUsername: typeof snapshot["username"] === "string" ? snapshot["username"] : null,
        identityName: typeof snapshot["displayName"] === "string" ? snapshot["displayName"] : null,
        linkedAt: link?.linked_at ?? null,
        intentKind: intent?.kind ?? null,
        intentExpiresAt: intent?.expires_at ?? null,
        intentConsumedAt: intent?.consumed_at ?? null,
        entries: 1,
      });
    }

    return Array.from(entrants.values());
  });

/** Admin-only: invites one contestant by email to connect their creative identity. */
export const sendArtistrySynkInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(200),
        displayName: z.string().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ sent: boolean; configured: boolean }> => {
    await assertAdmin(context as never);
    const { sendEmail, emailConfig } = await import("./email/queensmtp.server");
    const { artistrySynkInviteEmail } = await import("./email/templates.server");

    const message = artistrySynkInviteEmail({ displayName: data.displayName ?? "there" });
    const result = await sendEmail({ to: data.email, ...message });
    return { sent: result.sent, configured: !!emailConfig().apiKey };
  });
