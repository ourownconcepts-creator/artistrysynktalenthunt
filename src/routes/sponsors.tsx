import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCompetition, useSponsors } from "@/hooks/useCompetition";
import { SPONSOR_TIERS, SPONSOR_TIER_LABELS } from "@/lib/live-data";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors & Partners | ZIK’S GOT TALENT" },
      {
        name: "description",
        content:
          "Meet the partners supporting talent discovery, youth development and creative opportunity through ZIK’S GOT TALENT at the University of Ibadan.",
      },
      { property: "og:title", content: "Sponsors & Partners | ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "Partners supporting emerging student talent and creativity at the University of Ibadan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sponsors,
});

function Sponsors() {
  const competition = useCompetition();
  const sponsors = useSponsors("SPONSOR_PAGE", competition.data?.id);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Building opportunity together"
        title="Partners in talent discovery"
        intro="Partnering with ZIK’S GOT TALENT means supporting emerging student talent while connecting with a vibrant University of Ibadan community."
      />
      <section className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-6">
        {sponsors.isLoading && <p className="text-sm text-muted-foreground">Loading sponsors…</p>}
        {SPONSOR_TIERS.map((tier) => {
          const tierSponsors = (sponsors.data ?? []).filter((s) => s.tier === tier);
          if (tierSponsors.length === 0) return null;
          return (
            <div key={tier}>
              <p className="eyebrow">{SPONSOR_TIER_LABELS[tier]}</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {tierSponsors.map((sponsor) => (
                  <article
                    key={sponsor.id}
                    className={`card-stage card-stage-hover p-7 ${
                      tier === "MAJOR_SPONSOR" ? "md:col-span-2" : ""
                    }`}
                  >
                    {sponsor.logo_url && (
                      <div className="mb-6 flex min-h-44 items-center justify-center overflow-hidden rounded-md bg-[var(--paper)] p-5 sm:min-h-52">
                        <img
                          src={sponsor.logo_url}
                          alt={`${sponsor.name} logo`}
                          className="max-h-40 w-full object-contain sm:max-h-48"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h2 className="text-3xl">{sponsor.name}</h2>
                    {sponsor.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{sponsor.description}</p>
                    )}
                    {sponsor.website && (
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                      >
                        Visit website <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </PublicShell>
  );
}
