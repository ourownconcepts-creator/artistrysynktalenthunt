import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompetition, useRounds } from "@/hooks/useCompetition";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Zik's Got Talent" },
      {
        name: "description",
        content:
          "From entry to the final stage: how Zik's Got Talent works, round by round, and how judging and results are decided.",
      },
      { property: "og:title", content: "How It Works — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Your journey from free entry to the final stage, explained round by round.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    title: "Choose your talent",
    body: "Pick the category that fits you best. Every category lists exactly what it asks you to submit.",
  },
  { title: "Create or connect your identity", body: ARTISTRYSYNK.promise },
  {
    title: "Tell us about you",
    body: "Your name, where you're based, and how we reach you. It takes about ten minutes in total.",
  },
  {
    title: "Send your submission",
    body: "Provide whatever your category requires. Nothing becomes public until it has been reviewed.",
  },
  {
    title: "Review and consent",
    body: "Check everything, accept the rules, then submit. Entry is free.",
  },
  {
    title: "Follow your journey",
    body: "Your dashboard tracks your status, your stage and every announcement for your competition.",
  },
];

function HowItWorksPage() {
  const competition = useCompetition();
  const rounds = useRounds(competition.data?.id);

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.data?.name ?? "Zik's Got Talent"}
        title="How it works"
        intro="Six steps to get on stage, then a clear path through every round of the season."
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full border-border/70 bg-surface">
                <CardContent className="space-y-3 p-6">
                  <span className="font-display text-3xl text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-display text-xl uppercase tracking-wide">{step.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl uppercase tracking-wide">The rounds</h2>
        <ul className="mt-6 space-y-3">
          {(rounds.data ?? [])
            .filter((round) => round.is_active)
            .map((round) => (
              <li
                key={round.id}
                className="flex flex-col gap-1 rounded-xl border border-border/70 bg-surface p-5 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="font-display text-lg text-gold sm:w-16">
                  {String(round.sequence).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold">{round.name}</p>
                  <p className="text-sm text-muted-foreground">{round.description}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {round.judging_enabled ? "Judged" : "Not judged"}
                    {round.voting_enabled ? " · public voting" : ""}
                  </p>
                </div>
              </li>
            ))}
          {rounds.data?.length === 0 && (
            <li className="text-sm text-muted-foreground">Rounds have not been published yet.</li>
          )}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/register">Enter now</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/rules">Read the rules</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
