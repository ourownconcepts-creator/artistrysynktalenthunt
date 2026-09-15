import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ExternalLink, Link2 } from "lucide-react";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { StatusPill } from "@/components/competition/StatusPill";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { getArtistrySynkConnection } from "@/lib/artistrysynk.functions";
import { buildJourney, fetchMyApplication, fetchRounds } from "@/lib/live-data";
import { PROGRESS_STATE_LABELS } from "@/lib/operations";

/**
 * The ArtistrySynk portal: the page a connected creative lands on from their
 * ArtistrySynk profile. It shows only their own competition record — the
 * competition data stays here, on Zik's Got Talent, and nothing is written
 * back into ArtistrySynk.
 */
export const Route = createFileRoute("/artistrysynk")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Creative Connection | ZIK’S GOT TALENT" },
      {
        name: "description",
        content:
          "Connected ArtistrySynk creatives can follow their ZIK’S GOT TALENT entry and competition progress in one place.",
      },
      { property: "og:title", content: "Creative Connection | ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "ZIK’S GOT TALENT discovers the talent. ArtistrySynk connects the talent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtistrySynkPortalPage,
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

function ArtistrySynkPortalPage() {
  const { user, ready } = useSession();

  const connection = useQuery({
    queryKey: ["artistrysynk-connection", Boolean(user)],
    queryFn: () => getArtistrySynkConnection(),
    enabled: Boolean(user),
    retry: false,
  });

  // The competition team changes stages in the admin panel; this portal keeps
  // itself current so a contestant sees the change without a manual reload.
  const application = useQuery({
    queryKey: ["my-application", user?.id ?? "anon"],
    queryFn: fetchMyApplication,
    enabled: Boolean(user),
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const app = application.data ?? null;
  const competition = app?.competitions ?? null;

  const rounds = useQuery({
    queryKey: ["rounds", competition?.id],
    queryFn: () => fetchRounds(competition!.id),
    enabled: Boolean(competition?.id),
  });

  const identity = connection.data?.identity ?? null;
  const connected = connection.data?.status === "CONNECTED";

  return (
    <PublicShell>
      <PageHeader
        eyebrow={`${ARTISTRYSYNK.brand} portal`}
        title="From talent to opportunity"
        intro={`ZIK’S GOT TALENT discovers the talent. ${ARTISTRYSYNK.brand} connects the talent to a wider creative community.`}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
        {!ready || (user && (connection.isLoading || application.isLoading)) ? (
          <p className="text-sm text-muted-foreground">Loading your competition portal…</p>
        ) : !user ? (
          <div className="card-stage p-8">
            <h2 className="text-2xl">Sign in to see your entry</h2>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              Your entry and stage progress are private to you. Sign in with the account you used to
              enter, and this page opens straight onto your record.
            </p>
            <Button asChild className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <article className="card-stage p-6">
                <h2 className="flex items-center gap-2 text-2xl">
                  {connected ? (
                    <BadgeCheck className="size-5 text-success" />
                  ) : (
                    <Link2 className="size-5 text-primary" />
                  )}
                  {connected ? "Connected creative" : "Not connected yet"}
                </h2>
                {connected && identity ? (
                  <div className="mt-4 flex items-center gap-3">
                    {identity.avatarUrl ? (
                      <img
                        src={identity.avatarUrl}
                        alt={`${identity.displayName ?? "Creative"} on ${ARTISTRYSYNK.brand}`}
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="size-12 rounded-full bg-muted" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {identity.displayName ?? identity.username ?? "Creative profile"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {identity.username ? `@${identity.username}` : "Verified identity"}
                        {identity.location ? ` · ${identity.location}` : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 max-w-prose text-sm text-muted-foreground">
                    Connect your {ARTISTRYSYNK.brand} profile from your dashboard and this portal
                    links the two together. Your entry is unaffected either way.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link to="/dashboard/$section" params={{ section: "profile" }}>
                      {connected ? "Manage connection" : `Connect ${ARTISTRYSYNK.brand}`}
                    </Link>
                  </Button>
                  {connection.data?.profileUrl && (
                    <Button asChild variant="ghost">
                      <a
                        href={connection.data.profileUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open my {ARTISTRYSYNK.brand} profile{" "}
                        <ExternalLink className="ml-1 size-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </article>

              <article className="card-stage p-6">
                <h2 className="text-2xl">Your entry</h2>
                {app ? (
                  <dl className="mt-4 divide-y divide-border/60 text-sm">
                    <Row label="Act" value={app.display_name} />
                    <Row label="Competition" value={competition?.name ?? ""} />
                    <Row
                      label="Category"
                      value={[app.categories?.category_groups?.name, app.categories?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                    <Row label="Entry code" value={app.reference_code ?? "—"} />
                    <Row label="Status" value={STATUS_LABELS[app.status] ?? app.status} />
                    <Row
                      label="Progress"
                      value={PROGRESS_STATE_LABELS[app.progress_state] ?? app.progress_state}
                    />
                    <Row
                      label="Current stage"
                      value={app.competition_rounds?.name ?? "Registration"}
                    />
                    <Row
                      label="Submitted"
                      value={
                        app.submitted_at
                          ? new Date(app.submitted_at).toLocaleString("en-GB")
                          : "Not submitted"
                      }
                    />
                    <Row
                      label="Last decision"
                      value={
                        app.updated_at ? new Date(app.updated_at).toLocaleString("en-GB") : "—"
                      }
                    />
                    {(app.state_reason || app.review_reason) && (
                      <Row
                        label="Note from the team"
                        value={app.state_reason || app.review_reason || ""}
                      />
                    )}
                  </dl>
                ) : (
                  <>
                    <p className="mt-3 max-w-prose text-sm text-muted-foreground">
                      You have not entered a competition yet. Entry is free and takes about ten
                      minutes.
                    </p>
                    <Button
                      asChild
                      className="mt-5 bg-gold text-primary-foreground hover:opacity-90"
                    >
                      <Link to="/register">Enter the competition</Link>
                    </Button>
                  </>
                )}
              </article>
            </div>

            <aside className="space-y-6">
              <article className="card-stage p-6">
                <h2 className="text-xl">Round progress</h2>
                {app ? (
                  <>
                    <div className="mt-3">
                      <StatusPill status={app.status} />
                    </div>
                    <div className="mt-5">
                      {rounds.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading stages…</p>
                      ) : (
                        <JourneyTracker
                          steps={buildJourney(rounds.data ?? [], app.current_round_id)}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Your stages appear here once you have entered.
                  </p>
                )}
              </article>

              <article className="card-stage p-6 text-sm text-muted-foreground">
                <h2 className="text-xl text-foreground">More detail</h2>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      to="/dashboard/$section"
                      params={{ section: "status" }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Full stage history
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/$section"
                      params={{ section: "audition" }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Your audition material
                    </Link>
                  </li>
                  <li>
                    <Link to="/track" className="font-semibold text-primary hover:underline">
                      Track an entry without signing in
                    </Link>
                  </li>
                </ul>
              </article>
            </aside>
          </div>
        )}
      </section>
    </PublicShell>
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
