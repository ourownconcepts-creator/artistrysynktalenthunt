import { createFileRoute, notFound } from "@tanstack/react-router";

import { StatusPill } from "@/components/competition/StatusPill";
import { ADMIN_SECTIONS } from "@/domain/navigation";
import { describeVoting } from "@/domain/voting";
import { getFeaturedCompetition, listAnnouncements, listBadges, listCategoryGroups, listSponsors } from "@/lib/competition-data";

export const Route = createFileRoute("/admin/$section")({
  loader: ({ params }) => {
    const section = ADMIN_SECTIONS.find((s) => s.slug === params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.section.label} — Admin` : "Unavailable" },
      { name: "robots", content: "noindex" },
      { name: "description", content: loaderData?.section.summary ?? "Admin" },
      { property: "og:title", content: loaderData?.section.label ?? "Admin" },
      { property: "og:description", content: loaderData?.section.summary ?? "Admin" },
    ],
  }),
  component: AdminSectionPage,
});

function AdminSectionPage() {
  const { section } = Route.useLoaderData();
  const competition = getFeaturedCompetition();

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Admin · requires {section.permission}</p>
        <h1 className="mt-2 text-3xl">{section.label}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{section.summary}</p>
      </header>

      {section.slug === "competitions" && (
        <Panel>
          <Table
            head={["Name", "Slug", "Status", "Registration closes"]}
            rows={[
              [
                competition.name,
                competition.slug,
                <StatusPill key="s" status={competition.status} />,
                new Date(competition.registrationClosesAt).toLocaleDateString("en-GB"),
              ],
            ]}
          />
        </Panel>
      )}

      {section.slug === "categories" && (
        <Panel>
          <Table
            head={["Group", "Category", "Audition brief", "Active"]}
            rows={listCategoryGroups().flatMap((group) =>
              group.categories.map((category) => [
                group.name,
                category.name,
                category.auditionHint,
                category.isActive ? "Yes" : "No",
              ]),
            )}
          />
        </Panel>
      )}

      {section.slug === "rounds" && (
        <Panel>
          <Table
            head={["#", "Round", "Advancement rule", "Description"]}
            rows={competition.rounds.map((round) => [
              String(round.sequence),
              round.name,
              round.advancementRule,
              round.description,
            ])}
          />
        </Panel>
      )}

      {section.slug === "scoring" && (
        <Panel>
          <Table
            head={["Criterion", "Max", "Weight"]}
            rows={competition.scoringCriteria.map((criterion) => [
              criterion.name,
              String(criterion.maxScore),
              `${criterion.weight}%`,
            ])}
          />
        </Panel>
      )}

      {section.slug === "voting" && (
        <Panel>
          <Table
            head={["Setting", "Value"]}
            rows={[
              ["Model", describeVoting(competition.voting)],
              ["Authentication required", competition.voting.requiresAuthentication ? "Yes" : "No"],
              ["Votes per person per day", String(competition.voting.votesPerUserPerDay)],
              ["Rate limit", `${competition.voting.rateLimitPerMinute} attempts / minute`],
              ["Window", "Opens at the Top 20 round"],
              ["Audit trail", "Every vote and rejection recorded"],
            ]}
          />
        </Panel>
      )}

      {section.slug === "sponsors" && (
        <Panel>
          <Table
            head={["Sponsor", "Tier", "Placement", "Active"]}
            rows={listSponsors().map((sponsor) => [
              sponsor.name,
              sponsor.tier.replace("_", " ").toLowerCase(),
              sponsor.placements.join(", ").toLowerCase(),
              sponsor.isActive ? "Yes" : "No",
            ])}
          />
        </Panel>
      )}

      {section.slug === "announcements" && (
        <Panel>
          <Table
            head={["Title", "Audience", "Published", "Pinned"]}
            rows={listAnnouncements("CONTESTANTS").map((announcement) => [
              announcement.title,
              announcement.audience.toLowerCase(),
              new Date(announcement.publishedAt).toLocaleDateString("en-GB"),
              announcement.isPinned ? "Yes" : "No",
            ])}
          />
        </Panel>
      )}

      {section.slug === "badges" && (
        <Panel>
          <Table
            head={["Badge", "Slug", "Description"]}
            rows={listBadges().map((badge) => [badge.name, badge.slug, badge.description])}
          />
        </Panel>
      )}

      {section.phase === "LATER" && (
        <Panel>
          <p className="text-sm text-muted-foreground">
            This area is intentionally not built yet. The data model, permissions and audit
            requirements for it are already defined, so it can be implemented without reshaping the
            foundation.
          </p>
        </Panel>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="card-stage overflow-x-auto p-5">{children}</div>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <table className="w-full min-w-[36rem] text-sm">
      <thead>
        <tr className="border-b border-border/60 text-left">
          {head.map((cell) => (
            <th key={cell} className="px-3 py-2.5 font-semibold">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-border/40 last:border-0 align-top">
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={cellIndex === 0 ? "px-3 py-2.5 font-semibold" : "px-3 py-2.5 text-muted-foreground"}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
