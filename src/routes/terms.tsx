import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Entry — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Terms of entry for Zik's Got Talent competitions, covering ownership, media licensing, conduct and disqualification.",
      },
      { property: "og:title", content: "Terms of Entry — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Terms of entry covering ownership, media licensing and conduct.",
      },
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
          Draft summary only. Final terms must be supplied by Zik&rsquo;s Got Talent&rsquo;s legal
          counsel before entries open publicly.
        </p>
        <Section title="Ownership of work">
          Contestants retain ownership of everything they submit. By entering, contestants grant
          Zik&rsquo;s Got Talent a licence to feature approved media in competition and promotional
          contexts.
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
