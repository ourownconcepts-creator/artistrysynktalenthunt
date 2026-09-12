/**
 * Contracts for the ArtistrySynk integration.
 *
 * ArtistrySynk (artistrysynk.app) owns creative identity: username, profile,
 * portfolio, connections. Zik's Got Talent owns the competition. Competition
 * entities store only the opaque `identityRef` returned by the Integration API,
 * plus the small approved profile projection needed to render a connection.
 */

export type ArtistrySynkConnectionStatus =
  "NOT_CONFIGURED" | "NOT_CONNECTED" | "CONNECTED" | "REVOKED";

/** The approved, read-only projection ArtistrySynk permits partners to read. */
export interface ArtistrySynkIdentity {
  identityRef: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  isVerified: boolean;
  professionalVerified: boolean;
}

export interface ArtistrySynkConnection {
  status: ArtistrySynkConnectionStatus;
  /** False until the integration credentials exist on the server. */
  configured: boolean;
  identity: ArtistrySynkIdentity | null;
  scopes: string[];
  linkedAt: string | null;
  profileUrl: string | null;
  /** How many of this entrant's entries carry the verified identity reference. */
  linkedApplications: number;
}

export type ArtistrySynkFailureReason =
  | "CANCELLED"
  | "INVALID_STATE"
  | "EXPIRED"
  | "ALREADY_USED"
  | "DUPLICATE_IDENTITY"
  | "UNAUTHORIZED"
  | "UNAVAILABLE"
  | "INVALID_CALLBACK"
  | "NOT_CONFIGURED"
  /** ArtistrySynk needs the person to approve in their own account. */
  | "AUTHORIZATION_REQUIRED"
  | "FAILED";

export type ArtistrySynkConnectResult =
  | { outcome: "CONNECTED"; connection: ArtistrySynkConnection }
  | { outcome: "FAILED"; reason: ArtistrySynkFailureReason; message: string };
