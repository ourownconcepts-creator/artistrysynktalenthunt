import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About ZIK’S GOT TALENT | University of Ibadan" },
      {
        name: "description",
        content:
          "Meet ZIK’S GOT TALENT, the University of Ibadan campus-wide talent competition organized by Zik Hall Royals with the Zik Hall Executive Council.",
      },
      { property: "og:title", content: "About ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "A platform for University of Ibadan students to discover, showcase and celebrate exceptional creative talent.",
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
        intro="ZIK’S GOT TALENT is a University of Ibadan campus-wide talent competition organized by Zik Hall Royals in collaboration with the Zik Hall Executive Council."
      />
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <article className="card-stage p-7">
          <h2 className="text-2xl">Where talent meets opportunity</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The competition gives students a platform to express their creativity, showcase their
            abilities and compete in a healthy, inspiring environment. It celebrates talent across
            singing, dancing, comedy, spoken word, rap, acting, instrumentals, cultural performance,
            fashion and other creative disciplines.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Its purpose is to discover hidden talent, promote creativity, encourage healthy
            competition, empower young creatives and strengthen unity among students.
          </p>
        </article>
        <article className="card-stage p-7">
          <h2 className="text-2xl">From discovery to connection</h2>
          <p className="mt-3 text-sm text-muted-foreground">{ARTISTRYSYNK.ecosystem}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Through its partnership with ArtistrySynk, ZIK&rsquo;S GOT TALENT extends the journey
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
