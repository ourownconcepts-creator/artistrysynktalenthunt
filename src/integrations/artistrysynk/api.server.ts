/**
 * ArtistrySynk Integration API v1 — server-only transport.
 *
 * This is the ONLY module that speaks HTTP to ArtistrySynk. It implements the
 * supplied v1 contract exactly: nothing is assembled by hand that the contract
 * says is published (the authorization URL comes from the API, the token
 * endpoint comes from OpenID discovery), and no endpoint is invented.
 *
 * Never import this from browser code — it reads the confidential client
 * credential from the server environment.
 */

export const ARTISTRYSYNK_SCOPES = ["identity:link", "profile:read"] as const;

export interface ArtistrySynkConfig {
  /** Origin that serves the resource metadata and the integration API. */
  baseUrl: string;
  integrationUrl: string;
  /** API client — direct server-to-server Integration API calls (Basic auth). */
  clientId: string;
  clientSecret: string;
  /** Sign-in client — user approval flow and the authorization-code exchange. */
  signinClientId: string;
  signinClientSecret: string;
}

/** Default API client identifier (public value, not a secret). */
const DEFAULT_API_CLIENT_ID = "zgt-prod-aa3c2403c67a4cb6";

export class ArtistrySynkError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ArtistrySynkError";
  }
}

/** Configuration is absent until the credentials are provisioned. */
export function readArtistrySynkConfig(): ArtistrySynkConfig | null {
  const signinClientId =
    process.env["ARTISTRYSYNK_SIGNIN_CLIENT_ID"] ?? process.env["ARTISTRYSYNK_CLIENT_ID"];
  const signinClientSecret =
    process.env["ARTISTRYSYNK_SIGNIN_CLIENT_SECRET"] ?? process.env["ARTISTRYSYNK_CLIENT_SECRET"];
  const clientId = process.env["ARTISTRYSYNK_API_CLIENT_ID"] ?? DEFAULT_API_CLIENT_ID;
  const clientSecret = process.env["ARTISTRYSYNK_API_CLIENT_SECRET"];
  if (!signinClientId || !signinClientSecret || !clientId || !clientSecret) return null;
  const baseUrl = (process.env["ARTISTRYSYNK_BASE_URL"] ?? "https://artistrysynk.app").replace(
    /\/$/,
    "",
  );
  return {
    baseUrl,
    integrationUrl: `${baseUrl}/integration/v1`,
    clientId,
    clientSecret,
    signinClientId,
    signinClientSecret,
  };
}

export function requireArtistrySynkConfig(): ArtistrySynkConfig {
  const config = readArtistrySynkConfig();
  if (!config) {
    throw new ArtistrySynkError(
      "not_configured",
      "The ArtistrySynk integration credentials are not configured on this server.",
    );
  }
  return config;
}

function basic(config: ArtistrySynkConfig): string {
  const raw = `${config.clientId}:${config.clientSecret}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

interface Envelope<T> {
  data?: T;
  request_id?: string;
  error?: { code?: string; message?: string; request_id?: string };
}

async function readEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: Envelope<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    body = null;
  }
  if (!res.ok || body?.error) {
    const code = body?.error?.code ?? (res.status === 503 ? "temporarily_unavailable" : "api_error");
    throw new ArtistrySynkError(
      code,
      body?.error?.message ?? `ArtistrySynk request failed (${res.status}).`,
      res.status,
      body?.error?.request_id ?? body?.request_id ?? null,
    );
  }
  if (!body?.data) {
    throw new ArtistrySynkError("api_error", "ArtistrySynk returned an unexpected response.", 200);
  }
  return body.data;
}

async function jsonRequest<T>(
  url: string,
  init: RequestInit & { authorization: string },
): Promise<T> {
  const { authorization, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ArtistrySynkError(
      "temporarily_unavailable",
      "ArtistrySynk could not be reached.",
      503,
    );
  }
  return readEnvelope<T>(res);
}

/* ------------------------------------------------------------------ discovery */

interface Discovery {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  fetchedAt: number;
}

let discoveryCache: Discovery | null = null;
const DISCOVERY_TTL_MS = 10 * 60 * 1000;

/** Resource metadata (RFC 9728) → managed issuer → OpenID configuration. */
export async function discover(config: ArtistrySynkConfig): Promise<Discovery> {
  if (discoveryCache && Date.now() - discoveryCache.fetchedAt < DISCOVERY_TTL_MS) {
    return discoveryCache;
  }
  const metaRes = await fetch(`${config.baseUrl}/.well-known/oauth-protected-resource`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  if (!metaRes?.ok) {
    throw new ArtistrySynkError(
      "temporarily_unavailable",
      "ArtistrySynk resource metadata is unavailable.",
      503,
    );
  }
  const meta = (await metaRes.json()) as { authorization_servers?: string[] };
  const issuer = meta.authorization_servers?.[0];
  if (!issuer) {
    throw new ArtistrySynkError("api_error", "ArtistrySynk published no authorization server.");
  }
  const confRes = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`, {
    headers: { Accept: "application/json" },
  }).catch(() => null);
  if (!confRes?.ok) {
    throw new ArtistrySynkError(
      "temporarily_unavailable",
      "The ArtistrySynk authorization server is unavailable.",
      503,
    );
  }
  const conf = (await confRes.json()) as {
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
  };
  if (!conf.token_endpoint || !conf.authorization_endpoint) {
    throw new ArtistrySynkError("api_error", "ArtistrySynk discovery is incomplete.");
  }
  discoveryCache = {
    issuer: conf.issuer ?? issuer,
    authorizationEndpoint: conf.authorization_endpoint,
    tokenEndpoint: conf.token_endpoint,
    fetchedAt: Date.now(),
  };
  return discoveryCache;
}

/* -------------------------------------------------------------- link/start */

export interface LinkIntent {
  intent_id: string;
  authorization_url: string;
  expires_at: string;
}

export async function startLink(
  config: ArtistrySynkConfig,
  input: { externalSubject: string; redirectUri: string; state: string },
): Promise<LinkIntent> {
  return jsonRequest<LinkIntent>(`${config.integrationUrl}/identity/link/start`, {
    method: "POST",
    authorization: basic(config),
    body: JSON.stringify({
      external_subject: input.externalSubject,
      redirect_uri: input.redirectUri,
      scopes: [...ARTISTRYSYNK_SCOPES],
      state: input.state,
    }),
  });
}

/* ------------------------------------------------------------ code exchange */

export interface TokenSet {
  accessToken: string;
  expiresAt: number;
  scope: string[];
}

export async function exchangeCode(
  config: ArtistrySynkConfig,
  input: { code: string; redirectUri: string },
): Promise<TokenSet> {
  const { tokenEndpoint } = await discover(config);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: config.clientId,
  });
  let res: Response;
  try {
    res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        Authorization: basic(config),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
  } catch {
    throw new ArtistrySynkError(
      "temporarily_unavailable",
      "The ArtistrySynk authorization server could not be reached.",
      503,
    );
  }
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    const code =
      typeof parsed["error"] === "string" ? (parsed["error"] as string) : "invalid_request";
    throw new ArtistrySynkError(code, "The ArtistrySynk authorization could not be completed.", res.status);
  }
  const accessToken = parsed["access_token"];
  if (typeof accessToken !== "string") {
    throw new ArtistrySynkError("invalid_token", "ArtistrySynk returned no access token.", 401);
  }
  const expiresIn = typeof parsed["expires_in"] === "number" ? (parsed["expires_in"] as number) : 300;
  const scope = typeof parsed["scope"] === "string" ? (parsed["scope"] as string).split(/\s+/) : [];
  return { accessToken, expiresAt: Date.now() + expiresIn * 1000, scope };
}

/* ----------------------------------------------------------- link/complete */

export interface CompletedLink {
  link_id: string;
  identity_id: string;
  linked_at: string;
  scopes: string[];
}

export async function completeLink(
  config: ArtistrySynkConfig,
  input: { accessToken: string; externalSubject: string },
): Promise<CompletedLink> {
  return jsonRequest<CompletedLink>(`${config.integrationUrl}/identity/link/complete`, {
    method: "POST",
    authorization: `Bearer ${input.accessToken}`,
    body: JSON.stringify({
      external_subject: input.externalSubject,
      client_id: config.clientId,
    }),
  });
}

/* ------------------------------------------------------------------ profile */

export interface ArtistrySynkProfileProjection {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  is_verified: boolean;
  professional_verified: boolean;
}

export async function readProfile(
  config: ArtistrySynkConfig,
  input: { accessToken: string; identityId: string },
): Promise<ArtistrySynkProfileProjection> {
  return jsonRequest<ArtistrySynkProfileProjection>(
    `${config.integrationUrl}/profile/${encodeURIComponent(input.identityId)}`,
    { method: "GET", authorization: `Bearer ${input.accessToken}` },
  );
}

/* ------------------------------------------------------------------- revoke */

export async function revokeLink(
  config: ArtistrySynkConfig,
  input: { externalSubject: string },
): Promise<{ revoked: boolean }> {
  return jsonRequest<{ revoked: boolean }>(`${config.integrationUrl}/revoke`, {
    method: "POST",
    authorization: basic(config),
    body: JSON.stringify({ external_subject: input.externalSubject }),
  });
}
