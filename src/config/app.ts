/**
 * External domains and integration settings.
 *
 * Nothing in the app may hard-code its own host or ArtistrySynk's host. Every
 * outward-facing URL is resolved here so ArtistrySynk Creatives Talent Hunt can be deployed
 * as the Talent Hunt directory on artistrysynk.app without code changes.
 */

const env = import.meta.env as unknown as Record<string, string | undefined>;

export type ArtistrySynkProviderMode = "local" | "remote";

export const APP_CONFIG = {
  siteName: "ArtistrySynk Creatives Talent Hunt",
  /** Canonical public origin of this product. */
  siteUrl: (env["VITE_SITE_URL"] ?? "https://artistrysynk.app/talent-hunt").replace(/\/$/, ""),
  artistrysynk: {
    brand: "ArtistrySynk",
    siteUrl: (env["VITE_ARTISTRYSYNK_SITE_URL"] ?? "https://artistrysynk.app").replace(/\/$/, ""),
    /** Profile URL pattern; the real one is owned by ArtistrySynk. */
    profilePathPattern: env["VITE_ARTISTRYSYNK_PROFILE_PATH"] ?? "/{handle}",
    /**
     * "local" = temporary development identity provider (default).
     * "remote" = real ArtistrySynk provider, only once the contract exists.
     */
    providerMode: (env["VITE_ARTISTRYSYNK_PROVIDER"] ?? "local") as ArtistrySynkProviderMode,
  },
} as const;

/** Resolve the current origin at runtime, falling back to configuration. */
export function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return APP_CONFIG.siteUrl;
}

export function artistrysynkProfileUrl(handle: string | null): string {
  const { siteUrl, profilePathPattern } = APP_CONFIG.artistrysynk;
  if (!handle) return siteUrl;
  return `${siteUrl}${profilePathPattern.replace("{handle}", encodeURIComponent(handle))}`;
}
