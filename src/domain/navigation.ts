import type { Permission } from "./roles";

/**
 * Admin and contestant surface maps. Each entry declares the permission that
 * will gate it server-side once the backend is connected — the UI uses this to
 * hide controls, never to authorise anything.
 */

export interface SurfaceSection {
  slug: string;
  label: string;
  summary: string;
  permission: Permission;
  phase: "PHASE_1" | "LATER";
}

export const ADMIN_SECTIONS: SurfaceSection[] = [
  {
    slug: "competitions",
    label: "Competitions",
    summary:
      "Create seasons, set dates and registration windows, move status through the lifecycle.",
    permission: "competition:configure",
    phase: "PHASE_1",
  },
  {
    slug: "categories",
    label: "Categories",
    summary: "Configure category groups and talent categories per competition.",
    permission: "category:manage",
    phase: "PHASE_1",
  },
  {
    slug: "rounds",
    label: "Rounds",
    summary: "Define the round structure, windows and advancement rules.",
    permission: "round:manage",
    phase: "PHASE_1",
  },
  {
    slug: "applications",
    label: "Applications",
    summary: "Review, approve, reject and de-duplicate contestant applications.",
    permission: "application:review",
    phase: "LATER",
  },
  {
    slug: "contestants",
    label: "Contestants",
    summary: "Manage contestant records, suspensions and disqualifications.",
    permission: "contestant:suspend",
    phase: "LATER",
  },
  {
    slug: "submissions",
    label: "Submissions",
    summary: "Moderate audition media before anything becomes public.",
    permission: "submission:moderate",
    phase: "LATER",
  },
  {
    slug: "judging",
    label: "Judging panel",
    summary: "Appoint judges, score contestants and move them through rounds.",
    permission: "judge:manage",
    phase: "PHASE_1",
  },
  {
    slug: "scoring",
    label: "Scoring",
    summary: "Configure scoring criteria, maximums and weights.",
    permission: "scoring:configure",
    phase: "PHASE_1",
  },
  {
    slug: "shortlists",
    label: "Shortlists",
    summary: "Build round shortlists and advance contestants.",
    permission: "shortlist:manage",
    phase: "LATER",
  },
  {
    slug: "voting",
    label: "Voting",
    summary: "Configure voting model, weights, windows, limits and fraud controls.",
    permission: "voting:configure",
    phase: "PHASE_1",
  },
  {
    slug: "sponsors",
    label: "Sponsors",
    summary: "Manage sponsors, tiers, logos, links, placement and visibility.",
    permission: "sponsor:manage",
    phase: "PHASE_1",
  },
  {
    slug: "announcements",
    label: "Announcements",
    summary: "Publish targeted announcements to public, contestants or judges.",
    permission: "announcement:publish",
    phase: "PHASE_1",
  },
  {
    slug: "badges",
    label: "Badges",
    summary: "Define and award competition recognition badges.",
    permission: "badge:award",
    phase: "PHASE_1",
  },
  {
    slug: "moderation",
    label: "Moderation",
    summary: "Handle reports, flagged media and integrity reviews.",
    permission: "application:moderate",
    phase: "LATER",
  },
  {
    slug: "audit-logs",
    label: "Audit Logs",
    summary: "Append-only record of every admin, judge and vote action.",
    permission: "audit:read",
    phase: "LATER",
  },
  {
    slug: "settings",
    label: "Settings",
    summary: "Platform settings, integrations and notification channels.",
    permission: "settings:manage",
    phase: "LATER",
  },
];

export interface DashboardSection {
  slug: string;
  label: string;
  summary: string;
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    slug: "application",
    label: "My Application",
    summary: "Everything you submitted, and what is still needed.",
  },
  {
    slug: "audition",
    label: "My Audition",
    summary: "Your audition media and its moderation status.",
  },
  {
    slug: "status",
    label: "Competition Status",
    summary: "Where you are in the competition right now.",
  },
  {
    slug: "announcements",
    label: "Announcements",
    summary: "Updates for contestants in your competition.",
  },
  { slug: "voting", label: "Voting", summary: "Voting windows, rules and your results when open." },
  {
    slug: "profile",
    label: "My Creative Profile",
    summary: "Your permanent ArtistrySynk creative profile.",
  },
  {
    slug: "notifications",
    label: "Notifications",
    summary: "Your delivery preferences and history.",
  },
  {
    slug: "rules",
    label: "Competition Rules",
    summary: "The rules, eligibility and consent you accepted.",
  },
];
