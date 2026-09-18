import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { fetchPublicContestants } from "@/lib/live-data";

export const Route = createFileRoute("/contestants/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Contestants | ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        name: "description",
        content:
          "Meet the ArtistrySynk student creatives showcasing their talent in ARTISTRYSYNK CREATIVES TALENT HUNT 1.0.",
      },
      { property: "og:title", content: "Contestants | ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        property: "og:description",
        content: "Meet the creative talent stepping into the spotlight at ARTISTRYSYNK CREATIVES TALENT HUNT 1.0.",
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
        title="The talent is here"
        intro="Meet the ArtistrySynk student creatives sharing their gifts, telling their stories and competing for their opportunity."
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
            Contestant profiles will appear here after entries are reviewed and approved.
          </p>
        )}
      </section>
    </PublicShell>
  );
}
