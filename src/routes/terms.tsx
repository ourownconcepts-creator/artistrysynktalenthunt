import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Terms of Entry | ARTISTRYSYNK CREATIVES TALENT HUNT" },
      {
        name: "description",
        content:
          "Terms of entry for ARTISTRYSYNK CREATIVES TALENT HUNT, covering ownership, media licensing, conduct and disqualification.",
      },
      { property: "og:title", content: "Terms of Entry | ARTISTRYSYNK CREATIVES TALENT HUNT" },
      {
        property: "og:description",
        content: "Terms of entry covering ownership, media licensing and conduct.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Legal"
        title="Terms of entry"
        intro="These headline terms will be replaced by your final legal copy before launch — the placeholders below are clearly marked."
      />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-16 text-sm text-muted-foreground sm:px-6">
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-warning">
          Draft summary only. Final terms must be supplied by ARTISTRYSYNK CREATIVES TALENT HUNT&rsquo;s legal
          counsel before entries open publicly.
        </p>
        <Section title="Ownership of work">
          Contestants retain ownership of everything they submit. By entering, contestants grant
          ARTISTRYSYNK CREATIVES TALENT HUNT a licence to feature approved media in competition and promotional
          contexts.
        </Section>
        <Section title="Audition links">
          Auditions are submitted as links to video hosted elsewhere. Contestants are responsible for
          keeping that link reachable for judges and for the sharing permissions set on the hosting
          site; access and privacy of the video itself are governed by that provider, not by
          ARTISTRYSYNK CREATIVES TALENT HUNT.
        </Section>
        <Section title="Conduct and integrity">
          Vote manipulation, plagiarism, impersonation and abuse result in disqualification.
          Integrity reviews are logged and auditable.
        </Section>
        <Section title="Data and identity">
          Registration creates or connects an ArtistrySynk creative identity. Private application
          data is never shown publicly and is accessible only to the contestant, assigned judges and
          authorised staff.
        </Section>
      </section>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl text-foreground">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
