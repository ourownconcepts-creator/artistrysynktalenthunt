import { afterEach, describe, expect, test, vi } from "vitest";

import { createIdentity, lookupIdentity, type ArtistrySynkConfig } from "./api.server";

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

describe("server-to-server identity provisioning", () => {
  test("lookup asks by external subject with confidential credentials", async () => {
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

  test("lookup returns null when no identity exists yet", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        { error: { code: "not_found", message: "No active identity link was found" } },
        { status: 404 },
      ),
    ) as unknown as typeof fetch;

    await expect(lookupIdentity(config, "zgt-new-user")).resolves.toBeNull();
  });

  test("create sends the contestant details and never a credential", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toContain("/identity/create");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body["external_subject"]).toBe("zgt-new-user");
      expect(body["email"]).toBe("new@example.com");
      expect(body["display_name"]).toBe("New Act");
      expect(JSON.stringify(body)).not.toContain("api-secret");
      return Response.json({ data: { identity_id: "identity-2", link_id: "link-2" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      createIdentity(config, {
        externalSubject: "zgt-new-user",
        email: "new@example.com",
        displayName: "New Act",
      }),
    ).resolves.toMatchObject({ identity_id: "identity-2" });
  });

  test("an existing account surfaces a conflict for the approval path", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        { error: { code: "conflict", message: "That account already exists" } },
        { status: 409 },
      ),
    ) as unknown as typeof fetch;

    await expect(
      createIdentity(config, {
        externalSubject: "zgt-existing",
        email: "taken@example.com",
        displayName: "Taken",
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });
});
