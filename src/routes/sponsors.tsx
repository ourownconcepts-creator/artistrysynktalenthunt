import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import type { Sponsor } from "@/domain/types";
import { listSponsors } from "@/lib/competition-data";

const TIER_LABELS: Record<Sponsor["tier"], string> = {
  MAJOR_SPONSOR: "Major sponsor",
  SUPPORTING_SPONSOR: "Supporting sponsor",
  PARTNER: "Partner",
  MEDIA_PARTNER: "Media partner",
};

const TIER_ORDER: Sponsor["tier"][] = [
  "MAJOR_SPONSOR",
  "SUPPORTING_SPONSOR",
  "PARTNER",
  "MEDIA_PARTNER",
];

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors & Partners — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Zik's Got Talent Season One is powered by ArtistrySynk × Chow, with supporting sponsors, partners and media partners.",
      },
      { property: "og:title", content: "Sponsors & Partners — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Season One is powered by ArtistrySynk × Chow.",
      },
    ],
  }),
  component: Sponsors,
});

function Sponsors() {
  const sponsors = listSponsors("SPONSOR_PAGE");

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Powered by"
        title="Sponsors & partners"
        intro="Sponsor tiers, logos, descriptions, links and placement are all admin-configurable — no code change is needed to add a sponsor."
      />
      <section className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-6">
        {TIER_ORDER.map((tier) => {
          const tierSponsors = sponsors.filter((s) => s.tier === tier);
          if (tierSponsors.length === 0) return null;
          return (
            <div key={tier}>
              <p className="eyebrow">{TIER_LABELS[tier]}</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {tierSponsors.map((sponsor) => (
                  <article key={sponsor.id} className="card-stage card-stage-hover p-7">
                    <h2 className="text-3xl">{sponsor.name}</h2>
                    <p className="mt-3 text-sm text-muted-foreground">{sponsor.description}</p>
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                    >
                      Visit website <ExternalLink className="size-3.5" />
                    </a>
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
