import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { ARTISTRYSYNK } from "@/config/brand";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "About ArtistrySynk Creatives Talent Hunt | ArtistrySynk" },
      {
        name: "description",
        content:
          "Meet ArtistrySynk Creatives Talent Hunt, the ArtistrySynk talent hunt organized by ArtistrySynk.",
      },
      { property: "og:title", content: "About ArtistrySynk Creatives Talent Hunt" },
      {
        property: "og:description",
        content: "A platform for creatives to discover, showcase and celebrate exceptional creative talent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Who we are"
        title="More than a competition"
        intro="ArtistrySynk Creatives Talent Hunt is an ArtistrySynk talent hunt organized by ArtistrySynk."
      />
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <article className="card-stage p-7">
          <h2 className="text-2xl">Where creatives meet opportunity</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The competition gives creatives a platform to express their creativity, showcase their
            abilities and compete in a healthy, inspiring environment. It celebrates talent across
            singing, dancing, comedy, spoken word, rap, acting, instrumentals, cultural performance,
            fashion and other creative disciplines.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Its purpose is to discover hidden talent, promote creativity, encourage healthy
            competition, empower young creatives and strengthen unity among creatives.
          </p>
        </article>
        <article className="card-stage p-7">
          <h2 className="text-2xl">From discovery to connection</h2>
          <p className="mt-3 text-sm text-muted-foreground">{ARTISTRYSYNK.ecosystem}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Through its partnership with ArtistrySynk, ArtistrySynk Creatives Talent Hunt extends the journey
            beyond the competition by connecting participating creatives to a wider creative network
            and opportunities.
          </p>
          <a
            href={ARTISTRYSYNK.site}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
          >
            {ARTISTRYSYNK.site.replace(/^https?:\/\//, "")}
          </a>
        </article>
      </section>
    </PublicShell>
  );
}
