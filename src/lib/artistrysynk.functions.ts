/**
 * Server functions for the ArtistrySynk integration. Every call that needs the
 * confidential credential happens here, on the server, for the signed-in
 * Zik's Got Talent account only. No token, secret or credential is ever
 * returned to the browser.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ArtistrySynkConnectResult, ArtistrySynkConnection } from "@/integrations/artistrysynk/types";

function requestOrigin(): string {
  const request = getRequest();
  if (!request) throw new Error("A request context is required.");
  const url = new URL(request.url);
  const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return forwarded ? `https://${forwarded}` : url.origin;
}

export const getArtistrySynkConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArtistrySynkConnection> => {
    const { getArtistrySynkProvider } = await import(
      "@/integrations/artistrysynk/provider.server"
    );
    return getArtistrySynkProvider().getConnection(context.userId);
  });

export const startArtistrySynkConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      { ok: true; authorizationUrl: string } | { ok: false; reason: string; message: string }
    > => {
      const { getArtistrySynkProvider } = await import(
        "@/integrations/artistrysynk/provider.server"
      );
      try {
        const { authorizationUrl } = await getArtistrySynkProvider().beginConnection(
          context.userId,
          requestOrigin(),
        );
        return { ok: true, authorizationUrl };
      } catch (error) {
        console.error("ArtistrySynk connection start failed", error);
        const { ArtistrySynkError } = await import("@/integrations/artistrysynk/api.server");
        if (error instanceof ArtistrySynkError && error.code === "not_configured") {
          return {
            ok: false,
            reason: "NOT_CONFIGURED",
            message: "ArtistrySynk is not configured yet.",
          };
        }
        return {
          ok: false,
          reason: "UNAVAILABLE",
          message: "ArtistrySynk could not be reached. Your entry is unaffected — try again later.",
        };
      }
    },
  );

export const completeArtistrySynkConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; state: string }) =>
    z.object({ code: z.string().min(1).max(4096), state: z.string().min(16).max(512) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ArtistrySynkConnectResult> => {
    const { getArtistrySynkProvider } = await import(
      "@/integrations/artistrysynk/provider.server"
    );
    return getArtistrySynkProvider().completeConnection(context.userId, data);
  });

export const disconnectArtistrySynk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { getArtistrySynkProvider } = await import(
      "@/integrations/artistrysynk/provider.server"
    );
    await getArtistrySynkProvider().disconnect(context.userId);
    return { ok: true };
  });
