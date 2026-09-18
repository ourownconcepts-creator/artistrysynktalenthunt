import type { ArtistrySynkConnectResult, ArtistrySynkConnection } from "./types";

/**
 * THE INTEGRATION BOUNDARY.
 *
 * Every part of ArtistrySynk Creatives Talent Hunt that touches creative identity goes through
 * this interface — nothing else. The implementation lives in
 * `provider.server.ts` and talks only to the published ArtistrySynk
 * Integration API v1.
 */
export interface ArtistrySynkIdentityProvider {
  readonly provider: "artistrysynk";

  /** Start authorization; returns the URL ArtistrySynk built for us. */
  beginConnection(
    userId: string,
    origin: string,
  ): Promise<{ authorizationUrl: string; expiresAt: string }>;

  /** Validate the callback, complete the link, associate the identity. */
  completeConnection(
    userId: string,
    input: { code: string; state: string },
  ): Promise<ArtistrySynkConnectResult>;

  /**
   * Prepare a creative identity for a contestant who has no ArtistrySynk
   * account. Returns a single-use claim URL the contestant opens on
   * ArtistrySynk; no ArtistrySynk password is ever handled by ZGT.
   */
  prepareIdentity(
    userId: string,
    input: { email?: string | null },
    origin: string,
  ): Promise<ArtistrySynkConnectResult>;

  /** After the claim redirect: verify and attach the claimed identity. */
  finalizeClaim(userId: string): Promise<ArtistrySynkConnectResult>;

  /**
   * Exchange the single-use completion code from the claim redirect, verify the
   * external subject and attach the resulting identity. Server-to-server only.
   */
  completeClaim(
    userId: string,
    input: { code: string; state: string },
  ): Promise<ArtistrySynkConnectResult>;

  /** Current connection state for a ArtistrySynk Creatives Talent Hunt account. */
  getConnection(userId: string): Promise<ArtistrySynkConnection>;

  isIdentityLinked(userId: string): Promise<boolean>;

  /** Revoke the association on both sides. */
  disconnect(userId: string): Promise<void>;
}

/** Legacy alias kept so existing imports keep working. */
export type ArtistrySynkClient = ArtistrySynkIdentityProvider;
