import { supabase } from "@/integrations/supabase/client";

/**
 * Competition operations layer (Phase 3).
 *
 * Every call here goes through a guarded database routine. The routines decide
 * who may do what: progression, lifecycle, reviews, score corrections and vote
 * voiding are administrator-only, judging is limited to a judge's own
 * assignments, and moderators can moderate content but never change results.
 * The UI hides controls for convenience only — it never authorises anything.
 */


/** Supabase's generated RPC arg types reject explicit undefined, so drop empty keys. */
function rpcArgs(input: Record<string, unknown>): never {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null),
  ) as never;
}

export type Ok<T = Record<string, unknown>> = { ok: boolean; reason?: string } & T;

export const COMPETITION_STATUSES = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "IN_PROGRESS",
  "VOTING_OPEN",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const COMPETITION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Entries open",
  REGISTRATION_CLOSED: "Entries closed",
  IN_PROGRESS: "In progress",
  VOTING_OPEN: "Voting open",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

/** Mirrors competition_status_allows() in the database. */
export function nextCompetitionStatuses(current: string): string[] {
  switch (current) {
    case "DRAFT":
      return ["REGISTRATION_OPEN", "ARCHIVED"];
    case "REGISTRATION_OPEN":
      return ["REGISTRATION_CLOSED", "IN_PROGRESS", "ARCHIVED"];
    case "REGISTRATION_CLOSED":
      return ["REGISTRATION_OPEN", "IN_PROGRESS", "ARCHIVED"];
    case "IN_PROGRESS":
      return ["VOTING_OPEN", "COMPLETED", "ARCHIVED"];
    case "VOTING_OPEN":
      return ["IN_PROGRESS", "COMPLETED", "ARCHIVED"];
    case "COMPLETED":
      return ["ARCHIVED"];
    case "ARCHIVED":
      return [];
    default:
      return [...COMPETITION_STATUSES];
  }
}

export const ROUND_STATUSES = [
  "DRAFT",
  "OPEN",
  "JUDGING",
  "DECISION_PENDING",
  "DECIDED",
  "CLOSED",
] as const;

export const ROUND_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  JUDGING: "Judging",
  DECISION_PENDING: "Decisions pending",
  DECIDED: "Decided",
  CLOSED: "Closed",
};

/** Mirrors round_status_allows() in the database. */
export function nextRoundStatuses(current: string): string[] {
  switch (current) {
    case "DRAFT":
      return ["OPEN"];
    case "OPEN":
      return ["DRAFT", "JUDGING"];
    case "JUDGING":
      return ["OPEN", "DECISION_PENDING"];
    case "DECISION_PENDING":
      return ["JUDGING", "DECIDED"];
    case "DECIDED":
      return ["CLOSED"];
    default:
      return [];
  }
}

export const PROGRESS_STATES = [
  "APPLIED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "SHORTLISTED",
  "ROUND_ACTIVE",
  "ADVANCED",
  "ELIMINATED",
  "WITHDRAWN",
  "DISQUALIFIED",
  "WINNER",
] as const;

export const PROGRESS_STATE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  SHORTLISTED: "Shortlisted",
  ROUND_ACTIVE: "In this round",
  ADVANCED: "Advanced",
  ELIMINATED: "Eliminated",
  WITHDRAWN: "Withdrawn",
  DISQUALIFIED: "Disqualified",
  WINNER: "Winner",
};

export const SUBMISSION_STATES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUESTED",
] as const;

export const SUBMISSION_STATE_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUESTED: "Revision requested",
};

export const OPERATION_MESSAGES: Record<string, string> = {
  NOT_AUTHORISED: "Only competition administrators can do this.",
  NOT_AUTHORISED_TO_PUBLISH: "Only administrators can publish audition media.",
  NOT_FOUND: "That record no longer exists.",
  INVALID_TRANSITION: "That state change is not allowed from the current state.",
  INVALID_OUTCOME: "That decision is not recognised.",
  INVALID_STATE: "That state is not recognised.",
  INVALID_DECISION: "That decision is not recognised.",
  INVALID_WINDOW: "The voting window must close after it opens.",
  DECISIONS_INCOMPLETE: "Some contestants in this round still have no decision.",
  JUDGING_INCOMPLETE: "Judging for this round is not finished yet.",
  DUPLICATE_DECISION: "That decision was already recorded for this round.",
  CONTESTANT_INELIGIBLE: "Withdrawn or disqualified contestants cannot be advanced.",
  NO_ACTIVE_ROUND: "This competition has no active round yet.",
  REASON_REQUIRED: "A reason is required.",
  OUT_OF_RANGE: "That score is outside the allowed range.",
  NO_TARGET: "Choose which votes to void.",
  NO_COMPETITION: "No competition is configured yet.",
  NOT_AUTHENTICATED: "Sign in to continue.",
};

export function describeResult(result: Ok): string {
  if (result.ok) return "Done";
  return OPERATION_MESSAGES[result.reason ?? ""] ?? "That action could not be completed.";
}

/* ------------------------------------------------------------------ */
/* Competition lifecycle                                               */
/* ------------------------------------------------------------------ */

export async function setCompetitionStatus(
  competitionId: string,
  status: string,
  reason = "",
): Promise<Ok<{ previous_state?: string; new_state?: string }>> {
  const { data, error } = await supabase.rpc("set_competition_status", {
    _competition_id: competitionId,
    _status: status,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

/* ------------------------------------------------------------------ */
/* Round lifecycle                                                     */
/* ------------------------------------------------------------------ */

export interface RoundProgress {
  ok: boolean;
  contestants_in_round: number;
  judging_complete: number;
  judging_pending: number;
  criteria_count: number;
  assigned_judges: number;
  decisions: number;
  advanced: number;
  eliminated: number;
  unresolved: number;
}

export async function fetchRoundProgress(roundId: string): Promise<RoundProgress> {
  const { data, error } = await supabase.rpc("round_progress", { _round_id: roundId });
  if (error) throw error;
  return data as never;
}

export async function setRoundStatus(
  roundId: string,
  status: string,
  options?: { override?: boolean; reason?: string },
): Promise<Ok<{ progress?: RoundProgress }>> {
  const { data, error } = await supabase.rpc("set_round_status", {
    _round_id: roundId,
    _status: status,
    _override: options?.override ?? false,
    _reason: options?.reason ?? "",
  });
  if (error) throw error;
  return data as never;
}

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

export async function decideRoundResult(
  applicationId: string,
  outcome: "ADVANCED" | "ELIMINATED" | "HELD",
  reason = "",
): Promise<Ok<{ previous_state?: string; new_state?: string }>> {
  const { data, error } = await supabase.rpc("decide_round_result", {
    _application_id: applicationId,
    _outcome: outcome,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

export async function setApplicationState(
  applicationId: string,
  state: string,
  reason = "",
): Promise<Ok> {
  const { data, error } = await supabase.rpc("set_application_state", {
    _application_id: applicationId,
    _state: state,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

/* ------------------------------------------------------------------ */
/* Application and submission review                                   */
/* ------------------------------------------------------------------ */

export interface AdminApplicationRow {
  id: string;
  handle: string;
  display_name: string;
  category_id: string;
  category_name: string;
  status: string;
  progress_state: string;
  submission_state: string;
  media_is_public: boolean;
  review_decision: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  audition_url: string;
  audition_notes: string;
  submission_answers: Record<string, string> | null;
  bio: string;
  experience: string;
  location: string;
  round_name: string;
  created_at: string;
  submitted_at: string | null;
}

export async function fetchAdminApplications(filters?: {
  competitionSlug?: string | null;
  progressState?: string | null;
  submissionState?: string | null;
}): Promise<AdminApplicationRow[]> {
  const { data, error } = await supabase.rpc("admin_applications", rpcArgs({
    _competition_slug: filters?.competitionSlug ?? undefined,
    _progress_state: filters?.progressState ?? undefined,
    _submission_state: filters?.submissionState ?? undefined,
  }));
  if (error) throw error;
  return (data ?? []) as unknown as AdminApplicationRow[];
}

export async function reviewApplication(
  applicationId: string,
  decision: "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED" | "UNDER_REVIEW",
  reason = "",
): Promise<Ok> {
  const { data, error } = await supabase.rpc("review_application", {
    _application_id: applicationId,
    _decision: decision,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

export async function reviewSubmission(
  applicationId: string,
  state: string,
  options?: { reason?: string; publish?: boolean },
): Promise<Ok> {
  const { data, error } = await supabase.rpc("review_submission", {
    _application_id: applicationId,
    _state: state,
    _reason: options?.reason ?? "",
    _publish: options?.publish ?? false,
  });
  if (error) throw error;
  return data as never;
}

/* ------------------------------------------------------------------ */
/* Judging: judge dashboard, deadlines, score corrections              */
/* ------------------------------------------------------------------ */

export interface JudgeDashboard {
  ok: boolean;
  reason?: string;
  assigned?: boolean;
  competition_name?: string;
  competition_slug?: string;
  competition_status?: string;
  round_name?: string;
  round_status?: string;
  judging_opens_at?: string | null;
  judging_closes_at?: string | null;
  score_deadline_at?: string | null;
  criteria_count?: number;
  assigned_count?: number;
  scored_count?: number;
  pending_count?: number;
  completion_pct?: number;
  scopes?: { category: string }[];
}

export async function fetchJudgeDashboard(competitionSlug?: string): Promise<JudgeDashboard> {
  const { data, error } = await supabase.rpc("judge_dashboard", rpcArgs({
    _competition_slug: competitionSlug ?? undefined,
  }));
  if (error) throw error;
  return data as never;
}

export interface ScoreRow {
  id: string;
  application_id: string;
  round_id: string;
  criterion_id: string;
  judge_id: string;
  value: number;
  comment: string;
}

/** Staff read of every judge's scores for one entry, used for corrections. */
export async function fetchScoresForApplication(
  applicationId: string,
  roundId: string,
): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("id, application_id, round_id, criterion_id, judge_id, value, comment")
    .eq("application_id", applicationId)
    .eq("round_id", roundId);
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}

export async function correctScore(
  scoreId: string,
  value: number,
  reason: string,
): Promise<Ok<{ before?: number; after?: number; max_score?: number }>> {
  const { data, error } = await supabase.rpc("correct_score", {
    _score_id: scoreId,
    _value: value,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

export interface ScoreCorrectionRow {
  id: string;
  created_at: string;
  application_id: string;
  handle: string;
  criterion_name: string;
  judge_email: string | null;
  previous_value: number;
  corrected_value: number;
  reason: string;
  corrected_by_email: string | null;
}

export async function fetchScoreCorrections(
  applicationId?: string,
): Promise<ScoreCorrectionRow[]> {
  const { data, error } = await supabase.rpc("list_score_corrections", rpcArgs({
    _application_id: applicationId ?? undefined,
  }));
  if (error) throw error;
  return (data ?? []) as unknown as ScoreCorrectionRow[];
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export interface RoundResultRow {
  application_id: string;
  handle: string;
  display_name: string;
  category_name: string;
  progress_state: string;
  judge_score: number;
  judges_scored: number;
  public_votes: number;
  combined: number;
  outcome: string | null;
  decided_at: string | null;
}

export async function fetchRoundResults(roundId: string): Promise<RoundResultRow[]> {
  const { data, error } = await supabase.rpc("round_results_detail", { _round_id: roundId });
  if (error) throw error;
  return (data ?? []) as unknown as RoundResultRow[];
}

/* ------------------------------------------------------------------ */
/* Voting operations                                                   */
/* ------------------------------------------------------------------ */

export interface VoteTotalRow {
  application_id: string;
  handle: string;
  display_name: string;
  category_name: string;
  round_name: string;
  valid_votes: number;
  voided_votes: number;
  distinct_voters: number;
  last_vote_at: string | null;
}

export async function fetchVoteTotals(filters?: {
  competitionSlug?: string | null;
  roundId?: string | null;
  categoryId?: string | null;
}): Promise<VoteTotalRow[]> {
  const { data, error } = await supabase.rpc("vote_totals", rpcArgs({
    _competition_slug: filters?.competitionSlug ?? undefined,
    _round_id: filters?.roundId ?? undefined,
    _category_id: filters?.categoryId ?? undefined,
  }));
  if (error) throw error;
  return (data ?? []) as unknown as VoteTotalRow[];
}

export interface SuspiciousVoterRow {
  voter_id: string;
  voter_email: string | null;
  votes_today: number;
  votes_last_hour: number;
  distinct_contestants: number;
}

export async function fetchSuspiciousVoters(
  competitionSlug?: string,
): Promise<SuspiciousVoterRow[]> {
  const { data, error } = await supabase.rpc("suspicious_vote_activity", rpcArgs({
    _competition_slug: competitionSlug ?? undefined,
    _limit: 50,
  }));
  if (error) throw error;
  return (data ?? []) as unknown as SuspiciousVoterRow[];
}

export async function voidVotes(
  reason: string,
  target: { applicationId?: string; voterId?: string; voteIds?: string[] },
): Promise<Ok<{ voided?: number }>> {
  const { data, error } = await supabase.rpc("void_votes", rpcArgs({
    _reason: reason,
    _vote_ids: target.voteIds ?? undefined,
    _application_id: target.applicationId ?? undefined,
    _voter_id: target.voterId ?? undefined,
  }));
  if (error) throw error;
  return data as never;
}

export async function setVotingWindow(
  competitionId: string,
  opensAt: string | null,
  closesAt: string | null,
  reason = "",
): Promise<Ok> {
  const { data, error } = await supabase.rpc("set_voting_window", rpcArgs({
    _competition_id: competitionId,
    _opens_at: opensAt ?? undefined,
    _closes_at: closesAt ?? undefined,
    _reason: reason,
  }));
  if (error) throw error;
  return data as never;
}

export async function closeVotingNow(competitionId: string, reason = ""): Promise<Ok> {
  const { data, error } = await supabase.rpc("close_voting_now", {
    _competition_id: competitionId,
    _reason: reason,
  });
  if (error) throw error;
  return data as never;
}

/* ------------------------------------------------------------------ */
/* Admin operations snapshot                                           */
/* ------------------------------------------------------------------ */

export interface OpsSnapshot {
  ok: boolean;
  reason?: string;
  competition?: {
    id: string;
    slug: string;
    name: string;
    status: string;
    judge_weight: number;
    public_weight: number;
    voting_model: string;
    voting_opens_at: string | null;
    voting_closes_at: string | null;
  };
  current_round?: {
    id: string;
    name: string;
    status: string;
    judging_closes_at: string | null;
    score_deadline_at: string | null;
  } | null;
  registrations?: number;
  applications_pending?: number;
  submissions_pending?: number;
  round_progress?: Partial<RoundProgress>;
  votes_valid?: number;
  votes_voided?: number;
  voting_live?: boolean;
}

export async function fetchOpsSnapshot(competitionSlug?: string): Promise<OpsSnapshot> {
  const { data, error } = await supabase.rpc("admin_ops_snapshot", rpcArgs({
    _competition_slug: competitionSlug ?? undefined,
  }));
  if (error) throw error;
  return data as never;
}

export interface AdminAccountRow {
  user_id: string;
  email: string | null;
  display_name: string;
  handle: string | null;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  is_owner: boolean;
  roles: string[];
  entry_reference: string | null;
  entry_name: string | null;
  entry_category: string | null;
  entry_progress_state: string | null;
  entry_submission_state: string | null;
  artistrysynk_status: string | null;
}

/** Every registered account. Server-side admin-only. */
export async function fetchAdminAccounts(search?: string): Promise<AdminAccountRow[]> {
  const { data, error } = await supabase.rpc("admin_accounts", rpcArgs({
    _search: search && search.trim() ? search.trim() : undefined,
  }));
  if (error) throw error;
  return (data ?? []) as unknown as AdminAccountRow[];
}
