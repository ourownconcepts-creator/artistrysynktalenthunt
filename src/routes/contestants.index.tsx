import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { fetchPublicContestants } from "@/lib/live-data";

export const Route = createFileRoute("/contestants/")({
  head: () => ({
    meta: [
      { title: "Contestants — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Meet the creatives competing in Zik's Got Talent Season One across music, performance, visual and digital categories.",
      },
      { property: "og:title", content: "Contestants — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Meet the creatives competing in Zik's Got Talent Season One.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contestants,
});

function Contestants() {
  const contestants = useQuery({
    queryKey: ["public-contestants"],
    queryFn: () => fetchPublicContestants(),
  });

  return (
    <PublicShell>
      <PageHeader
        eyebrow="The talent"
        title="Contestants"
        intro="Public profiles only ever show approved media and public competition status — application details stay private."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        {contestants.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading contestants…</p>
        ) : contestants.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {contestants.data.map((contestant) => (
              <Link
                key={contestant.handle}
                to="/contestants/$handle"
                params={{ handle: contestant.handle }}
                className="card-stage card-stage-hover block p-6"
              >
                <span className="eyebrow">{contestant.group_name}</span>
                <h2 className="mt-3 text-2xl">{contestant.display_name}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {contestant.category_name}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{contestant.bio}</p>
                <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">
                  {contestant.location} · {contestant.stage} · {contestant.vote_count} votes
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contestants are public yet. Entries appear here once moderators approve them.
          </p>
        )}
      </section>
    </PublicShell>
  );
}
