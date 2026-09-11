import { supabase } from "@/integrations/supabase/client";

/**
 * Live competition data layer.
 *
 * Every read and write here goes through row-level security, or through a
 * guarded database function for the actions that need server-side rules
 * (public voting, judging queue, round progression).
 */

export const SEASON_SLUG = "season-one";

export interface LiveCompetition {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  eligibility: string[];
  rules: string[];
  consent_requirements: string[];
  prize_pool: string;
  voting_model: string;
  judge_weight: number;
  public_weight: number;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  votes_per_user_per_day: number;
  vote_rate_limit_per_minute: number;
  current_round_id: string | null;
}

export interface PublicContestantRow {
  handle: string;
  display_name: string;
  category_name: string;
  group_name: string;
  location: string;
  bio: string;
  stage: string;
  competition_slug: string;
  vote_count: number;
}

export interface JudgeQueueRow {
  application_id: string;
  handle: string;
  display_name: string;
  category_name: string;
  bio: string;
  experience: string;
  audition_url: string;
  audition_notes: string;
  status: string;
  round_id: string | null;
  round_name: string;
  my_scored_criteria: number;
}

export interface CriterionRow {
  id: string;
  name: string;
  max_score: number;
  weight: number;
}

export async function fetchCompetition(
  slug: string = SEASON_SLUG,
): Promise<LiveCompetition | null> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as LiveCompetition | null) ?? null;
}

export async function fetchCategoryOptions() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, blurb, audition_hint, sort_order, category_groups(name, sort_order)")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCriteria(competitionId: string): Promise<CriterionRow[]> {
  const { data, error } = await supabase
    .from("scoring_criteria")
    .select("id, name, max_score, weight")
    .eq("competition_id", competitionId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as CriterionRow[];
}

export async function fetchPublicContestants(
  competitionSlug?: string,
): Promise<PublicContestantRow[]> {
  const { data, error } = await supabase.rpc(
    "public_contestants",
    competitionSlug ? { _competition_slug: competitionSlug } : {},
  );
  if (error) throw error;
  return (data ?? []) as unknown as PublicContestantRow[];
}

export async function fetchPublicContestant(handle: string): Promise<PublicContestantRow | null> {
  const all = await fetchPublicContestants();
  return all.find((c) => c.handle === handle) ?? null;
}

export async function fetchMyApplication() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, categories(name, slug, category_groups(name)), competitions(name, slug), competition_rounds(name, sequence)",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyRoles(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id);
  if (error) return [];
  return (data ?? []).map((r) => r.role as string);
}

export function slugifyHandle(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "contestant"
  );
}

export interface EntryInput {
  categorySlug: string;
  displayName: string;
  fullName: string;
  phone: string;
  email: string;
  location: string;
  dateOfBirth: string;
  bio: string;
  experience: string;
  auditionUrl: string;
  auditionNotes: string;
  identityRef: string | null;
  identityProvider: string;
}

/** Persists the signed-in user's entry. Requires an active session. */
export async function submitEntry(input: EntryInput) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You need to be signed in to submit an entry.");

  const competition = await fetchCompetition();
  if (!competition) throw new Error("The competition is not available right now.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", input.categorySlug)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category) throw new Error("That talent category is no longer available.");

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: input.email,
      display_name: input.displayName,
      bio: input.bio,
      location: input.location,
      primary_discipline: category.name,
      is_public: true,
      artistrysynk_identity_ref: input.identityRef,
      artistrysynk_provider: input.identityProvider,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  const base = slugifyHandle(input.displayName);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const handle = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("applications")
      .upsert(
        {
          competition_id: competition.id,
          user_id: user.id,
          category_id: category.id,
          display_name: input.displayName,
          handle,
          full_name: input.fullName,
          phone: input.phone,
          email: input.email,
          location: input.location,
          date_of_birth: input.dateOfBirth || null,
          bio: input.bio,
          experience: input.experience,
          audition_url: input.auditionUrl,
          audition_notes: input.auditionNotes,
          status: "SUBMITTED",
          current_round_id: competition.current_round_id,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "competition_id,user_id" },
      )
      .select("id, handle")
      .single();

    if (!error) return data;
    lastError = error;
    if (!String(error.message).includes("applications_handle_key")) break;
  }

  throw lastError instanceof Error ? lastError : new Error("Your entry could not be saved.");
}

export type VoteReason =
  | "NOT_AUTHENTICATED"
  | "NOT_FOUND"
  | "WINDOW_CLOSED"
  | "RATE_LIMITED"
  | "DAILY_LIMIT_REACHED"
  | "SELF_VOTE"
  | "DUPLICATE";


export interface VoteResult {
  ok: boolean;
  reason?: VoteReason;
  votesRemainingToday?: number;
  voteCount?: number;
}

export async function castVote(handle: string): Promise<VoteResult> {
  const { data, error } = await supabase.rpc("cast_vote", { _handle: handle });
  if (error) throw error;
  return data as unknown as VoteResult;
}

export const VOTE_MESSAGES: Record<VoteReason, string> = {
  NOT_AUTHENTICATED: "Sign in to cast your vote.",
  NOT_FOUND: "That contestant is not open for votes.",
  WINDOW_CLOSED: "Public voting is not open right now.",
  RATE_LIMITED: "Too many votes too quickly — please slow down.",
  DAILY_LIMIT_REACHED: "You've used all your votes for today.",
  SELF_VOTE: "You can't vote for your own entry.",
  DUPLICATE: "You've already voted for this contestant today.",

};

export async function fetchJudgeQueue(
  competitionSlug: string = SEASON_SLUG,
): Promise<JudgeQueueRow[]> {
  const { data, error } = await supabase.rpc("judge_queue", { _competition_slug: competitionSlug });
  if (error) throw error;
  return (data ?? []) as unknown as JudgeQueueRow[];
}

export async function fetchMyScores(applicationId: string, roundId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("scores")
    .select("criterion_id, value, comment")
    .eq("application_id", applicationId)
    .eq("round_id", roundId)
    .eq("judge_id", auth.user.id);
  if (error) throw error;
  return data ?? [];
}

export async function saveScores(
  applicationId: string,
  roundId: string,
  entries: { criterionId: string; value: number }[],
  comment: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to score.");
  const rows = entries.map((entry) => ({
    application_id: applicationId,
    round_id: roundId,
    judge_id: auth.user!.id,
    criterion_id: entry.criterionId,
    value: entry.value,
    comment,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("scores")
    .upsert(rows, { onConflict: "application_id,round_id,judge_id,criterion_id" });
  if (error) throw error;
}

export async function decideRound(
  applicationId: string,
  outcome: "ADVANCED" | "ELIMINATED" | "HELD",
) {
  const { data, error } = await supabase.rpc("advance_application", {
    _application_id: applicationId,
    _outcome: outcome,
  });
  if (error) throw error;
  return data;
}

export async function fetchLeaderboard(roundSlug: string, competitionSlug: string = SEASON_SLUG) {
  const { data, error } = await supabase.rpc("round_leaderboard", {
    _competition_slug: competitionSlug,
    _round_slug: roundSlug,
  });
  if (error) throw error;
  return (data ?? []) as unknown as {
    handle: string;
    display_name: string;
    category_name: string;
    judge_score: number;
    public_votes: number;
    combined: number;
  }[];
}

export async function claimFirstAdmin() {
  const { data, error } = await supabase.rpc("claim_first_admin");
  if (error) throw error;
  return data as unknown as { ok: boolean; reason?: string };
}

export async function grantRoleByEmail(email: string, role: string) {
  const { data, error } = await supabase.rpc("grant_role_by_email", {
    _email: email,
    _role: role as never,
  });
  if (error) throw error;
  return data as unknown as { ok: boolean; reason?: string };
}

export async function listTeam() {
  const { data, error } = await supabase.rpc("list_team");
  if (error) throw error;
  return (data ?? []) as unknown as {
    user_id: string;
    email: string;
    display_name: string;
    role: string;
  }[];
}
