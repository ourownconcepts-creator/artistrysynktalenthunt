/**
 * Email bodies for ArtistrySynk Creatives Talent Hunt. Plain inline-styled HTML so every mail
 * client renders it, with a matching plain-text version for each message.
 */

const SITE_NAME = "ArtistrySynk Creatives Talent Hunt";

function siteUrl(): string {
  const raw = process.env["TALENT_SITE_URL"] ?? "https://artistrysynk.app/talent-hunt";
  return raw.replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((block) => `<p style="${P}">${escapeHtml(block.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

const P = "margin:0 0 16px;font-size:16px;line-height:1.6;color:#2c2a26;";
const MUTED = "margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a756c;";

function shell(options: {
  heading: string;
  kicker: string;
  content: string;
  cta?: { label: string; href: string };
}) {
  const cta = options.cta
    ? `<p style="margin:28px 0 0;"><a href="${options.cta.href}" style="display:inline-block;background:#0f0d0b;color:#f7d774;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px;font-size:15px;">${escapeHtml(options.cta.label)}</a></p>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(options.heading)}</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="background:#0f0d0b;border-radius:14px;padding:22px 26px;">
    <span style="display:block;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#f7d774;">${escapeHtml(options.kicker)}</span>
    <span style="display:block;margin-top:6px;font-size:24px;font-weight:800;color:#ffffff;">${SITE_NAME}</span>
  </div>
  <h1 style="margin:28px 0 18px;font-size:24px;line-height:1.3;color:#0f0d0b;">${escapeHtml(options.heading)}</h1>
  ${options.content}
  ${cta}
  <p style="${MUTED}">${SITE_NAME} · <a href="${siteUrl()}" style="color:#8a6d17;">${siteUrl().replace(/^https:\/\//, "")}</a></p>
</div>
</body></html>`;
}

export interface EntryEmailData {
  displayName: string;
  competitionName: string;
  categoryName: string;
  handle: string;
  referenceCode?: string | null;
}

export function entryConfirmationEmail(data: EntryEmailData) {
  const dashboard = `${siteUrl()}/dashboard`;
  const track = `${siteUrl()}/track`;
  const code = data.referenceCode ?? null;
  const codeBlock = code
    ? `<p style="${P}"><strong>Your entry code:</strong> <span style="font-family:monospace;font-size:18px;letter-spacing:1px;">${escapeHtml(code)}</span><br />Keep this. With your email address it lets you check your stage at ${track} without signing in.</p>`
    : "";
  const codeText = code
    ? `\n\nYour entry code: ${code}\nCheck your stage any time at ${track} using this code and your email address.`
    : "";
  return {
    subject: `Your ${data.competitionName} entry is in`,
    html: shell({
      kicker: "Entry received",
      heading: `You're in, ${data.displayName}`,
      content:
        paragraphs(
          `We've received your entry for ${data.competitionName} in the ${data.categoryName} category.\n\nOur team reviews every audition submission. You'll get an email as soon as your entry is reviewed and whenever you move to a new round.`,
        ) +
        codeBlock +
        `<p style="${P}"><strong>Your contestant page:</strong> ${siteUrl()}/contestants/${data.handle}</p>`,
      cta: { label: "Open your dashboard", href: dashboard },
    }),
    text: `You're in, ${data.displayName}.\n\nWe've received your entry for ${data.competitionName} in the ${data.categoryName} category. You'll get an email once it's reviewed and whenever you move to a new round.${codeText}\n\nYour dashboard: ${dashboard}\nYour contestant page: ${siteUrl()}/contestants/${data.handle}`,
  };
}

export function accountCreatedEmail(email: string) {
  const dashboard = `${siteUrl()}/dashboard`;
  const register = `${siteUrl()}/register`;
  return {
    subject: `Welcome to ${SITE_NAME} — your account is ready`,
    html: shell({
      kicker: "Account created",
      heading: "Welcome to the stage",
      content: paragraphs(
        `Your ${SITE_NAME} account has been created for ${email}.\n\nOne account covers everything: entering the competition, following your progress on your dashboard, and voting for your favourite acts.\n\nReady to perform? Register your audition for Season One from your dashboard.`,
      ),
      cta: { label: "Open your dashboard", href: dashboard },
    }),
    text: `Welcome to ${SITE_NAME}.\n\nYour account has been created for ${email}. One account covers entering the competition, your dashboard, and voting.\n\nDashboard: ${dashboard}\nEnter Season One: ${register}`,
  };
}

export function newEntryAdminEmail(
  data: EntryEmailData & { email: string; phone: string; location: string },
) {
  return {
    subject: `New entry: ${data.displayName} (${data.categoryName})`,
    html: shell({
      kicker: "Admin alert",
      heading: "A new entry was submitted",
      content: paragraphs(
        `${data.displayName} entered ${data.competitionName}.\n\nCategory: ${data.categoryName}\nEmail: ${data.email}\nPhone: ${data.phone || "not given"}\nLocation: ${data.location || "not given"}`,
      ),
      cta: { label: "Review entries", href: `${siteUrl()}/admin/applications` },
    }),
    text: `New entry for ${data.competitionName}.\n\nName: ${data.displayName}\nCategory: ${data.categoryName}\nEmail: ${data.email}\nPhone: ${data.phone || "not given"}\nLocation: ${data.location || "not given"}\n\nReview: ${siteUrl()}/admin/applications`,
  };
}

export interface StatusEmailData {
  displayName: string;
  competitionName: string;
  status: string;
  roundName: string | null;
  note: string | null;
}

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  APPROVED: {
    heading: "Your entry has been approved",
    body: "Congratulations — your audition passed review and you are officially in the competition.",
  },
  UNDER_REVIEW: {
    heading: "Your entry is under review",
    body: "Our team is watching your audition now. We'll let you know the outcome shortly.",
  },
  REJECTED: {
    heading: "An update on your entry",
    body: "After review, your entry has not been taken forward in this competition. Thank you for taking part — we hope to see you audition again.",
  },
  WITHDRAWN: {
    heading: "Your entry has been withdrawn",
    body: "Your entry has been withdrawn from the competition. If this wasn't you, please reply to this email.",
  },
  DISQUALIFIED: {
    heading: "An update on your entry",
    body: "Your entry has been disqualified from the competition. Reply to this email if you'd like to know more.",
  },
  ADVANCED: {
    heading: "You're through to the next round",
    body: "Congratulations — you've advanced. Check your dashboard for what happens next and any deadlines.",
  },
  ELIMINATED: {
    heading: "Your competition journey ends here",
    body: "You didn't advance to the next round this time. Thank you for the performance you gave us.",
  },
  HELD: {
    heading: "Your result is being held",
    body: "Your result for this round is on hold while the panel finishes its decisions. We'll email you as soon as it's confirmed.",
  },
  SHORTLISTED: {
    heading: "You've been shortlisted",
    body: "Great news — you're on the shortlist. Keep an eye on your dashboard for the next step.",
  },
  ROUND_ACTIVE: {
    heading: "You're live in this round",
    body: "You're now competing in the current round. Check your dashboard for what's required and by when.",
  },
  WINNER: {
    heading: "You won",
    body: "Congratulations — you've won the competition. Our team will be in touch about what happens next.",
  },
  PENDING_REVIEW: {
    heading: "Your audition is queued for review",
    body: "We've received your audition and it's waiting for our team to watch it.",
  },
  REVISION_REQUESTED: {
    heading: "Your audition needs a change",
    body: "Our team has asked for a revision to your audition. Please update it from your dashboard.",
  },
  CORRECTION_REQUESTED: {
    heading: "We need a correction to your entry",
    body: "Something in your entry needs fixing before we can review it. Please update it from your dashboard.",
  },
};

export function applicationStatusEmail(data: StatusEmailData) {
  const copy = STATUS_COPY[data.status] ?? {
    heading: "An update on your entry",
    body: `Your entry status is now ${data.status.toLowerCase().replace(/_/g, " ")}.`,
  };
  const round = data.roundName ? `\n\nCurrent round: ${data.roundName}` : "";
  const note = data.note ? `\n\n${data.note}` : "";
  const dashboard = `${siteUrl()}/dashboard`;

  return {
    subject: `${copy.heading} — ${data.competitionName}`,
    html: shell({
      kicker: data.competitionName,
      heading: copy.heading,
      content: paragraphs(`Hi ${data.displayName},\n\n${copy.body}${round}${note}`),
      cta: { label: "View your dashboard", href: dashboard },
    }),
    text: `Hi ${data.displayName},\n\n${copy.body}${round}${note}\n\nYour dashboard: ${dashboard}`,
  };
}

export function announcementEmail(data: {
  title: string;
  body: string;
  competitionName: string | null;
}) {
  return {
    subject: data.title,
    html: shell({
      kicker: data.competitionName ?? "Announcement",
      heading: data.title,
      content: paragraphs(data.body),
      cta: { label: "See all announcements", href: `${siteUrl()}/announcements` },
    }),
    text: `${data.title}\n\n${data.body}\n\nAll announcements: ${siteUrl()}/announcements`,
  };
}

/** Invitation to connect a permanent ArtistrySynk creative identity. */
export function artistrySynkInviteEmail(data: { displayName: string }) {
  const connect = `${siteUrl()}/dashboard/profile`;
  return {
    subject: "Connect your ArtistrySynk creative identity",
    html: shell({
      kicker: "Creative identity",
      heading: "Connect your creative identity",
      content: paragraphs(
        `Hi ${data.displayName},\n\nYour ${SITE_NAME} entry can carry your permanent ArtistrySynk creative profile — the same profile that follows your work beyond this competition.\n\nOpen your dashboard and press Connect. If you're new to ArtistrySynk we'll prepare your identity and you simply claim it there; you never type an ArtistrySynk password on ${SITE_NAME}. Connecting is optional and your entry is unaffected either way.`,
      ),
      cta: { label: "Connect my creative identity", href: connect },
    }),
    text: `Hi ${data.displayName},\n\nYour ${SITE_NAME} entry can carry your permanent ArtistrySynk creative profile. Open your dashboard and press Connect: ${connect}\n\nIf you're new to ArtistrySynk we prepare your identity and you claim it there. Connecting is optional — your entry is unaffected either way.`,
  };
}
