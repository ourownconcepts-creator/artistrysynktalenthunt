import type { ArtistrySynkConnectResult, ArtistrySynkConnection } from "./types";

/**
 * THE INTEGRATION BOUNDARY.
 *
 * Every part of Zik's Got Talent that touches creative identity goes through
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
   * Server-to-server path for a contestant with no ArtistrySynk account: look
   * up an existing link, otherwise ask ArtistrySynk to provision the identity.
   * Never asks the contestant for ArtistrySynk credentials.
   */
  provisionIdentity(
    userId: string,
    seed: {
      email: string;
      displayName: string;
      username?: string | null;
      location?: string | null;
      primaryDiscipline?: string | null;
    },
  ): Promise<ArtistrySynkConnectResult>;

  /** Current connection state for a Zik's Got Talent account. */
  getConnection(userId: string): Promise<ArtistrySynkConnection>;

  isIdentityLinked(userId: string): Promise<boolean>;

  /** Revoke the association on both sides. */
  disconnect(userId: string): Promise<void>;
}

/** Legacy alias kept so existing imports keep working. */
export type ArtistrySynkClient = ArtistrySynkIdentityProvider;
