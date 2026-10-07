/**
 * The permanent ArtistrySynk talent profile and the public Talent Directory.
 *
 * Public reads go through security-definer routines (talent_directory,
 * talent_profile, talent_disciplines) that return safe columns only — never
 * email, phone, date of birth, submission answers, scores or notes.
 * Featured is NOT a verification status: it is derived from featured_until.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "UNVERIFIED" | "IDENTITY_VERIFIED" | "TALENT_VERIFIED";

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  IDENTITY_VERIFIED: "Identity verified",
  TALENT_VERIFIED: "Talent verified",
};

export interface TalentProfile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  primary_discipline: string;
  secondary_skills: string[];
  portfolio_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  verification_status: VerificationStatus;
  featured_until: string | null;
  is_featured: boolean;
  is_public: boolean;
}

export type TalentCard = Pick<
  TalentProfile,
  | "id"
  | "handle"
  | "display_name"
  | "avatar_url"
  | "bio"
  | "location"
  | "primary_discipline"
  | "secondary_skills"
  | "verification_status"
  | "featured_until"
  | "is_featured"
>;

export interface TalentCompetitionEntry {
  application_handle: string;
  competition_name: string;
  competition_slug: string;
  category_name: string | null;
  status: string;
  progress_state: string;
  round_name: string | null;
  participated_at: string | null;
}

export interface TalentAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  awarded_at: string;
  competition_name: string;
}

export interface TalentProfileDetail {
  profile: TalentProfile;
  competitions: TalentCompetitionEntry[];
  achievements: TalentAchievement[];
}

export interface DirectoryFilters {
  q?: string | undefined;
  discipline?: string | undefined;
  location?: string | undefined;
  verification?: VerificationStatus | undefined;
  featured?: boolean | undefined;
  page?: number | undefined;
}

export const DIRECTORY_PAGE_SIZE = 24;

/** True only while featured_until is in the future. */
export function isFeatured(featuredUntil: string | null, now = Date.now()): boolean {
  return Boolean(featuredUntil && new Date(featuredUntil).getTime() > now);
}

/* ------------------------------ avatars ------------------------------ */

/** Avatars uploaded here are stored as `avatars:<path>` in avatar_url. */
const AVATAR_PREFIX = "avatars:";

export async function resolveAvatarUrls(values: (string | null)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const paths = values.filter((v): v is string => !!v && v.startsWith(AVATAR_PREFIX));
  for (const v of values) if (v && !v.startsWith(AVATAR_PREFIX)) out.set(v, v);
  if (paths.length) {
    const { data } = await supabase.storage.from("avatars").createSignedUrls(
      paths.map((p) => p.slice(AVATAR_PREFIX.length)),
      60 * 60 * 24,
    );
    (data ?? []).forEach((row, i) => {
      const key = paths[i];
      if (key && row.signedUrl) out.set(key, row.signedUrl);
    });
  }
  return out;
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to upload a photo.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPG, PNG or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Photos must be 5 MB or smaller.");
  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  return `${AVATAR_PREFIX}${path}`;
}

/* ------------------------------ directory ------------------------------ */

export async function fetchTalentDirectory(
  filters: DirectoryFilters,
): Promise<{ rows: TalentCard[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const { data, error } = await supabase.rpc("talent_directory", {
    _q: filters.q ?? "",
    _discipline: filters.discipline ?? "",
    _location: filters.location ?? "",
    _verification: filters.verification ?? "",
    _featured: filters.featured ?? false,
    _limit: DIRECTORY_PAGE_SIZE,
    _offset: (page - 1) * DIRECTORY_PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (TalentCard & { total_count: number })[];
  const avatars = await resolveAvatarUrls(rows.map((r) => r.avatar_url));
  return {
    total: Number(rows[0]?.total_count ?? 0),
    rows: rows.map((r) => ({
      ...r,
      avatar_url: r.avatar_url ? (avatars.get(r.avatar_url) ?? null) : null,
      is_featured: isFeatured(r.featured_until),
    })),
  };
}

export const talentDirectoryQuery = (filters: DirectoryFilters) =>
  queryOptions({
    queryKey: ["talent-directory", filters],
    queryFn: () => fetchTalentDirectory(filters),
  });

export const talentDisciplinesQuery = () =>
  queryOptions({
    queryKey: ["talent-disciplines"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("talent_disciplines");
      if (error) throw error;
      return (data ?? []) as { name: string; talent_count: number }[];
    },
    staleTime: 5 * 60 * 1000,
  });

/* ------------------------------ profile ------------------------------ */

export async function fetchTalentProfile(handle: string): Promise<TalentProfileDetail | null> {
  const { data, error } = await supabase.rpc("talent_profile", { _handle: handle });
  if (error) throw error;
  if (!data) return null;
  const detail = data as unknown as TalentProfileDetail;
  const avatars = await resolveAvatarUrls([detail.profile.avatar_url]);
  return {
    ...detail,
    profile: {
      ...detail.profile,
      avatar_url: detail.profile.avatar_url
        ? (avatars.get(detail.profile.avatar_url) ?? null)
        : null,
      is_featured: isFeatured(detail.profile.featured_until),
    },
  };
}

export const talentProfileQuery = (handle: string) =>
  queryOptions({
    queryKey: ["talent-profile", handle.toLowerCase()],
    queryFn: () => fetchTalentProfile(handle),
  });

/* ------------------------------ editing ------------------------------ */

/** Fields a signed-in user may edit on their own profile. Trust fields are excluded. */
export interface TalentProfileInput {
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  primary_discipline: string;
  secondary_skills: string[];
  portfolio_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  is_public: boolean;
}

export function normalizeHandle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function normalizeUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function isHandleAvailable(handle: string, ownId: string): Promise<boolean> {
  const { data } = await supabase.rpc("talent_profile", { _handle: handle });
  const found = data as unknown as TalentProfileDetail | null;
  if (found && found.profile.id !== ownId) return false;
  return true;
}

export async function saveMyTalentProfile(input: TalentProfileInput): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to edit your profile.");
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: auth.user.id, ...input, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  if (error) {
    if (error.message.includes("profiles_handle_unique_idx")) {
      throw new Error("That handle is already taken. Try another.");
    }
    throw error;
  }
}
