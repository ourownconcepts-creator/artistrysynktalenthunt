import {
  ANNOUNCEMENTS,
  BADGES,
  COMPETITIONS,
  DEMO_APPLICATION,
  PUBLIC_CONTESTANTS,
  SPONSORS,
} from "@/domain/seed";
import { CATEGORY_GROUPS } from "@/domain/catalogue";
import type {
  Announcement,
  Badge,
  CategoryGroup,
  Competition,
  ContestantApplication,
  PublicContestant,
  Sponsor,
  SponsorPlacement,
} from "@/domain/types";

/**
 * Read layer for competition data.
 *
 * Phase 1 reads the seed configuration synchronously. When the backend is
 * connected, each function here becomes a `createServerFn` call (or a query
 * against it) and callers keep the same shapes — private reads move behind
 * authenticated server functions and row-level policies.
 */

export function listCompetitions(): Competition[] {
  return COMPETITIONS.filter((c) => c.status !== "DRAFT" && c.status !== "ARCHIVED");
}

export function getFeaturedCompetition(): Competition {
  return listCompetitions()[0] ?? COMPETITIONS[0]!;
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}

export function listCategoryGroups(): CategoryGroup[] {
  return CATEGORY_GROUPS.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listSponsors(placement?: SponsorPlacement): Sponsor[] {
  return SPONSORS.filter((s) => s.isActive)
    .filter((s) => !placement || s.placements.includes(placement))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listAnnouncements(audience: Announcement["audience"] = "PUBLIC"): Announcement[] {
  return ANNOUNCEMENTS.filter((a) => a.audience === audience || audience === "CONTESTANTS")
    .slice()
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}

export function listBadges(): Badge[] {
  return BADGES;
}

export function listPublicContestants(): PublicContestant[] {
  return PUBLIC_CONTESTANTS;
}

export function getPublicContestant(handle: string): PublicContestant | undefined {
  return PUBLIC_CONTESTANTS.find((c) => c.handle === handle);
}

/**
 * Private application read. Phase 1 returns a demo record; once auth is
 * connected this becomes an authenticated server function scoped to the caller
 * and is never readable by anyone else.
 */
export function getMyApplication(): ContestantApplication {
  return DEMO_APPLICATION;
}
