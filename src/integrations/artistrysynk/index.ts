import { APP_CONFIG } from "@/config/app";

export type { ArtistrySynkClient, ArtistrySynkIdentityProvider } from "./client";
export type * from "./types";

/**
 * Client-safe copy and brand facts only. The provider implementation is
 * server-only (`provider.server.ts`) because it holds the confidential
 * integration credential — browser code reaches it through server functions in
 * `src/lib/artistrysynk.functions.ts`.
 */
export const ARTISTRYSYNK = {
  brand: "ArtistrySynk",
  site: APP_CONFIG.artistrysynk.siteUrl,
  promise:
    "ArtistrySynk supports contestant onboarding and creative identity, helping participating creatives connect with a wider creative community beyond the competition.",
  ecosystem:
    "ArtistrySynk Creatives Talent Hunt discovers the talent. ArtistrySynk connects the talent.",
} as const;
