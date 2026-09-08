import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { getFeaturedCompetition } from "@/lib/competition-data";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules & Eligibility — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Official Zik's Got Talent rules, eligibility criteria and consent requirements for Season One entrants.",
      },
      { property: "og:title", content: "Rules & Eligibility — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Official rules, eligibility criteria and consent requirements.",
      },
    ],
  }),
  component: Rules,
});

function Rules() {
  const competition = getFeaturedCompetition();

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.name}
        title="Rules & eligibility"
        intro="Rules, eligibility and consent requirements are configured per competition and versioned with your application."
      />
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <List title="Eligibility" items={competition.eligibility} />
        <List title="Rules" items={competition.rules} />
        <List title="Consent" items={competition.consentRequirements} />
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
      </ul>
    </article>
  );
}
