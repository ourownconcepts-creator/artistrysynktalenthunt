import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { fetchJudgeDashboard } from "@/lib/operations";
import { fetchJudgeQueue } from "@/lib/live-data";
import { ScoringPanel } from "@/components/admin/ScoringPanel";

export const Route = createFileRoute("/judge")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Judge dashboard — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Your judging assignment for Zik's Got Talent: contestants assigned to you, scored, pending and your scoring deadline.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Judge dashboard — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Assigned contestants, scoring progress and deadlines for judges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JudgeDashboardPage,
});

function formatWhen(value: string | null | undefined): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function JudgeDashboardPage() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const isJudge = (roles.data ?? []).includes("JUDGE");

  const board = useQuery({
    queryKey: ["judge-dashboard"],
    queryFn: () => fetchJudgeDashboard(),
    enabled: Boolean(user),
  });

  const queue = useQuery({
    queryKey: ["judge-queue"],
    queryFn: () => fetchJudgeQueue(),
    enabled: Boolean(user) && Boolean(board.data?.assigned),
  });

  if (!ready) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-4xl">Judge dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with your judging account to see the contestants assigned to you.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const data = board.data;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 sm:p-10">
      <header>
        <p className="eyebrow">Judging</p>
        <h1 className="mt-3 text-4xl">Judge dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You only ever see the contestants assigned to you. Other judges' scores are never shown
          here.
        </p>
      </header>

      {board.isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline size-4 animate-spin" /> Loading your assignment…
        </p>
      )}

      {data && !data.ok && (
        <p className="card-stage p-6 text-sm text-warning">
          No competition is configured yet, so there is nothing to judge.
        </p>
      )}

      {data?.ok && !data.assigned && (
        <p className="card-stage p-6 text-sm text-warning">
          {isJudge
            ? `You are not assigned to ${data.competition_name ?? "this competition"} yet. An administrator has to assign you.`
            : "Your account does not have a judging assignment."}
        </p>
      )}

      {data?.ok && data.assigned && (
        <>
          <section className="card-stage p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl">{data.competition_name}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {data.round_name} · {data.round_status?.replace(/_/g, " ").toLowerCase()}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {(data.scopes ?? []).map((s) => s.category).join(" · ") || "All categories"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-primary">{data.completion_pct ?? 0}%</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">complete</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Stat label="Contestants assigned" value={data.assigned_count ?? 0} />
              <Stat label="Scored" value={data.scored_count ?? 0} />
              <Stat label="Pending" value={data.pending_count ?? 0} />
            </div>

            <dl className="mt-6 grid gap-3 border-t border-border/50 pt-5 text-sm sm:grid-cols-3">
              <Detail
                icon
                label="Judging opens"
                value={formatWhen(data.judging_opens_at)}
              />
              <Detail icon label="Judging closes" value={formatWhen(data.judging_closes_at)} />
              <Detail icon label="Score deadline" value={formatWhen(data.score_deadline_at)} />
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Scores submitted after the deadline are refused by the server. If you need a
              correction after a round decision, an administrator has to record it with a reason.
            </p>

            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ClipboardCheck className="size-4" aria-hidden /> Score your contestants below
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl">Your assigned contestants</h2>
            {queue.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : queue.data?.length ? (
              <ul className="space-y-2">
                {queue.data.map((row) => {
                  const done =
                    (data.criteria_count ?? 0) > 0 &&
                    row.my_scored_criteria >= (data.criteria_count ?? 0);
                  return (
                    <li
                      key={row.application_id}
                      className="card-stage flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <p className="font-semibold">{row.display_name}</p>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          {row.category_name} · {row.round_name}
                        </p>
                      </div>
                      <span
                        className={
                          done
                            ? "rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-success"
                            : "rounded-full bg-warning/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-warning"
                        }
                      >
                        {done
                          ? "Scored"
                          : `${row.my_scored_criteria} of ${data.criteria_count ?? 0} scored`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing is waiting for you in this round.
              </p>
            )}
          </section>

          <ScoringPanel isAdmin={false} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/50 p-4">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string; icon?: boolean | undefined }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="size-3.5" /> {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
