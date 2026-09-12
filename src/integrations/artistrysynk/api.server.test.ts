import { afterEach, describe, expect, test, vi } from "vitest";

import { exchangeCode, startLink, type ArtistrySynkConfig } from "./api.server";
import { base64UrlSha256 } from "./pkce.server";

const config: ArtistrySynkConfig = {
  baseUrl: "https://artistrysynk.example",
  integrationUrl: "https://artistrysynk.example/integration/v1",
  clientId: "api-client",
  clientSecret: "api-secret",
  signinClientId: "signin-client",
  signinClientSecret: "signin-secret",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ArtistrySynk link transport", () => {
  test("sends state and the correct S256 challenge", async () => {
    const verifier = "a".repeat(64);
    const challenge = base64UrlSha256(verifier);
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body["state"]).toBe("s".repeat(32));
      expect(body["code_challenge"]).toBe(challenge);
      expect(body["code_challenge_method"]).toBe("S256");
      return Response.json({
        data: {
          intent_id: "intent-1",
          authorization_url: "https://artistrysynk.example/authorize",
          expires_at: "2026-09-11T20:00:00.000Z",
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await startLink(config, {
      externalSubject: "zgt-user",
      redirectUri: "https://zgt.example/oauth/artistrysynk/return",
      state: "s".repeat(32),
      codeChallenge: challenge,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("sends the same verifier during token exchange", async () => {
    const verifier = "v".repeat(64);
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return Response.json({ authorization_servers: ["https://issuer.example"] });
      }
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: "https://issuer.example",
          authorization_endpoint: "https://issuer.example/authorize",
          token_endpoint: "https://issuer.example/token",
        });
      }
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("code_verifier")).toBe(verifier);
      return Response.json({ access_token: "short-lived-token", expires_in: 300 });
    }) as typeof fetch;

    const token = await exchangeCode(config, {
      code: "one-time-code",
      redirectUri: "https://zgt.example/oauth/artistrysynk/return",
      codeVerifier: verifier,
    });

    expect(token.accessToken).toBe("short-lived-token");
  });

  test("rejects an incorrect verifier at token exchange", async () => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/.well-known/oauth-protected-resource")) {
        return Response.json({ authorization_servers: ["https://other-issuer.example"] });
      }
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: "https://other-issuer.example",
          authorization_endpoint: "https://other-issuer.example/authorize",
          token_endpoint: "https://other-issuer.example/token",
        });
      }
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }) as typeof fetch;

    await expect(
      exchangeCode(config, {
        code: "one-time-code",
        redirectUri: "https://zgt.example/oauth/artistrysynk/return",
        codeVerifier: "x".repeat(64),
      }),
    ).rejects.toMatchObject({ code: "invalid_grant", status: 400 });
  });

  test("preserves safe field-level validation details", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        {
          error: {
            code: "invalid_request",
            message: "The identity link request is invalid",
            request_id: "request-1",
            field: "code_challenge",
            issue: "Required",
          },
        },
        { status: 400 },
      ),
    ) as typeof fetch;

    await expect(
      startLink(config, {
        externalSubject: "zgt-user",
        redirectUri: "https://zgt.example/oauth/artistrysynk/return",
        state: "s".repeat(32),
        codeChallenge: "c".repeat(43),
      }),
    ).rejects.toMatchObject({
      code: "invalid_request",
      requestId: "request-1",
      validation: [{ field: "code_challenge", issue: "Required" }],
    });
  });

  test("maps provider unavailability safely", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network details must stay private");
    }) as typeof fetch;

    await expect(
      startLink(config, {
        externalSubject: "zgt-user",
        redirectUri: "https://zgt.example/oauth/artistrysynk/return",
        state: "s".repeat(32),
        codeChallenge: "c".repeat(43),
      }),
    ).rejects.toMatchObject({ code: "temporarily_unavailable", status: 503 });
  });
});
