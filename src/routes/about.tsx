import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Zik's Got Talent is a national multi-category talent discovery platform, and part of the ArtistrySynk creative ecosystem.",
      },
      { property: "og:title", content: "About — Zik's Got Talent" },
      {
        property: "og:description",
        content: "A national talent discovery platform in the ArtistrySynk ecosystem.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Who we are"
        title="A stage built for discovery"
        intro="Zik's Got Talent exists to find talent that would otherwise go unseen — across music, performance, visual craft and digital work."
      />
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <article className="card-stage p-7">
          <h2 className="text-2xl">The competition</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Each season runs through configurable rounds, from registration and review to auditions,
            shortlists, semi-finals and a final. Judging uses weighted criteria, and public voting
            opens in the later rounds under strict limits and auditing.
          </p>
        </article>
        <article className="card-stage p-7">
          <h2 className="text-2xl">The ecosystem</h2>
          <p className="mt-3 text-sm text-muted-foreground">{ARTISTRYSYNK.ecosystem}</p>
          <p className="mt-3 text-sm text-muted-foreground">{ARTISTRYSYNK.promise}</p>
          <a
            href={ARTISTRYSYNK.site}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
          >
            artistrysynk.app
          </a>
        </article>
      </section>
    </PublicShell>
  );
}
