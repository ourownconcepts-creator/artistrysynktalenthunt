import { useQuery } from "@tanstack/react-query";

import {
  fetchAnnouncements,
  fetchCategories,
  fetchCompetition,
  fetchRounds,
  fetchSponsors,
  groupCategories,
} from "@/lib/live-data";

/**
 * Competition context for the app. The active competition comes from the
 * database — an admin changes it without touching any code. Pass a slug for
 * competition-specific pages.
 */
export function useCompetition(slug?: string) {
  return useQuery({
    queryKey: ["competition", slug ?? "active"],
    queryFn: () => fetchCompetition(slug),
  });
}

export function useRounds(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => fetchRounds(competitionId!),
    enabled: Boolean(competitionId),
  });
}

export function useCategoryGroups(competitionId: string | undefined, activeOnly = true) {
  return useQuery({
    queryKey: ["categories", competitionId ?? "all", activeOnly],
    queryFn: async () =>
      groupCategories(
        await fetchCategories({ competitionId: competitionId ?? null, activeOnly }),
      ),
  });
}

export function useSponsors(placement?: string, competitionId?: string) {
  return useQuery({
    queryKey: ["sponsors", placement ?? "all", competitionId ?? "all"],
    queryFn: () =>
      fetchSponsors({ competitionId: competitionId ?? null, ...(placement ? { placement } : {}) }),
  });
}

export function usePublicAnnouncements(competitionId?: string) {
  return useQuery({
    queryKey: ["announcements", "PUBLIC", competitionId ?? "all"],
    queryFn: () =>
      fetchAnnouncements({ audience: "PUBLIC", competitionId: competitionId ?? null }),
  });
}
