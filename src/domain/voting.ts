import type { VotingConfig, VotingModel } from "./types";

export const VOTING_MODEL_LABELS: Record<VotingModel, string> = {
  JUDGES_ONLY: "Judges only",
  PUBLIC_ONLY: "Public vote only",
  HYBRID: "Hybrid (judges + public)",
};

export function describeVoting(config: VotingConfig): string {
  if (config.model === "JUDGES_ONLY") return "100% judges";
  if (config.model === "PUBLIC_ONLY") return "100% public vote";
  return `${config.judgeWeight}% judges · ${config.publicWeight}% public vote`;
}

export function isVotingWindowOpen(config: VotingConfig, now = new Date()): boolean {
  if (!config.opensAt || !config.closesAt) return false;
  const t = now.getTime();
  return t >= new Date(config.opensAt).getTime() && t <= new Date(config.closesAt).getTime();
}

/**
 * Vote eligibility is decided server-side. This mirror exists so the UI can
 * explain *why* a vote is unavailable — it never authorises a vote.
 */
export type VoteRejection =
  "WINDOW_CLOSED" | "NOT_AUTHENTICATED" | "DAILY_LIMIT_REACHED" | "RATE_LIMITED" | "DUPLICATE";

export const VOTE_REJECTION_MESSAGES: Record<VoteRejection, string> = {
  WINDOW_CLOSED: "Voting is not open right now.",
  NOT_AUTHENTICATED: "Sign in to cast your vote.",
  DAILY_LIMIT_REACHED: "You've used all your votes for today.",
  RATE_LIMITED: "Too many attempts — please slow down.",
  DUPLICATE: "You've already cast this vote.",
};
