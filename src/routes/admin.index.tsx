import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { StatusPill } from "@/components/competition/StatusPill";
import { ADMIN_SECTIONS } from "@/domain/navigation";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "@/domain/roles";
import { useCategoryGroups, useCompetition, useRounds } from "@/hooks/useCompetition";
import { fetchPublicContestants, fetchSponsors, fetchAnnouncements, fetchAuditFeed } from "@/lib/live-data";
import { ROUND_STATUS_LABELS, fetchOpsSnapshot } from "@/lib/operations";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/admin/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Admin — ArtistrySynk Creatives Talent Hunt control centre" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Operational control centre for ArtistrySynk Creatives Talent Hunt competitions.",
      },
      { property: "og:title", content: "Admin — ArtistrySynk Creatives Talent Hunt" },
      { property: "og:description", content: "Operational control centre for competitions." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const competition = useCompetition();
  const rounds = useRounds(competition.data?.id);
  const groups = useCategoryGroups(competition.data?.id, false);
  const sponsors = useQuery({
    queryKey: ["sponsors", "all"],
    queryFn: () => fetchSponsors({ activeOnly: true }),
  });
  const contestants = useQuery({
    queryKey: ["public-contestants", competition.data?.slug],
    queryFn: () => fetchPublicContestants(competition.data?.slug),
    enabled: Boolean(competition.data?.slug),
  });

  const { user } = useSession();
  const ops = useQuery({
    queryKey: ["ops-snapshot", competition.data?.slug],
    queryFn: () => fetchOpsSnapshot(competition.data?.slug),
    enabled: Boolean(user) && Boolean(competition.data?.slug),
    retry: false,
  });
  const announcements = useQuery({
    queryKey: ["announcements", competition.data?.id, "admin"],
    queryFn: () => fetchAnnouncements({ competitionId: competition.data?.id ?? null }),
    enabled: Boolean(competition.data?.id),
  });
  const audit = useQuery({
    queryKey: ["audit", "recent"],
    queryFn: () => fetchAuditFeed({ limit: 8 }),
    enabled: Boolean(user),
    retry: false,
  });
  const snapshot = ops.data?.ok ? ops.data : null;
  const progress = snapshot?.round_progress ?? {};

  const categoryCount = (groups.data ?? []).reduce((sum, g) => sum + g.categories.length, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-2 text-3xl">{competition.data?.name ?? "No competition yet"}</h1>
        </div>
        {competition.data && <StatusPill status={competition.data.status} />}
      </header>

      {ops.isError && (
        <p className="card-stage p-6 text-sm text-warning">
          Sign in with a staff account to see live operational figures.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Registrations"
          value={String(snapshot?.registrations ?? 0)}
          note="Entries received"
        />
        <Metric
          label="Applications pending"
          value={String(snapshot?.applications_pending ?? 0)}
          note="Awaiting a decision"
        />
        <Metric
          label="Auditions pending"
          value={String(snapshot?.submissions_pending ?? 0)}
          note="Awaiting moderation"
        />
        <Metric
          label="Current round"
          value={snapshot?.current_round?.name ?? "None"}
          note={
            snapshot?.current_round
              ? (ROUND_STATUS_LABELS[snapshot.current_round.status] ??
                snapshot.current_round.status)
              : "No round active"
          }
        />
        <Metric
          label="Judging progress"
          value={`${progress.judging_complete ?? 0}/${progress.contestants_in_round ?? 0}`}
          note={`${progress.judging_pending ?? 0} pending · ${progress.assigned_judges ?? 0} judges`}
        />
        <Metric
          label="Voting"
          value={snapshot?.voting_live ? "Open" : "Closed"}
          note={`${snapshot?.votes_valid ?? 0} valid · ${snapshot?.votes_voided ?? 0} voided`}
        />
        <Metric
          label="Pending decisions"
          value={String(progress.unresolved ?? 0)}
          note={`${progress.advanced ?? 0} advanced · ${progress.eliminated ?? 0} eliminated`}
        />
        <Metric
          label="Public contestants"
          value={String(contestants.data?.length ?? 0)}
          note={`${categoryCount} categories · ${sponsors.data?.length ?? 0} sponsors`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">Recent announcements</h2>
          <ul className="mt-4 space-y-2">
            {(announcements.data ?? []).slice(0, 5).map((item) => (
              <li key={item.id} className="card-stage p-4">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {item.audience.toLowerCase()} ·{" "}
                  {item.is_published ? "published" : "scheduled"} ·{" "}
                  {new Date(item.published_at).toLocaleDateString()}
                </p>
              </li>
            ))}
            {(announcements.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">No announcements yet.</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl">Recent audit events</h2>
          <ul className="mt-4 space-y-2">
            {(audit.data ?? []).slice(0, 8).map((row) => (
              <li key={row.id} className="card-stage p-4 text-sm">
                <p className="font-semibold">{row.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.actor_email ?? "system"} · {new Date(row.created_at).toLocaleString()}
                </p>
              </li>
            ))}
            {(audit.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">
                No audit events visible to your account.
              </li>
            )}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-2xl">Admin areas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              to={`/admin/${section.slug}` as "/admin/lifecycle"}
              className="card-stage card-stage-hover block p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{section.label}</h3>
                <span
                  className={
                    section.phase === "PHASE_1"
                      ? "rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-success"
                      : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  }
                >
                  {section.phase === "PHASE_1" ? "Live" : "Later"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{section.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Role model</h2>
        <div className="card-stage mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Granted permissions</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role} className="border-b border-border/40 last:border-0 align-top">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold">{ROLE_LABELS[role]}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {ROLE_PERMISSIONS[role].length === 0
                      ? "Read-only public access"
                      : ROLE_PERMISSIONS[role].join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          This table mirrors permissions for the interface only. Every action is re-authorised on
          the server and by row-level policies.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card-stage p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
