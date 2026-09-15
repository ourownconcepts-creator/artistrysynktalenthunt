import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PublicShell } from "@/components/site/PublicShell";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { sendAccountCreatedEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | ZIK’S GOT TALENT" },
      {
        name: "description",
        content:
          "Sign in to your ZIK’S GOT TALENT contestant account to manage your entry, follow your progress or vote.",
      },
      { property: "og:title", content: "Sign in | ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "Access your contestant dashboard, vote, or create your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Administrators only ever land in the control centre; everyone else in the
  // contestant dashboard. Wait for the roles read so we never bounce twice.
  useEffect(() => {
    if (!ready || !user || roles.isPending) return;
    const isAdmin = (roles.data ?? []).some((r) => r === "SUPER_ADMIN" || r === "ADMIN");
    void navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
  }, [ready, user, roles.isPending, roles.data, navigate]);

  // An expired or already-used confirmation / reset link returns here with the
  // reason in the URL fragment. Explain it instead of showing a bare form.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fragment = window.location.hash.replace(/^#/, "");
    if (!fragment) return;
    const params = new URLSearchParams(fragment);
    const code = params.get("error_code");
    if (!code) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setMode("signup");
    toast.error(
      code === "otp_expired"
        ? "That confirmation link has expired or was already used. Enter your email and password again to get a fresh one."
        : (params.get("error_description") ?? "That link could not be used.").replace(/\+/g, " "),
    );
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        // Branded account-created confirmation via QueenSMTP. Best-effort:
        // it must never block or fail the signup itself.
        void sendAccountCreatedEmail({ data: { email } }).catch(() => {});
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
  }

  return (
    <PublicShell>
      <section className="mx-auto flex w-full max-w-md flex-col px-4 py-20 sm:px-6">
        <Wordmark size="lg" className="self-center" />
        <div className="card-stage mt-10 p-7">
          <h1 className="text-3xl">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One account for the competition, your dashboard and voting.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={google}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gold text-primary-foreground hover:opacity-90"
              disabled={busy}
            >
              {busy && <Loader2 className="mr-1 size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-5 text-sm font-semibold text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account instead" : "I already have an account"}
          </button>

          <p className="mt-6 text-sm text-muted-foreground">
            Entering the competition?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register for ZIK&rsquo;S GOT TALENT 1.0
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
