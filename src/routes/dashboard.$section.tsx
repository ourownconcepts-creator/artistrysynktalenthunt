import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { Button } from "@/components/ui/button";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";
import { useSession } from "@/hooks/useSession";
import {
  REQUIREMENT_KIND_LABELS,
  buildJourney,
  describeVotingModel,
  fetchAnnouncements,
  fetchMyApplication,
  fetchMyProfile,
  fetchRequirements,
  fetchRounds,
} from "@/lib/live-data";

export const Route = createFileRoute("/dashboard/$section")({
  staticData: { sitemap: false },
  loader: ({ params }) => {
    const section = DASHBOARD_SECTIONS.find((s) => s.slug === params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.section.label} — ArtistrySynk Creatives Talent Hunt` : "Unavailable" },
      { name: "robots", content: "noindex" },
      { name: "description", content: loaderData?.section.summary ?? "Contestant dashboard" },
      { property: "og:title", content: loaderData?.section.label ?? "ArtistrySynk Creatives Talent Hunt" },
      {
        property: "og:description",
        content: loaderData?.section.summary ?? "Contestant dashboard",
      },
    ],
  }),
  component: DashboardSectionPage,
});

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  DISQUALIFIED: "Disqualified",
};

function DashboardSectionPage() {
  const { section } = Route.useLoaderData();
  const { user, ready } = useSession();

  /** Everything here is the signed-in contestant's own live record. */
  const application = useQuery({
    queryKey: ["my-application", user?.id ?? "anon"],
    queryFn: fetchMyApplication,
    enabled: Boolean(user),
  });
  const app = application.data ?? null;
  const competition = app?.competitions ?? null;

  const rounds = useQuery({
    queryKey: ["rounds", competition?.id],
    queryFn: () => fetchRounds(competition!.id),
    enabled: Boolean(competition?.id),
  });
  const requirements = useQuery({
    queryKey: ["requirements", app?.category_id],
    queryFn: () => fetchRequirements(app!.category_id, true),
    enabled: Boolean(app?.category_id),
  });
  const announcements = useQuery({
    queryKey: ["my-announcements", competition?.id],
    queryFn: () =>
      fetchAnnouncements({ audience: "CONTESTANTS", competitionId: competition?.id ?? null }),
    enabled: Boolean(user),
  });
  const profile = useQuery({
    queryKey: ["my-profile", user?.id ?? "anon"],
    queryFn: fetchMyProfile,
    enabled: Boolean(user),
  });

  if (ready && !user) {
    return (
      <div className="card-stage p-8">
        <h1 className="text-3xl">{section.label}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to see your own entry, audition and competition stage.
        </p>
        <Button asChild className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!ready || application.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your dashboard…</p>;
  }

  const answers = app?.submission_answers ?? {};

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-3 text-4xl">{section.label}</h1>
        <p className="mt-2 text-muted-foreground">{section.summary}</p>
      </header>

      {!app && section.slug !== "profile" && section.slug !== "notifications" ? (
        <div className="card-stage p-6">
          <p className="text-sm text-muted-foreground">
            You have not entered a competition yet, so there is nothing to show here.
          </p>
          <Button asChild className="mt-5 bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/register">Enter the competition</Link>
          </Button>
        </div>
      ) : (
        <div className="card-stage p-6">
          {section.slug === "application" && app && (
            <dl className="divide-y divide-border/60 text-sm">
              <Row label="Competition" value={competition?.name ?? ""} />
              <Row
                label="Category"
                value={`${app.categories?.category_groups?.name ?? ""} · ${app.categories?.name ?? ""}`}
              />
              <Row label="Entry code" value={app.reference_code ?? "—"} />
              <Row label="Status" value={STATUS_LABELS[app.status] ?? app.status} />
              <Row label="Stage" value={app.competition_rounds?.name ?? "Registration"} />
              <Row label="Public profile" value={app.is_public ? "Visible" : "Hidden"} />
              <Row
                label="Submitted"
                value={
                  app.submitted_at
                    ? new Date(app.submitted_at).toLocaleString("en-GB")
                    : "Not submitted"
                }
              />
              <Row label="Contact email" value={app.email} />
              <Row label="Location" value={app.location} />
            </dl>
          )}

          {section.slug === "audition" && app && (
            <div className="space-y-5 text-sm">
              {(requirements.data ?? []).map((requirement) => (
                <div key={requirement.id}>
                  <p className="font-semibold">
                    {requirement.label}
                    <span className="ml-2 text-xs font-normal uppercase tracking-widest text-muted-foreground">
                      {REQUIREMENT_KIND_LABELS[requirement.kind]}
                    </span>
                  </p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {answers[requirement.key] || "Not provided"}
                  </p>
                </div>
              ))}
              {(requirements.data ?? []).length === 0 && (
                <div>
                  <p className="font-semibold">Audition link</p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {app.audition_url || "Not provided"}
                  </p>
                </div>
              )}
              {app.audition_notes && (
                <div>
                  <p className="font-semibold">Your notes for judges</p>
                  <p className="mt-1 text-muted-foreground">{app.audition_notes}</p>
                </div>
              )}
            </div>
          )}

          {section.slug === "status" && app && (
            <JourneyTracker steps={buildJourney(rounds.data ?? [], app.current_round_id)} />
          )}

          {section.slug === "announcements" && (
            <ul className="divide-y divide-border/60">
              {(announcements.data ?? []).map((announcement) => (
                <li key={announcement.id} className="py-4">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {announcement.body}
                  </p>
                </li>
              ))}
              {(announcements.data ?? []).length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">
                  No contestant announcements yet.
                </li>
              )}
            </ul>
          )}

          {section.slug === "voting" && competition && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Model:</span>{" "}
                {describeVotingModel(competition)}
              </p>
              <p>
                <span className="font-semibold text-foreground">Vote limit:</span>{" "}
                {competition.votes_per_user_per_day} per person per day, sign-in required, rate
                limited and fully audited.
              </p>
              <p>
                {(rounds.data ?? []).some((r) => r.voting_enabled)
                  ? `Public voting is enabled for: ${(rounds.data ?? [])
                      .filter((r) => r.voting_enabled)
                      .map((r) => r.name)
                      .join(", ")}.`
                  : "No round has public voting switched on yet."}
              </p>
            </div>
          )}

          {section.slug === "profile" && (
            <div className="space-y-3 text-sm text-muted-foreground">
              {profile.data && (
                <dl className="divide-y divide-border/60">
                  <Row label="Creative name" value={profile.data.display_name ?? ""} />
                  <Row label="Discipline" value={profile.data.primary_discipline ?? ""} />
                  <Row label="Location" value={profile.data.location ?? ""} />
                  <Row
                    label="Identity link"
                    value={profile.data.artistrysynk_identity_ref ? "Connected" : "Pending"}
                  />
                </dl>
              )}

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
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold break-all">{value || "—"}</dd>
    </div>
  );
}
