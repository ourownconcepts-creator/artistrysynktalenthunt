import { Link, createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { PublicShell } from "@/components/site/PublicShell";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Sign in to your Zik's Got Talent contestant dashboard, or connect your existing ArtistrySynk account.",
      },
      { property: "og:title", content: "Sign in — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Access your contestant dashboard or connect your ArtistrySynk account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <PublicShell>
      <section className="mx-auto flex w-full max-w-md flex-col px-4 py-20 sm:px-6">
        <Wordmark size="lg" className="self-center" />
        <div className="card-stage mt-10 p-7">
          <h1 className="text-3xl">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One account for the competition and your creative identity.
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full bg-gold text-primary-foreground hover:opacity-90" disabled>
              Sign in
            </Button>
          </form>

          <p className="mt-5 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-warning">
            <Info className="mt-0.5 size-4 shrink-0" />
            Authentication is not wired up yet — the backend is not connected. The sign-in strategy,
            role model and {ARTISTRYSYNK.brand} session exchange are already designed and documented.
          </p>

          <p className="mt-6 text-sm text-muted-foreground">
            No account yet?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register for Season One
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
