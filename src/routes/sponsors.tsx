import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCompetition, useSponsors } from "@/hooks/useCompetition";
import { SPONSOR_TIERS, SPONSOR_TIER_LABELS } from "@/lib/live-data";

export const Route = createFileRoute("/sponsors")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Sponsors & Partners | ArtistrySynk Creatives Talent Hunt" },
      {
        name: "description",
        content:
          "Meet the partners supporting talent discovery, youth development and creative opportunity through the ArtistrySynk Creatives Talent Hunt.",
      },
      { property: "og:title", content: "Sponsors & Partners | ArtistrySynk Creatives Talent Hunt" },
      {
        property: "og:description",
        content: "Partners supporting emerging creative talent and creativity with ArtistrySynk.",
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
  const featuredSupporter = (sponsors.data ?? []).find(
    (sponsor) => sponsor.name.toUpperCase() === "NEW FLAVA RESTAURANT",
  );
  const mainSponsor = (sponsors.data ?? []).find((sponsor) => sponsor.tier === "MAJOR_SPONSOR");
  const remainingSponsors = (sponsors.data ?? []).filter(
    (sponsor) => sponsor.id !== mainSponsor?.id && sponsor.id !== featuredSupporter?.id,
  );

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Building opportunity together"
        title="Partners in talent discovery"
        intro="Partnering with the ArtistrySynk Creatives Talent Hunt means backing emerging creatives and connecting with the ArtistrySynk community."
      />
      <section className="mx-auto w-full max-w-7xl space-y-12 px-4 py-16 sm:px-6">
        {sponsors.isLoading && <p className="text-sm text-muted-foreground">Loading sponsors…</p>}
        {(mainSponsor || featuredSupporter) && (
          <div className="grid gap-8 md:grid-cols-2 md:items-stretch">
            {mainSponsor && (
              <FeaturedSponsor sponsor={mainSponsor} label="Presented by" />
            )}
            {featuredSupporter && (
              <FeaturedSponsor sponsor={featuredSupporter} label="Proudly supported by" />
            )}
          </div>
        )}
        {SPONSOR_TIERS.map((tier) => {
          const tierSponsors = remainingSponsors.filter((sponsor) => sponsor.tier === tier);
          if (tierSponsors.length === 0) return null;
          return (
            <div key={tier}>
              <p className="eyebrow">{SPONSOR_TIER_LABELS[tier]}</p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {tierSponsors.map((sponsor) => (
                  <article
                    key={sponsor.id}
                    className="card-stage card-stage-hover p-7"
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
                    <h2 className="text-3xl font-bold">{sponsor.name}</h2>
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

function FeaturedSponsor({
  sponsor,
  label,
}: {
  sponsor: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string;
    website: string;
  };
  label: string;
}) {
  return (
    <article className="card-stage card-stage-hover flex h-full flex-col p-7">
      <p className="eyebrow mb-4">{label}</p>
      {sponsor.logo_url && (
        <div className="mb-6 flex min-h-52 flex-1 items-center justify-center overflow-hidden rounded-md bg-[var(--paper)] p-5 sm:min-h-64">
          <img
            src={sponsor.logo_url}
            alt={`${sponsor.name} logo`}
            className="max-h-52 w-full object-contain sm:max-h-60"
          />
        </div>
      )}
      <h2 className="text-3xl font-bold sm:text-4xl">{sponsor.name}</h2>
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
  );
}
