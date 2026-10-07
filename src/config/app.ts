/** Application host configuration. */

const env = import.meta.env as unknown as Record<string, string | undefined>;

export const APP_CONFIG = {
  siteName: "ArtistrySynk Talent Hunt",
  siteUrl: (env["VITE_SITE_URL"] ?? "https://artistrysynk.app/talent-hunt").replace(/\/$/, ""),
  artistrysynk: {
    brand: "ArtistrySynk",
    siteUrl: (env["VITE_ARTISTRYSYNK_SITE_URL"] ?? "https://artistrysynk.app").replace(/\/$/, ""),
  },
} as const;

export function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return APP_CONFIG.siteUrl;
}
