import type { ArtistrySynkClient } from "./client";
import { LocalArtistrySynkAdapter } from "./local.adapter";

export type { ArtistrySynkClient } from "./client";
export type * from "./types";

let client: ArtistrySynkClient | null = null;

/**
 * Adapter selection. Today only the local adapter exists; when the real
 * ArtistrySynk credentials and contract are provided, add
 * `RemoteArtistrySynkAdapter` and select it here. No caller changes.
 */
export function getArtistrySynkClient(): ArtistrySynkClient {
  if (!client) client = new LocalArtistrySynkAdapter();
  return client;
}

export const ARTISTRYSYNK = {
  brand: "ArtistrySynk",
  site: "https://artistrysynk.app",
  promise:
    "Your Zik's Got Talent registration automatically creates your free ArtistrySynk creative profile, or connects to your existing ArtistrySynk account. No separate registration is required.",
  ecosystem:
    "Zik's Got Talent is the competition. ArtistrySynk is the creative identity that lives beyond it.",
} as const;
