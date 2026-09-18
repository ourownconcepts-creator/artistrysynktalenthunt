/**
 * ARTISTRYSYNK CREATIVES TALENT HUNT — competition domain types.
 *
 * These describe ArtistrySynk Creatives Talent Hunt's OWN entities. Contestant identity is NOT
 * modelled here: applications reference an ArtistrySynk identity through an
 * opaque `identityRef` (see src/integrations/artistrysynk).
 */

export type CompetitionStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "IN_PROGRESS"
  | "VOTING_OPEN"
  | "COMPLETED"
  | "ARCHIVED";

export type ApplicationStatus =
  "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "DISQUALIFIED";

export type SubmissionType = "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT" | "LINK";
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VotingModel = "JUDGES_ONLY" | "PUBLIC_ONLY" | "HYBRID";

export type SponsorTier = "MAJOR_SPONSOR" | "SUPPORTING_SPONSOR" | "PARTNER" | "MEDIA_PARTNER";
export type SponsorPlacement = "HERO" | "HEADER" | "FOOTER" | "SIDEBAR" | "SPONSOR_PAGE";

export type NotificationEvent =
  | "APPLICATION_RECEIVED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "AUDITION_DEADLINE"
  | "ADVANCED_TO_NEXT_ROUND"
  | "VOTING_OPEN"
  | "VOTING_CLOSED"
  | "FINALIST_SELECTED"
  | "WINNER_ANNOUNCED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS" | "WHATSAPP";

export interface CategoryGroup {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  categories: TalentCategory[];
}

export interface TalentCategory {
  id: string;
  groupId: string;
  slug: string;
  name: string;
  blurb: string;
  sortOrder: number;
  isActive: boolean;
  /** Admin-configurable: what a contestant must upload for this category. */
  auditionHint: string;
}

export interface CompetitionRound {
  id: string;
  competitionId: string;
  slug: string;
  name: string;
  sequence: number;
  description: string;
  opensAt: string | null;
  closesAt: string | null;
  /** Configurable advancement rule, e.g. "TOP_N:50" or "MANUAL". */
  advancementRule: string;
  isActive: boolean;
}

export interface ScoringCriterion {
  id: string;
  competitionId: string;
  name: string;
  maxScore: number;
  weight: number;
  sortOrder: number;
  isActive: boolean;
}

export interface VotingConfig {
  model: VotingModel;
  judgeWeight: number;
  publicWeight: number;
  opensAt: string | null;
  closesAt: string | null;
  votesPerUserPerDay: number;
  requiresAuthentication: boolean;
  rateLimitPerMinute: number;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  coverImageAlt: string;
  status: CompetitionStatus;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  eligibility: string[];
  rules: string[];
  consentRequirements: string[];
  rounds: CompetitionRound[];
  categoryGroupIds: string[];
  scoringCriteria: ScoringCriterion[];
  voting: VotingConfig;
  stats: {
    entries: number;
    categories: number;
    cities: number;
    prizePool: string;
  };
}

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  description: string;
  website: string;
  logoUrl: string | null;
  placements: SponsorPlacement[];
  sortOrder: number;
  isActive: boolean;
}

export interface Announcement {
  id: string;
  competitionId: string;
  title: string;
  body: string;
  publishedAt: string;
  isPinned: boolean;
  audience: "PUBLIC" | "CONTESTANTS" | "JUDGES";
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
}

/** Public-safe contestant projection. Never includes application internals. */
export interface PublicContestant {
  handle: string;
  displayName: string;
  categoryName: string;
  groupName: string;
  location: string;
  bio: string;
  stage: string;
  badges: string[];
  photoAlt: string;
}

export interface ApplicationJourneyStep {
  key: string;
  label: string;
  state: "DONE" | "CURRENT" | "UPCOMING";
}

/** Private contestant view — only ever returned to the owning contestant. */
export interface ContestantApplication {
  id: string;
  competitionId: string;
  competitionName: string;
  identityRef: string;
  handle: string;
  displayName: string;
  categoryName: string;
  groupName: string;
  status: ApplicationStatus;
  currentRoundSlug: string;
  submittedAt: string | null;
  journey: ApplicationJourneyStep[];
  submissions: Array<{
    id: string;
    type: SubmissionType;
    title: string;
    moderation: ModerationStatus;
    createdAt: string;
  }>;
}
