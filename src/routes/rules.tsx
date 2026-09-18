import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCompetition } from "@/hooks/useCompetition";

export const Route = createFileRoute("/rules")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Rules & Eligibility | ARTISTRYSYNK CREATIVES TALENT HUNT" },
      {
        name: "description",
        content:
          "Read the official rules, eligibility and consent requirements for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 entrants with ArtistrySynk.",
      },
      { property: "og:title", content: "Rules & Eligibility | ARTISTRYSYNK CREATIVES TALENT HUNT" },
      {
        property: "og:description",
        content: "Official rules, eligibility criteria and consent requirements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Rules,
});

function Rules() {
  const competition = useCompetition();

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.data?.name ?? "Competition"}
        title="Rules & eligibility"
        intro="Review the official participation requirements before submitting your ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 entry."
      />
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <p className="lg:col-span-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Draft wording. The final legal text has not been supplied yet.
        </p>
        <List title="Eligibility" items={competition.data?.eligibility ?? []} />
        <List title="Rules" items={competition.data?.rules ?? []} />
        <List title="Consent" items={competition.data?.consent_requirements ?? []} />
      </section>
    </PublicShell>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="card-stage p-6">
      <h2 className="text-2xl">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {item}
          </li>
        ))}
        {items.length === 0 && <li>Not configured yet.</li>}
      </ul>
    </article>
  );
}
