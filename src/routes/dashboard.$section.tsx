import { createFileRoute, notFound } from "@tanstack/react-router";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { APPLICATION_STATUS_LABELS } from "@/domain/competition";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";
import { describeVoting } from "@/domain/voting";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { getCompetitionBySlug, getMyApplication, listAnnouncements } from "@/lib/competition-data";

export const Route = createFileRoute("/dashboard/$section")({
  loader: ({ params }) => {
    const section = DASHBOARD_SECTIONS.find((s) => s.slug === params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.section.label} — Zik's Got Talent` : "Unavailable" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: loaderData?.section.summary ?? "Contestant dashboard",
      },
      { property: "og:title", content: loaderData?.section.label ?? "Zik's Got Talent" },
      {
        property: "og:description",
        content: loaderData?.section.summary ?? "Contestant dashboard",
      },
    ],
  }),
  component: DashboardSectionPage,
});

function DashboardSectionPage() {
  const { section } = Route.useLoaderData();
  const application = getMyApplication();
  const competition = getCompetitionBySlug("season-one");

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-3 text-4xl">{section.label}</h1>
        <p className="mt-2 text-muted-foreground">{section.summary}</p>
      </header>

      <div className="card-stage p-6">
        {section.slug === "application" && (
          <dl className="divide-y divide-border/60 text-sm">
            <Row label="Competition" value={application.competitionName} />
            <Row
              label="Category"
              value={`${application.groupName} · ${application.categoryName}`}
            />
            <Row label="Status" value={APPLICATION_STATUS_LABELS[application.status]} />
            <Row
              label="Submitted"
              value={
                application.submittedAt
                  ? new Date(application.submittedAt).toLocaleString("en-GB")
                  : "Not submitted"
              }
            />
          </dl>
        )}

        {section.slug === "audition" && (
          <ul className="divide-y divide-border/60 text-sm">
            {application.submissions.map((submission) => (
              <li key={submission.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="font-semibold">{submission.title}</span>
                  <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                    {submission.type}
                  </span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-success">
                  {submission.moderation}
                </span>
              </li>
            ))}
          </ul>
        )}

        {section.slug === "status" && <JourneyTracker steps={application.journey} />}

        {section.slug === "announcements" && (
          <ul className="divide-y divide-border/60">
            {listAnnouncements("CONTESTANTS").map((announcement) => (
              <li key={announcement.id} className="py-4">
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
              </li>
            ))}
          </ul>
        )}

        {section.slug === "voting" && competition && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Model:</span>{" "}
              {describeVoting(competition.voting)}
            </p>
            <p>
              <span className="font-semibold text-foreground">Vote limit:</span>{" "}
              {competition.voting.votesPerUserPerDay} per person per day, sign-in required, rate
              limited and fully audited.
            </p>
            <p>
              Voting opens at the Top 20 round. You&rsquo;ll be notified when your window opens.
            </p>
          </div>
        )}

        {section.slug === "profile" && (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{ARTISTRYSYNK.promise}</p>
            <a
              href={ARTISTRYSYNK.site}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-block font-bold text-primary hover:underline"
            >
              Open {ARTISTRYSYNK.brand}
            </a>
          </div>
        )}

        {section.slug === "notifications" && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {["In-app", "Email", "Push", "SMS", "WhatsApp"].map((channel) => (
              <li key={channel} className="flex items-center justify-between gap-4">
                <span>{channel}</span>
                <span className="text-xs uppercase tracking-widest">
                  {channel === "In-app" || channel === "Email"
                    ? "Planned for launch"
                    : "Later phase"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {section.slug === "rules" && competition && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {competition.rules.map((rule) => (
              <li key={rule} className="flex gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
