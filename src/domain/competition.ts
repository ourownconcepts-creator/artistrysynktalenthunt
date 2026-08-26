import type {
  ApplicationStatus,
  Competition,
  CompetitionStatus,
  ApplicationJourneyStep,
} from "./types";

export const COMPETITION_STATUS_LABELS: Record<CompetitionStatus, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration open",
  REGISTRATION_CLOSED: "Registration closed",
  IN_PROGRESS: "In progress",
  VOTING_OPEN: "Voting open",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  DISQUALIFIED: "Disqualified",
};

/** Allowed competition status transitions — enforced server-side later. */
export const COMPETITION_TRANSITIONS: Record<CompetitionStatus, CompetitionStatus[]> = {
  DRAFT: ["REGISTRATION_OPEN", "ARCHIVED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "ARCHIVED"],
  REGISTRATION_CLOSED: ["IN_PROGRESS", "ARCHIVED"],
  IN_PROGRESS: ["VOTING_OPEN", "COMPLETED", "ARCHIVED"],
  VOTING_OPEN: ["IN_PROGRESS", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: CompetitionStatus, to: CompetitionStatus): boolean {
  return COMPETITION_TRANSITIONS[from].includes(to);
}

export function isRegistrationOpen(competition: Competition, now = new Date()): boolean {
  if (competition.status !== "REGISTRATION_OPEN") return false;
  const opens = new Date(competition.registrationOpensAt).getTime();
  const closes = new Date(competition.registrationClosesAt).getTime();
  const t = now.getTime();
  return t >= opens && t <= closes;
}

export function daysUntil(iso: string, now = new Date()): number {
  const diff = new Date(iso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** Rounds are rows, not code: the journey is derived from configured rounds. */
export function buildJourney(
  competition: Competition,
  currentRoundSlug: string,
): ApplicationJourneyStep[] {
  const rounds = [...competition.rounds].sort((a, b) => a.sequence - b.sequence);
  const currentIndex = rounds.findIndex((r) => r.slug === currentRoundSlug);

  return rounds.map((round, index) => ({
    key: round.slug,
    label: round.name,
    state: index < currentIndex ? "DONE" : index === currentIndex ? "CURRENT" : "UPCOMING",
  }));
}

export function formatDateRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(startIso)} — ${fmt(endIso)}`;
}
