/**
 * Email server functions. Every send happens here, on the server, with the
 * recipient resolved from the database rather than from the browser. The
 * QueenSMTP key is never exposed to client code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface EmailSendSummary {
  sent: number;
  skipped: number;
  configured: boolean;
}

async function isAdmin(
  supabase: {
    rpc: (fn: "is_admin", args: { _user_id: string }) => Promise<{ data: unknown; error: unknown }>;
  },
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  return !error && data === true;
}

/** Sends the confirmation for the signed-in contestant's own latest entry. */
export const sendEntryEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailSendSummary> => {
    const { sendEmail, emailConfig } = await import("./email/queensmtp.server");
    const { entryConfirmationEmail, newEntryAdminEmail } = await import("./email/templates.server");

    const { data, error } = await context.supabase
      .from("applications")
      .select(
        "display_name, handle, email, phone, location, reference_code, categories(name), competitions(name)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { sent: 0, skipped: 1, configured: !!emailConfig().apiKey };

    const row = data as unknown as {
      display_name: string;
      handle: string;
      email: string;
      phone: string | null;
      location: string | null;
      categories: { name: string } | null;
      competitions: { name: string } | null;
    };

    const base = {
      displayName: row.display_name,
      competitionName: row.competitions?.name ?? "Zik's Got Talent",
      categoryName: row.categories?.name ?? "your category",
      handle: row.handle,
    };

    let sent = 0;
    let skipped = 0;

    const contestant = entryConfirmationEmail(base);
    const first = await sendEmail({ to: row.email, ...contestant });
    first.sent ? (sent += 1) : (skipped += 1);

    const admin = emailConfig().adminRecipient;
    if (admin) {
      const notice = newEntryAdminEmail({
        ...base,
        email: row.email,
        phone: row.phone ?? "",
        location: row.location ?? "",
      });
      const second = await sendEmail({ to: admin, ...notice, replyTo: row.email });
      second.sent ? (sent += 1) : (skipped += 1);
    }

    return { sent, skipped, configured: !!emailConfig().apiKey };
  });

/** Admin-only: emails one contestant about their current application status. */
export const sendApplicationStatusEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        status: z.string().min(2).max(40).optional(),
        note: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<EmailSendSummary> => {
    const { sendEmail, emailConfig } = await import("./email/queensmtp.server");
    const { applicationStatusEmail } = await import("./email/templates.server");

    if (!(await isAdmin(context.supabase as never, context.userId))) {
      throw new Error("Forbidden");
    }

    const { data: row, error } = await context.supabase
      .from("applications")
      .select("display_name, email, status, competitions(name), competition_rounds(name)")
      .eq("id", data.applicationId)
      .maybeSingle();

    if (error || !row) return { sent: 0, skipped: 1, configured: !!emailConfig().apiKey };

    const application = row as unknown as {
      display_name: string;
      email: string;
      status: string;
      competitions: { name: string } | null;
      competition_rounds: { name: string } | null;
    };

    const message = applicationStatusEmail({
      displayName: application.display_name,
      competitionName: application.competitions?.name ?? "Zik's Got Talent",
      status: data.status ?? application.status,
      roundName: application.competition_rounds?.name ?? null,
      note: data.note ?? null,
    });

    const result = await sendEmail({ to: application.email, ...message });
    return {
      sent: result.sent ? 1 : 0,
      skipped: result.sent ? 0 : 1,
      configured: !!emailConfig().apiKey,
    };
  });

/**
 * Admin-only: emails one announcement to the contestants of its competition.
 * One message per recipient — no shared recipient lists.
 */
export const sendAnnouncementEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ announcementId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<EmailSendSummary> => {
    const { sendEmail, emailConfig } = await import("./email/queensmtp.server");
    const { announcementEmail } = await import("./email/templates.server");

    if (!(await isAdmin(context.supabase as never, context.userId))) {
      throw new Error("Forbidden");
    }

    const { data: announcementRow, error } = await context.supabase
      .from("announcements")
      .select("title, body, competition_id, competitions(name)")
      .eq("id", data.announcementId)
      .maybeSingle();

    if (error || !announcementRow) {
      return { sent: 0, skipped: 0, configured: !!emailConfig().apiKey };
    }

    const announcement = announcementRow as unknown as {
      title: string;
      body: string;
      competition_id: string | null;
      competitions: { name: string } | null;
    };

    let query = context.supabase
      .from("applications")
      .select("email, status")
      .in("status", ["SUBMITTED", "UNDER_REVIEW", "APPROVED"]);
    if (announcement.competition_id) {
      query = query.eq("competition_id", announcement.competition_id);
    }

    const { data: rows } = await query;
    const recipients = Array.from(
      new Set(
        ((rows ?? []) as Array<{ email: string | null }>)
          .map((r) => (r.email ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );

    const message = announcementEmail({
      title: announcement.title,
      body: announcement.body,
      competitionName: announcement.competitions?.name ?? null,
    });

    let sent = 0;
    let skipped = 0;
    for (const to of recipients) {
      const result = await sendEmail({ to, ...message });
      result.sent ? (sent += 1) : (skipped += 1);
    }

    return { sent, skipped, configured: !!emailConfig().apiKey };
  });
