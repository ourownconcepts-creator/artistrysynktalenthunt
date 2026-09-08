import { Link, createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { APPLICATION_STATUS_LABELS } from "@/domain/competition";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { getMyApplication, listAnnouncements } from "@/lib/competition-data";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "My dashboard — Zik's Got Talent" },
      {
        name: "description",
        content: "Track your Zik's Got Talent application, audition, stage and announcements.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My dashboard — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Track your Zik's Got Talent application and competition stage.",
      },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const application = getMyApplication();
  const announcements = listAnnouncements("CONTESTANTS").slice(0, 2);
  const currentStep = application.journey.find((step) => step.state === "CURRENT");

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{application.displayName}</h1>
        <p className="mt-3 text-muted-foreground">{application.competitionName}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Your talent" value={`${application.groupName} · ${application.categoryName}`} />
        <Stat label="Application" value={APPLICATION_STATUS_LABELS[application.status]} />
        <Stat label="Current stage" value={currentStep?.label ?? "—"} />
      </div>

      <section className="card-stage p-6">
        <h2 className="text-2xl">Competition journey</h2>
        <div className="mt-5">
          <JourneyTracker steps={application.journey} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {DASHBOARD_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            to="/dashboard/$section"
            params={{ section: section.slug }}
            className="card-stage card-stage-hover block p-5"
          >
            <h3 className="text-xl">{section.label}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{section.summary}</p>
          </Link>
        ))}
      </section>

      <section className="card-stage p-6">
        <h2 className="text-2xl">Announcements</h2>
        <ul className="mt-4 divide-y divide-border/60">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="py-4">
              <p className="font-semibold">{announcement.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-warning">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Private application data will be readable only by you, assigned judges and moderators once
        the database and sign-in are connected. Your permanent creative profile lives on{" "}
        {ARTISTRYSYNK.brand}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-stage p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-xl">{value}</p>
    </div>
  );
}
