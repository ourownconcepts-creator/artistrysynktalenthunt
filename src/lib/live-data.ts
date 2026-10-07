import { supabase } from "@/integrations/supabase/client";

/**
 * Live competition data layer.
 *
 * Everything the app shows comes from the database: competitions, categories,
 * per-category submission requirements, rounds, criteria, sponsors,
 * announcements and badges. There is no hard-coded season anywhere — the
 * active competition is resolved by the database.
 *
 * Every read and write here goes through row-level security, or through a
 * guarded database function for actions that need server-side rules
 * (public voting, judging queue, round progression, role grants, audit reads).
 */

export interface LiveCompetition {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: string;
  is_featured: boolean;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  eligibility: string[];
  rules: string[];
  consent_requirements: string[];
  prize_pool: string;
  cities: number;
  voting_model: string;
  judge_weight: number;
  public_weight: number;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  votes_per_user_per_day: number;
  vote_rate_limit_per_minute: number;
  requires_authentication: boolean;
  current_round_id: string | null;
}

export interface RoundRow {
  id: string;
  competition_id: string;
  slug: string;
  name: string;
  sequence: number;
  description: string;
  opens_at: string | null;
  closes_at: string | null;
  advancement_rule: string;
  is_active: boolean;
  judging_enabled: boolean;
  voting_enabled: boolean;
  submission_requirements: string;
  status: string;
  judging_opens_at: string | null;
  judging_closes_at: string | null;
  score_deadline_at: string | null;
  decided_at: string | null;
  closed_at: string | null;
}

export interface GroupRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryRow {
  id: string;
  group_id: string;
  competition_id: string | null;
  slug: string;
  name: string;
  blurb: string;
  audition_hint: string;
  eligibility: string;
  sort_order: number;
  is_active: boolean;
  category_groups: GroupRow | null;
}

export type RequirementKind =
  "URL" | "TEXT" | "LONG_TEXT" | "NUMBER" | "DATE" | "FILE_URL" | "IMAGE_URL_LIST";

export const REQUIREMENT_KINDS: RequirementKind[] = [
  "URL",
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "FILE_URL",
  "IMAGE_URL_LIST",
];

export const REQUIREMENT_KIND_LABELS: Record<RequirementKind, string> = {
  URL: "Link",
  TEXT: "Short text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DATE: "Date",
  FILE_URL: "File link",
  IMAGE_URL_LIST: "Image links (one per line)",
};

export interface RequirementRow {
  id: string;
  category_id: string;
  key: string;
  label: string;
  kind: RequirementKind;
  help_text: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface CriterionRow {
  id: string;
  name: string;
  max_score: number;
  weight: number;
  sort_order: number;
  is_active: boolean;
  round_id: string | null;
}

export interface SponsorRow {
  id: string;
  name: string;
  tier: string;
  description: string;
  website: string;
  logo_url: string | null;
  placements: string[];
  sort_order: number;
  is_active: boolean;
  competition_id: string | null;
}

export const SPONSOR_TIERS = [
  "MAJOR_SPONSOR",
  "SUPPORTING_SPONSOR",
  "PARTNER",
  "MEDIA_PARTNER",
] as const;

export const SPONSOR_TIER_LABELS: Record<string, string> = {
  MAJOR_SPONSOR: "Main sponsor",
  SUPPORTING_SPONSOR: "Supporting sponsors",
  PARTNER: "Partner",
  MEDIA_PARTNER: "Media partner",
};

export const SPONSOR_PLACEMENTS = ["HERO", "HEADER", "FOOTER", "SIDEBAR", "SPONSOR_PAGE"] as const;

export interface AnnouncementRow {
  id: string;
  competition_id: string | null;
  round_id: string | null;
  title: string;
  body: string;
  audience: string;
  is_pinned: boolean;
  is_published: boolean;
  scheduled_for: string | null;
  published_at: string;
}

export interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  award_condition: string;
  is_active: boolean;
  competition_id: string | null;
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

export interface AuditRow {
  id: string;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_email: string | null;
  detail: Record<string, unknown>;
}

export interface JudgeAssignmentRow {
  assignment_id: string;
  judge_id: string;
  judge_email: string | null;
  judge_name: string;
  competition_id: string;
  competition_name: string;
  category_id: string | null;
  category_name: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Competition context                                                 */
/* ------------------------------------------------------------------ */

/** The database decides which competition is current — never the code. */
export async function fetchActiveCompetitionSlug(): Promise<string | null> {
  const { data, error } = await supabase.rpc("active_competition_slug");
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchCompetition(slug?: string): Promise<LiveCompetition | null> {
  const resolved = slug ?? (await fetchActiveCompetitionSlug());
  if (!resolved) return null;
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", resolved)
    .maybeSingle();
  if (error) throw error;
  return (data as LiveCompetition | null) ?? null;
}

export async function fetchCompetitions(): Promise<LiveCompetition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LiveCompetition[];
}

export async function fetchPublicCompetitions(): Promise<LiveCompetition[]> {
  const all = await fetchCompetitions();
  return all.filter((c) => c.status !== "DRAFT" && c.status !== "ARCHIVED");
}

export async function saveCompetition(id: string, patch: Partial<LiveCompetition>): Promise<void> {
  const { error } = await supabase
    .from("competitions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function createCompetition(input: {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: string;
}): Promise<{ id: string; slug: string }> {
  const { data, error } = await supabase
    .from("competitions")
    .insert(input)
    .select("id, slug")
    .single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

/** Exactly one competition is featured at a time. */
export async function setFeaturedCompetition(id: string): Promise<void> {
  const clear = await supabase.from("competitions").update({ is_featured: false }).neq("id", id);
  if (clear.error) throw clear.error;
  const { error } = await supabase.from("competitions").update({ is_featured: true }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Categories and their submission requirements                        */
/* ------------------------------------------------------------------ */

const CATEGORY_SELECT =
  "id, group_id, competition_id, slug, name, blurb, audition_hint, eligibility, sort_order, is_active, category_groups(id, slug, name, description, sort_order, is_active)";

export async function fetchCategories(options?: {
  competitionId?: string | null;
  activeOnly?: boolean;
}): Promise<CategoryRow[]> {
  let query = supabase.from("categories").select(CATEGORY_SELECT).order("sort_order");
  if (options?.activeOnly) query = query.eq("is_active", true);
  if (options?.competitionId) {
    query = query.or(`competition_id.is.null,competition_id.eq.${options.competitionId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CategoryRow[];
}

export async function fetchCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CategoryRow | null) ?? null;
}

export interface GroupedCategories extends GroupRow {
  categories: CategoryRow[];
}

/** Groups live category rows by their configured group, in admin-defined order. */
export function groupCategories(rows: CategoryRow[]): GroupedCategories[] {
  const map = new Map<string, GroupedCategories>();
  for (const row of rows) {
    const group = row.category_groups;
    if (!group) continue;
    const existing = map.get(group.id);
    if (existing) {
      existing.categories.push(row);
    } else {
      map.set(group.id, { ...group, categories: [row] });
    }
  }
  return [...map.values()]
    .filter((g) => g.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({ ...g, categories: g.categories.sort((a, b) => a.sort_order - b.sort_order) }));
}

export async function fetchCategoryGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabase
    .from("category_groups")
    .select("id, slug, name, description, sort_order, is_active")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as GroupRow[];
}

export async function saveCategoryGroup(input: Partial<GroupRow> & { name: string; slug: string }) {
  const { error } = await supabase.from("category_groups").upsert(input as never, {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function saveCategory(
  input: Partial<CategoryRow> & { name: string; slug: string; group_id: string },
): Promise<void> {
  const { category_groups: _drop, ...row } = input as Record<string, unknown> & {
    category_groups?: unknown;
  };
  const { error } = row["id"]
    ? await supabase
        .from("categories")
        .update(row as never)
        .eq("id", row["id"] as string)
    : await supabase.from("categories").insert(row as never);
  if (error) throw error;
}

/** Categories are archived, never deleted — historical entries depend on them. */
export async function setCategoryActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function fetchRequirements(
  categoryId: string,
  activeOnly = false,
): Promise<RequirementRow[]> {
  let query = supabase
    .from("category_requirements")
    .select("id, category_id, key, label, kind, help_text, is_required, sort_order, is_active")
    .eq("category_id", categoryId)
    .order("sort_order");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RequirementRow[];
}

export async function saveRequirement(
  input: Partial<RequirementRow> & { category_id: string; key: string; label: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("category_requirements")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("category_requirements").insert(input as never);
  if (error) throw error;
}

export async function deleteRequirement(id: string): Promise<void> {
  const { error } = await supabase.from("category_requirements").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Rounds and criteria                                                 */
/* ------------------------------------------------------------------ */

export async function fetchRounds(competitionId: string): Promise<RoundRow[]> {
  const { data, error } = await supabase
    .from("competition_rounds")
    .select("*")
    .eq("competition_id", competitionId)
    .order("sequence");
  if (error) throw error;
  return (data ?? []) as RoundRow[];
}

export async function saveRound(
  input: Partial<RoundRow> & { competition_id: string; name: string; slug: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("competition_rounds")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("competition_rounds").insert(input as never);
  if (error) throw error;
}

export async function fetchCriteria(
  competitionId: string,
  options?: { roundId?: string | null; activeOnly?: boolean },
): Promise<CriterionRow[]> {
  let query = supabase
    .from("scoring_criteria")
    .select("id, name, max_score, weight, sort_order, is_active, round_id")
    .eq("competition_id", competitionId)
    .order("sort_order");
  if (options?.activeOnly !== false) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as CriterionRow[];
  if (!options?.roundId) return rows;
  return rows.filter((c) => c.round_id === null || c.round_id === options.roundId);
}

export async function saveCriterion(
  input: Partial<CriterionRow> & { competition_id: string; name: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("scoring_criteria")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("scoring_criteria").insert(input as never);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Sponsors, announcements, badges                                     */
/* ------------------------------------------------------------------ */

export async function fetchSponsors(options?: {
  placement?: string;
  competitionId?: string | null;
  activeOnly?: boolean;
}): Promise<SponsorRow[]> {
  let query = supabase.from("sponsors").select("*").order("sort_order");
  if (options?.activeOnly !== false) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as SponsorRow[];
  if (options?.placement) rows = rows.filter((s) => s.placements.includes(options.placement!));
  if (options?.competitionId) {
    rows = rows.filter(
      (s) => s.competition_id === null || s.competition_id === options.competitionId,
    );
  }
  return rows;
}

export async function saveSponsor(
  input: Partial<SponsorRow> & { name: string; tier: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("sponsors")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("sponsors").insert(input as never);
  if (error) throw error;
}

export async function fetchAnnouncements(options?: {
  audience?: string;
  competitionId?: string | null;
  includeUnpublished?: boolean;
}): Promise<AnnouncementRow[]> {
  let query = supabase
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });
  if (options?.audience) query = query.eq("audience", options.audience);
  if (options?.competitionId) {
    query = query.or(`competition_id.is.null,competition_id.eq.${options.competitionId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AnnouncementRow[];
}

export async function saveAnnouncement(
  input: Partial<AnnouncementRow> & { title: string; body: string; audience: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("announcements")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("announcements").insert(input as never);
  if (error) throw error;
}

export async function fetchBadges(): Promise<BadgeRow[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("id, slug, name, description, icon, award_condition, is_active, competition_id")
    .order("name");
  if (error) throw error;
  return (data ?? []) as BadgeRow[];
}

export async function saveBadge(
  input: Partial<BadgeRow> & { name: string; slug: string },
): Promise<void> {
  const { error } = input.id
    ? await supabase
        .from("badges")
        .update(input as never)
        .eq("id", input.id)
    : await supabase.from("badges").insert(input as never);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Public contestants                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* The signed-in contestant                                            */
/* ------------------------------------------------------------------ */

export interface MyApplication {
  id: string;
  reference_code: string | null;
  handle: string;
  display_name: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  experience: string;
  audition_url: string;
  audition_notes: string;
  submission_answers: Record<string, string>;
  status: string;
  progress_state: string;
  submission_state: string;
  state_reason: string | null;
  review_reason: string | null;
  updated_at: string | null;
  is_public: boolean;
  submitted_at: string | null;
  competition_id: string;
  category_id: string;
  current_round_id: string | null;
  categories: { name: string; slug: string; category_groups: { name: string } | null } | null;
  competitions: (LiveCompetition & { id: string }) | null;
  competition_rounds: { id: string; name: string; slug: string; sequence: number } | null;
}

export async function fetchMyApplication(): Promise<MyApplication | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, categories(name, slug, category_groups(name)), competitions(*), competition_rounds(id, name, slug, sequence)",
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as MyApplication | null) ?? null;
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

export async function fetchMyProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  competitionSlug: string;
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
  submissionAnswers: Record<string, string>;
}

/** Persists the signed-in user's entry. Requires an active session. */
export async function submitEntry(input: EntryInput) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You need to be signed in to submit an entry.");

  const competition = await fetchCompetition(input.competitionSlug);
  if (!competition) throw new Error("The competition is not available right now.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, is_active")
    .eq("slug", input.categorySlug)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category || !category.is_active) {
    throw new Error("That talent category is no longer open for entries.");
  }

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: input.email,
      display_name: input.displayName,
      bio: input.bio,
      location: input.location,
      primary_discipline: category.name,
      is_public: true,
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
          submission_answers: input.submissionAnswers,
          status: "SUBMITTED",
          current_round_id: competition.current_round_id,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "competition_id,user_id" },
      )
      .select("id, handle")
      .single();

    if (!error) {
      // Give a brand-new talent profile its first handle; never overwrite one.
      await supabase
        .from("profiles")
        .update({ handle: data.handle })
        .eq("id", user.id)
        .is("handle", null);
      return data;
    }
    lastError = error;
    if (!String(error.message).includes("applications_handle_key")) break;
  }

  throw lastError instanceof Error ? lastError : new Error("Your entry could not be saved.");
}

/* ------------------------------------------------------------------ */
/* Voting                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Judging                                                             */
/* ------------------------------------------------------------------ */

export async function fetchJudgeQueue(competitionSlug?: string): Promise<JudgeQueueRow[]> {
  const slug = competitionSlug ?? (await fetchActiveCompetitionSlug());
  if (!slug) return [];
  const { data, error } = await supabase.rpc("judge_queue", { _competition_slug: slug });
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

export async function fetchLeaderboard(roundSlug: string, competitionSlug?: string) {
  const slug = competitionSlug ?? (await fetchActiveCompetitionSlug());
  if (!slug) return [];
  const { data, error } = await supabase.rpc("round_leaderboard", {
    _competition_slug: slug,
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

/* ------------------------------------------------------------------ */
/* Staff, judges, audit                                                */
/* ------------------------------------------------------------------ */

export async function claimFirstAdmin() {
  const { data, error } = await supabase.rpc("claim_first_admin");
  if (error) throw error;
  return data as unknown as { ok: boolean; reason?: string };
}

export async function grantRoleByEmail(email: string, role: string, competitionSlug?: string) {
  const { data, error } = await supabase.rpc("grant_role_by_email", {
    _email: email,
    _role: role as never,
    ...(competitionSlug ? { _competition_slug: competitionSlug } : {}),
  });
  if (error) throw error;
  return data as unknown as { ok: boolean; reason?: string };
}

export async function revokeRoleByEmail(email: string, role: string) {
  const { data, error } = await supabase.rpc("revoke_role_by_email", {
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

export async function fetchJudgeAssignments(
  competitionSlug?: string,
): Promise<JudgeAssignmentRow[]> {
  const { data, error } = await supabase.rpc("list_judge_assignments", {
    ...(competitionSlug ? { _competition_slug: competitionSlug } : {}),
  });
  if (error) throw error;
  return (data ?? []) as unknown as JudgeAssignmentRow[];
}

export async function assignJudge(input: {
  judgeId: string;
  competitionId: string;
  categoryId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("judge_assignments").insert({
    judge_id: input.judgeId,
    competition_id: input.competitionId,
    category_id: input.categoryId ?? null,
  });
  if (error) throw error;
}

export async function removeJudgeAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("judge_assignments").delete().eq("id", id);
  if (error) throw error;
}

export interface AuditFilters {
  action?: string;
  entity?: string;
  actorEmail?: string;
  entityId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function fetchAuditFeed(filters: AuditFilters = {}): Promise<AuditRow[]> {
  const args: Record<string, string | number> = { _limit: filters.limit ?? 200 };
  if (filters.action) args["_action"] = filters.action;
  if (filters.entity) args["_entity"] = filters.entity;
  if (filters.actorEmail) args["_actor_email"] = filters.actorEmail;
  if (filters.entityId) args["_entity_id"] = filters.entityId;
  if (filters.from) args["_from"] = filters.from;
  if (filters.to) args["_to"] = filters.to;
  const { data, error } = await supabase.rpc("audit_feed", args as never);
  if (error) throw error;
  return (data ?? []) as unknown as AuditRow[];
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

export function describeVotingModel(competition: LiveCompetition): string {
  if (competition.voting_model === "JUDGES_ONLY") return "Judges only";
  if (competition.voting_model === "PUBLIC_ONLY") return "Public vote only";
  return `${competition.judge_weight}% judges / ${competition.public_weight}% public vote`;
}

export function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "TBC";
  return `${fmt(start)} — ${fmt(end)}`;
}

export function isRegistrationOpen(competition: LiveCompetition, now = new Date()): boolean {
  const opens = competition.registration_opens_at
    ? new Date(competition.registration_opens_at).getTime()
    : null;
  const closes = competition.registration_closes_at
    ? new Date(competition.registration_closes_at).getTime()
    : null;
  const t = now.getTime();
  if (opens && t < opens) return false;
  if (closes && t > closes) return false;
  return ["REGISTRATION_OPEN", "OPEN_FOR_ENTRIES", "ANNOUNCED"].includes(competition.status);
}

export function buildJourney(rounds: RoundRow[], currentRoundId: string | null) {
  const ordered = [...rounds].sort((a, b) => a.sequence - b.sequence);
  const currentIndex = ordered.findIndex((r) => r.id === currentRoundId);
  return ordered.map((round, index) => ({
    key: round.slug,
    label: round.name,
    state:
      currentIndex === -1
        ? index === 0
          ? ("CURRENT" as const)
          : ("UPCOMING" as const)
        : index < currentIndex
          ? ("DONE" as const)
          : index === currentIndex
            ? ("CURRENT" as const)
            : ("UPCOMING" as const),
  }));
}
