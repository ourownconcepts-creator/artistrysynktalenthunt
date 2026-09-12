import { describe, expect, test } from "vitest";

import {
  base64UrlSha256,
  createPkceTransaction,
  isValidCodeVerifier,
  isValidState,
} from "./pkce.server";

describe("ArtistrySynk PKCE", () => {
  test("creates a valid S256 transaction", () => {
    const transaction = createPkceTransaction();

    expect(isValidState(transaction.state)).toBe(true);
    expect(isValidCodeVerifier(transaction.codeVerifier)).toBe(true);
    expect(transaction.codeChallenge).toBe(base64UrlSha256(transaction.codeVerifier));
    expect(transaction.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(transaction.stateHash).toBe(base64UrlSha256(transaction.state));
  });

  test("creates unique state and verifier values", () => {
    const first = createPkceTransaction();
    const second = createPkceTransaction();

    expect(second.state).not.toBe(first.state);
    expect(second.codeVerifier).not.toBe(first.codeVerifier);
  });

  test("rejects missing and short protocol values", () => {
    expect(isValidState("")).toBe(false);
    expect(isValidState("too-short")).toBe(false);
    expect(isValidCodeVerifier("")).toBe(false);
    expect(isValidCodeVerifier("short")).toBe(false);
  });

  test("rejects values outside the base64url protocol alphabet", () => {
    expect(isValidState(`${"s".repeat(31)}+`)).toBe(false);
    expect(isValidCodeVerifier(`${"v".repeat(63)}=`)).toBe(false);
  });
});
