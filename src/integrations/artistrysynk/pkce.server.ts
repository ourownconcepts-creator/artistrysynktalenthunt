import { createHash, randomBytes } from "node:crypto";

const OAUTH_VALUE_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface PkceTransactionValues {
  state: string;
  stateHash: string;
  codeVerifier: string;
  codeChallenge: string;
}

export function base64UrlSha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function isValidState(value: string): boolean {
  return value.length >= 16 && value.length <= 512 && OAUTH_VALUE_PATTERN.test(value);
}

export function isValidCodeVerifier(value: string): boolean {
  return value.length >= 43 && value.length <= 128 && OAUTH_VALUE_PATTERN.test(value);
}

export function createPkceTransaction(): PkceTransactionValues {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  return {
    state,
    stateHash: base64UrlSha256(state),
    codeVerifier,
    codeChallenge: base64UrlSha256(codeVerifier),
  };
}
