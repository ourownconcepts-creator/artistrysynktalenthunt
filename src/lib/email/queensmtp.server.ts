/**
 * QueenSMTP email transport (server only).
 *
 * Contract (https://queensmtp.com/email-api):
 *   POST https://queensmtp.com/v1/send
 *   Authorization: Bearer <API key>
 *   { from, fromName, to, subject, html, text, replyTo, isBulk }
 *   -> { id, status, message }
 *
 * The API key never leaves the server. Nothing here is called from the browser.
 */

const SEND_ENDPOINT = "https://queensmtp.com/v1/send";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { sent: true; id: string | null }
  | {
      sent: false;
      reason: "not_configured" | "invalid_recipient" | "provider_error";
      message: string;
    };

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function emailConfig() {
  return {
    apiKey: env("QUEENSMTP_API_KEY"),
    from: env("TALENT_EMAIL_FROM") ?? "noreply@artistrysynk.app",
    fromName: env("TALENT_EMAIL_FROM_NAME") ?? "ArtistrySynk Creatives Talent Hunt",
    replyTo: env("TALENT_EMAIL_REPLY_TO"),
    adminRecipient: env("TALENT_ADMIN_EMAIL") ?? "admin@artistrysynk.app",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = emailConfig();
  if (!config.apiKey) {
    return {
      sent: false,
      reason: "not_configured",
      message: "Email sending is not configured yet.",
    };
  }
  const to = input.to.trim().toLowerCase();
  if (!EMAIL_RE.test(to)) {
    return {
      sent: false,
      reason: "invalid_recipient",
      message: "That email address is not valid.",
    };
  }

  try {
    const response = await fetch(SEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        fromName: config.fromName,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...((input.replyTo ?? config.replyTo) ? { replyTo: input.replyTo ?? config.replyTo } : {}),
        isBulk: false,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      id?: string;
      data?: { id?: string };
      error?: string;
      message?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
      console.error("[queensmtp] send failed", response.status, payload?.error ?? payload?.message);
      return {
        sent: false,
        reason: "provider_error",
        message: "The email service rejected the message.",
      };
    }

    return { sent: true, id: payload?.data?.id ?? payload?.id ?? null };
  } catch (error) {
    console.error("[queensmtp] transport error", error);
    return {
      sent: false,
      reason: "provider_error",
      message: "The email service is unavailable right now.",
    };
  }
}
