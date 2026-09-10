import { Link, createFileRoute } from "@tanstack/react-router";

import { StatusPill } from "@/components/competition/StatusPill";
import { ADMIN_SECTIONS } from "@/domain/navigation";
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "@/domain/roles";
import { getFeaturedCompetition, listSponsors } from "@/lib/competition-data";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Zik's Got Talent control centre" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Operational control centre for Zik's Got Talent competitions.",
      },
      { property: "og:title", content: "Admin — Zik's Got Talent" },
      { property: "og:description", content: "Operational control centre for competitions." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const competition = getFeaturedCompetition();
  const sponsors = listSponsors();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-2 text-3xl">{competition.name}</h1>
        </div>
        <StatusPill status={competition.status} />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Applications" value="0" note="Awaiting database" />
        <Metric
          label="Categories"
          value={String(competition.stats.categories)}
          note="Configurable"
        />
        <Metric label="Rounds" value={String(competition.rounds.length)} note="Configurable" />
        <Metric
          label="Active sponsors"
          value={String(sponsors.length)}
          note="ArtistrySynk × Chow"
        />
      </div>

      <section>
        <h2 className="text-2xl">Admin areas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              to="/admin/$section"
              params={{ section: section.slug }}
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
          These permissions are mirrored for the interface only. Every action is re-authorised on
          the server and by row-level policies once the backend is connected.
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
