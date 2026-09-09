import { APP_CONFIG } from "@/config/app";
import type { ArtistrySynkIdentityProvider } from "./client";
import { LocalArtistrySynkAdapter } from "./local.adapter";

export type { ArtistrySynkClient, ArtistrySynkIdentityProvider } from "./client";
export type * from "./types";

let provider: ArtistrySynkIdentityProvider | null = null;

/**
 * Provider selection. Only the temporary local provider exists today. When the
 * real ArtistrySynk contract (base URL, server credential, identity + profile
 * endpoints, session hand-off) is supplied, add a RemoteArtistrySynkProvider
 * and select it here. No caller changes, and nothing is invented in the
 * meantime — asking for "remote" now fails loudly instead of faking it.
 */
export function getArtistrySynkIdentityProvider(): ArtistrySynkIdentityProvider {
  if (APP_CONFIG.artistrysynk.providerMode === "remote") {
    throw new Error(
      "ArtistrySynk remote provider is not implemented: the real API contract and credentials have not been supplied.",
    );
  }
  if (!provider) provider = new LocalArtistrySynkAdapter();
  return provider;
}

/** Legacy alias kept so existing imports keep working. */
export const getArtistrySynkClient = getArtistrySynkIdentityProvider;

export const ARTISTRYSYNK = {
  brand: APP_CONFIG.artistrysynk.brand,
  site: APP_CONFIG.artistrysynk.siteUrl,
  promise:
    "Your Zik's Got Talent registration creates or connects your ArtistrySynk creative profile. No separate ArtistrySynk registration is required.",
  ecosystem:
    "Zik's Got Talent is the competition. ArtistrySynk is the creative identity that lives beyond it.",
} as const;
