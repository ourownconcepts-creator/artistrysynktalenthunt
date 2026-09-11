import { supabase } from "@/integrations/supabase/client";

/**
 * Public entry tracking. The lookup needs both the entry reference code and the
 * email used on the entry, and the database returns stage information only —
 * never contact details, review notes or scores.
 */

export interface TrackedApplication {
  referenceCode: string;
  displayName: string;
  handle: string;
  competitionName: string;
  categoryName: string;
  roundName: string | null;
  status: string;
  progressState: string;
  submissionState: string;
  submittedAt: string | null;
  updatedAt: string;
}

export async function trackApplication(
  referenceCode: string,
  email: string,
): Promise<TrackedApplication | null> {
  const { data, error } = await supabase.rpc("track_application", {
    _reference_code: referenceCode,
    _email: email,
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    referenceCode: row.reference_code,
    displayName: row.display_name,
    handle: row.handle,
    competitionName: row.competition_name,
    categoryName: row.category_name,
    roundName: row.round_name,
    status: row.status,
    progressState: row.progress_state,
    submissionState: row.submission_state,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

/** Plain-language explanation of an entry stage, for people not in the system. */
export function stageExplanation(status: string, submissionState: string): string {
  const byStatus: Record<string, string> = {
    DRAFT: "Your entry has been started but not sent to us yet.",
    SUBMITTED: "Your entry has been received and is waiting for our team.",
    UNDER_REVIEW: "Our team is watching your audition right now.",
    APPROVED: "Your entry passed review — you are officially in the competition.",
    SHORTLISTED: "You are on the shortlist for this round.",
    ADVANCED: "You are through to the next round.",
    ELIMINATED: "You did not advance this time. Thank you for taking part.",
    REJECTED: "Your entry was not taken forward in this competition.",
    WITHDRAWN: "This entry has been withdrawn.",
    DISQUALIFIED: "This entry has been disqualified.",
    WINNER: "You won the competition.",
  };
  const bySubmission: Record<string, string> = {
    PENDING_REVIEW: "Your audition is queued for our team to watch.",
    REVISION_REQUESTED: "We have asked for a change to your audition.",
    CORRECTION_REQUESTED: "Something in your entry needs fixing before review.",
  };
  return (
    byStatus[status] ??
    bySubmission[submissionState] ??
    `Your entry is currently ${status.toLowerCase().replace(/_/g, " ")}.`
  );
}
