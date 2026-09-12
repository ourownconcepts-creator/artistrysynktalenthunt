import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ArtistrySynkError,
  createIdentityIntent,
  lookupIdentity,
  type ArtistrySynkConfig,
} from "./api.server";

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

describe("identity lookup", () => {
  test("asks by external subject with confidential credentials", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toContain("/identity/lookup?external_subject=zgt-user-1");
      expect((init?.headers as Record<string, string>)["Authorization"]).toMatch(/^Basic /);
      return Response.json({ data: { identity_id: "identity-1", link_id: "link-1" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(lookupIdentity(config, "zgt-user-1")).resolves.toMatchObject({
      identity_id: "identity-1",
    });
  });

  test("returns null when no identity exists yet", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        { error: { code: "not_found", message: "No active identity link was found" } },
        { status: 404 },
      ),
    ) as unknown as typeof fetch;

    await expect(lookupIdentity(config, "zgt-new-user")).resolves.toBeNull();
  });
});

describe("identity creation intent", () => {
  test("sends only the contracted fields and returns the claim url", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe("https://artistrysynk.example/integration/v1/identity/create");
      const headers = init?.headers as Record<string, string>;
      expect(headers["Authorization"]).toMatch(/^Basic /);
      expect(headers["Idempotency-Key"]).toBe("key-1");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(
        ["email", "external_subject", "redirect_uri", "scopes"].sort(),
      );
      expect(body["external_subject"]).toBe("zgt-new-user");
      expect(body["redirect_uri"]).toBe("https://ziksgottalent.com/oauth/artistrysynk/return");
      expect(body["scopes"]).toEqual(["identity:create", "identity:read", "profile:read"]);
      expect(JSON.stringify(body)).not.toContain("api-secret");
      return Response.json(
        {
          data: {
            intent_id: "intent-1",
            claim_url: "https://artistrysynk.example/claim/intent-1",
            expires_at: "2026-09-12T13:00:00.000Z",
            status: "pending",
          },
          request_id: "req-1",
        },
        { status: 201 },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      createIdentityIntent(config, {
        externalSubject: "  zgt-new-user  ",
        redirectUri: "https://ziksgottalent.com/oauth/artistrysynk/return#frag",
        email: "new@example.com",
        idempotencyKey: "key-1",
      }),
    ).resolves.toMatchObject({ claim_url: "https://artistrysynk.example/claim/intent-1" });
  });

  test("never sends profile detail or a password", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const raw = String(init?.body);
      for (const forbidden of ["display_name", "username", "location", "discipline", "password"]) {
        expect(raw).not.toContain(forbidden);
      }
      return Response.json(
        {
          data: {
            intent_id: "i",
            claim_url: "https://x/claim",
            expires_at: "z",
            status: "pending",
          },
        },
        { status: 201 },
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await createIdentityIntent(config, {
      externalSubject: "zgt-user",
      redirectUri: "https://ziksgottalent.com/oauth/artistrysynk/return",
    });
  });

  test("rejects a non-HTTPS return address before calling ArtistrySynk", async () => {
    globalThis.fetch = vi.fn(async () => Response.json({})) as unknown as typeof fetch;
    await expect(
      createIdentityIntent(config, {
        externalSubject: "zgt-user",
        redirectUri: "http://ziksgottalent.com/oauth/artistrysynk/return",
      }),
    ).rejects.toBeInstanceOf(ArtistrySynkError);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("surfaces a 409 conflict for an existing ArtistrySynk account", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        { error: { code: "conflict", message: "identity already exists" } },
        { status: 409 },
      ),
    ) as unknown as typeof fetch;

    await expect(
      createIdentityIntent(config, {
        externalSubject: "zgt-user",
        redirectUri: "https://ziksgottalent.com/oauth/artistrysynk/return",
        email: "existing@example.com",
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });
});
