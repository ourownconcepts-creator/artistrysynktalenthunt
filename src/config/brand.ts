import { APP_CONFIG } from "@/config/app";

/** Client-safe ArtistrySynk brand facts. ArtistrySynk is the parent platform. */
export const ARTISTRYSYNK = {
  brand: "ArtistrySynk",
  site: APP_CONFIG.artistrysynk.siteUrl,
  promise:
    "Every creative on the Talent Hunt has one permanent ArtistrySynk talent profile — the asset that carries their work, skills and achievements beyond any single competition.",
  ecosystem: "Connect. Create. Collaborate. ArtistrySynk is where talent gets discovered.",
} as const;
