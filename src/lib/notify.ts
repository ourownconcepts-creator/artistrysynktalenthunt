import { sendApplicationStatusEmail } from "@/lib/email.functions";

/**
 * Emails a contestant about a decision on their entry.
 * A mail failure must never undo or block a recorded decision.
 */
export async function notifyContestant(applicationId: string, status: string, note = "") {
  try {
    await sendApplicationStatusEmail({
      data: { applicationId, status, ...(note.trim() ? { note: note.trim() } : {}) },
    });
  } catch {
    /* the decision is recorded; the email can be resent */
  }
}
