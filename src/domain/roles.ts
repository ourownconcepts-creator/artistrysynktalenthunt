/**
 * Role + permission model. Client code may use this to hide controls, but it is
 * NEVER the security boundary: every mutation must re-check the caller's role
 * server-side (and in row-level policies) once the backend is connected.
 */

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "JUDGE",
  "MODERATOR",
  "SPONSOR_MANAGER",
  "CONTESTANT",
  "PUBLIC_USER",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "competition:configure",
  "competition:publish",
  "category:manage",
  "round:manage",
  "application:review",
  "application:moderate",
  "contestant:suspend",
  "submission:moderate",
  "judge:manage",
  "judge:assign",
  "scoring:configure",
  "score:submit",
  "shortlist:manage",
  "voting:configure",
  "voting:administer",
  "results:publish",
  "sponsor:manage",
  "announcement:publish",
  "badge:award",
  "audit:read",
  "settings:manage",
  "application:own:read",
  "application:own:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const CONTESTANT_PERMISSIONS: Permission[] = ["application:own:read", "application:own:write"];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: [
    "competition:configure",
    "competition:publish",
    "category:manage",
    "round:manage",
    "application:review",
    "application:moderate",
    "contestant:suspend",
    "submission:moderate",
    "judge:manage",
    "judge:assign",
    "scoring:configure",
    "shortlist:manage",
    "voting:configure",
    "voting:administer",
    "results:publish",
    "sponsor:manage",
    "announcement:publish",
    "badge:award",
    "audit:read",
  ],
  // A judge scores assigned contestants only — no config, sponsor, vote or
  // cross-judge access, and no ability to alter published results.
  JUDGE: ["score:submit"],
  MODERATOR: ["application:moderate", "submission:moderate", "contestant:suspend"],
  SPONSOR_MANAGER: ["sponsor:manage"],
  CONTESTANT: CONTESTANT_PERMISSIONS,
  PUBLIC_USER: [],
};

export function can(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  JUDGE: "Judge",
  MODERATOR: "Moderator",
  SPONSOR_MANAGER: "Sponsor Manager",
  CONTESTANT: "Contestant",
  PUBLIC_USER: "Public User",
};
