import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompetition, useRounds } from "@/hooks/useCompetition";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How ZIK’S GOT TALENT Works | University of Ibadan" },
      {
        name: "description",
        content:
          "Follow the ZIK’S GOT TALENT 1.0 journey from creative identity and registration to showcasing, competing and stepping into opportunity.",
      },
      { property: "og:title", content: "How ZIK’S GOT TALENT Works" },
      {
        property: "og:description",
        content: "Create your identity, choose your category, register, showcase your talent and step into your opportunity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    title: "Create your creative identity",
    body: "Build or connect the creative identity that supports your journey beyond the competition.",
  },
  { title: "Choose your talent category", body: "Select the category that best represents your gift." },
  {
    title: "Register for ZIK’S GOT TALENT",
    body: "Share your details and complete your entry for the current competition.",
  },
  {
    title: "Audition and showcase",
    body: "Submit the material requested for your category and put your talent forward for review.",
  },
  {
    title: "Compete",
    body: "Take your place in a healthy, inspiring competition alongside talented UI students.",
  },
  {
    title: "Step into your opportunity",
    body: "Gain exposure, recognition and creative connections as your competition journey develops.",
  },
];

function HowItWorksPage() {
  const competition = useCompetition();
  const rounds = useRounds(competition.data?.id);

  return (
    <PublicShell>
      <PageHeader
        eyebrow="ZIK’S GOT TALENT 1.0"
        title="Your stage starts here"
        intro="Six clear steps take you from creative identity to the opportunity to be seen, heard and celebrated."
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
