import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stageExplanation, trackApplication, type TrackedApplication } from "@/lib/tracking";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Entry — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Check where your Zik's Got Talent entry stands. Enter your entry code and the email you used to see your current stage.",
      },
      { property: "og:title", content: "Track Your Entry — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Look up your entry code to see your current stage in the competition.",
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

function TrackPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

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
      <PageHeader
        eyebrow="Your entry"
        title="Track your entry"
        intro="Enter the entry code from your confirmation email, along with the email address you used. No account needed."
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <form onSubmit={onSubmit} className="card-stage grid gap-5 p-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="code">Entry code</Label>
            <Input
              id="code"
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

        {state.kind === "missing" && (
          <p className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
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
          <article className="card-stage mt-8 p-6">
            <p className="eyebrow">{state.entry.competitionName}</p>
            <h2 className="mt-3 text-3xl">{state.entry.displayName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.entry.categoryName}
              {state.entry.roundName ? ` · ${state.entry.roundName}` : ""}
            </p>

            <p className="mt-6 text-base">
              {stageExplanation(state.entry.status, state.entry.submissionState)}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-border/70 pt-6 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Entry code</dt>
                <dd className="mt-1 font-semibold">{state.entry.referenceCode}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Entered</dt>
                <dd className="mt-1 font-semibold">
                  {state.entry.submittedAt
                    ? new Date(state.entry.submittedAt).toLocaleDateString()
                    : "Not sent yet"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Last update
                </dt>
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

        <p className="mt-10 text-sm text-muted-foreground">
          We also email you at every stage change. Haven’t entered yet?{" "}
          <Link to="/register" className="font-semibold text-primary">
            Enter the competition
          </Link>
          .
        </p>
      </section>
    </PublicShell>
  );
}
