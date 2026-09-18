import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompetition } from "@/hooks/useCompetition";
import { fetchCategories } from "@/lib/live-data";
import { stageExplanation, trackApplication, type TrackedApplication } from "@/lib/tracking";

export const Route = createFileRoute("/track")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Track Your Entry | ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        name: "description",
        content:
          "Track your ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 entry and follow your progress in the University of Ibadan campus-wide talent competition.",
      },
      { property: "og:title", content: "Track Your Entry | ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        property: "og:description",
        content:
          "Use your entry code to follow your ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; entry: TrackedApplication }
  | { kind: "missing" }
  | { kind: "error" };

const STEPS = [
  { title: "Pick your category", body: "Find the category that fits your talent." },
  { title: "Send your entry", body: "Create your free entrant account and submit your audition." },
  { title: "Track your stage", body: "Use your entry code here any time — no sign-in needed." },
];

function TrackPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const competition = useCompetition();
  const categories = useQuery({
    queryKey: ["portal-categories", competition.data?.id ?? null],
    queryFn: () =>
      fetchCategories({ competitionId: competition.data?.id ?? null, activeOnly: true }),
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState({ kind: "loading" });
    try {
      const entry = await trackApplication(code, email);
      setState(entry ? { kind: "found", entry } : { kind: "missing" });
    } catch {
      setState({ kind: "error" });
    }
  }

  return (
    <PublicShell>
      <div className="paper-surface">
        <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
          <div className="paper-mast px-6 py-7 sm:px-8">
            <p className="eyebrow text-primary">Contestant portal</p>
            <h1 className="mt-3 text-4xl sm:text-5xl">Follow your competition journey</h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Enter ARTISTRYSYNK CREATIVES TALENT HUNT 1.0, showcase your ability and check your progress with the
              code from your confirmation email.
            </p>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="paper-card p-5">
                <span className="paper-pill inline-flex size-8 items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <h2 className="mt-3 text-lg">{step.title}</h2>
                <p className="mt-2 text-sm paper-dim">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild className="bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/register">Enter the competition</Link>
            </Button>
            <p className="text-sm paper-dim">
              Entering takes a free entrant account, so only you can change your audition.
            </p>
          </div>

          {(categories.data ?? []).length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl">Talent categories</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(categories.data ?? []).map((category) => (
                  <Link
                    key={category.id}
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    className="paper-card p-4 transition-colors hover:border-primary"
                  >
                    <p className="font-semibold">{category.name}</p>
                    {category.blurb && <p className="mt-1 text-sm paper-dim">{category.blurb}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12">
            <h2 className="text-2xl">Track your entry</h2>
            <p className="mt-2 text-sm paper-dim">
              Enter your code and the email you used. No account needed.
            </p>

            <form onSubmit={onSubmit} className="paper-card mt-5 grid gap-5 p-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="code">Entry code</Label>
                <Input
                  id="code"
                  className="paper-field"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ZGT-XXXXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email you entered with</Label>
                <Input
                  id="email"
                  className="paper-field"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={state.kind === "loading"}
                  className="bg-gold text-primary-foreground hover:opacity-90"
                >
                  {state.kind === "loading" ? "Checking…" : "Check my entry"}
                </Button>
              </div>
            </form>
          </div>

          {state.kind === "missing" && (
            <p className="mt-6 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm paper-accent">
              We could not find an entry with that code and email. Check both against your
              confirmation email, or sign in to see everything on your dashboard.
            </p>
          )}

          {state.kind === "error" && (
            <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Something went wrong looking that up. Please try again in a moment.
            </p>
          )}

          {state.kind === "found" && (
            <article className="paper-card mt-8 p-6">
              <p className="eyebrow paper-accent">{state.entry.competitionName}</p>
              <h2 className="mt-3 text-3xl">{state.entry.displayName}</h2>
              <p className="mt-2 text-sm paper-dim">
                {state.entry.categoryName}
                {state.entry.roundName ? ` · ${state.entry.roundName}` : ""}
              </p>

              <p className="mt-6 text-base">
                {stageExplanation(state.entry.status, state.entry.submissionState)}
              </p>

              <dl className="mt-6 grid gap-4 border-t border-primary/20 pt-6 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide paper-dim">Entry code</dt>
                  <dd className="mt-1 font-semibold">{state.entry.referenceCode}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide paper-dim">Entered</dt>
                  <dd className="mt-1 font-semibold">
                    {state.entry.submittedAt
                      ? new Date(state.entry.submittedAt).toLocaleDateString()
                      : "Not sent yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide paper-dim">Last update</dt>
                  <dd className="mt-1 font-semibold">
                    {new Date(state.entry.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/dashboard">Sign in for full details</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/contestants/$handle" params={{ handle: state.entry.handle }}>
                    View contestant page
                  </Link>
                </Button>
              </div>
            </article>
          )}

          <p className="mt-10 text-sm paper-dim">
            We email you at every stage change, from the same address as your entry alerts.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
