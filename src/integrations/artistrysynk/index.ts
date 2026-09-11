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
    "Your Zik's Got Talent registration can be connected to your ArtistrySynk creative identity. You don't need to create a separate creative profile.",
  ecosystem:
    "Zik's Got Talent is the competition. ArtistrySynk is the creative identity that lives beyond it.",
} as const;
