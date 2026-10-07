import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { StatusPill } from "@/components/competition/StatusPill";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { fetchPublicCompetitions, formatDateRange } from "@/lib/live-data";

export const Route = createFileRoute("/competitions/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ArtistrySynk Talent Hunt Competition" },
      {
        name: "description",
        content:
          "Explore ArtistrySynk Creatives Talent Hunt 1.0, the ArtistrySynk talent hunt where talent meets opportunity.",
      },
      { property: "og:title", content: "ArtistrySynk Creatives Talent Hunt 1.0 Competition" },
      {
        property: "og:description",
        content: "Discover the competition journey, categories and entry information for ArtistrySynk Creatives Talent Hunt 1.0.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Competitions,
});

function Competitions() {
  const competitions = useQuery({
    queryKey: ["public-competitions"],
    queryFn: fetchPublicCompetitions,
  });

  return (
    <PublicShell>
      <PageHeader
        eyebrow="ArtistrySynk competition directory"
        title="Discover. Showcase. Celebrate."
        intro="Explore the ArtistrySynk Creatives Talent Hunt created to discover and celebrate exceptional creative talent."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        {competitions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading competitions…</p>
        ) : competitions.data?.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {competitions.data.map((competition) => (
              <article key={competition.id} className="card-stage card-stage-hover p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={competition.status} />
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">{competition.domain} · {competition.type.replaceAll("_", " ")}</span>
                  {competition.is_featured && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Current season
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {formatDateRange(competition.starts_at, competition.ends_at)}
                  </span>
                </div>
                <h2 className="mt-5 text-3xl">{competition.name}</h2>
                <p className="mt-2 text-sm font-semibold text-primary">{competition.tagline}</p>
                <p className="mt-4 text-sm text-muted-foreground">{competition.description}</p>
                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-5 text-sm">
                  <div>
                    <dt className="eyebrow">Cities</dt>
                    <dd className="mt-1 font-display text-2xl">{competition.cities}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Prize pool</dt>
                    <dd className="mt-1 font-display text-2xl">
                      {competition.prize_pool || "TBC"}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Entries close</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {competition.registration_closes_at
                        ? new Date(competition.registration_closes_at).toLocaleDateString("en-GB")
                        : "TBC"}
                    </dd>
                  </div>
                </dl>
                <Button asChild className="mt-7 bg-gold text-primary-foreground hover:opacity-90">
                  <Link to="/competitions/$slug" params={{ slug: competition.slug }}>
                    View competition
                    <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No competitions are published yet.</p>
        )}
      </section>
    </PublicShell>
  );
}
