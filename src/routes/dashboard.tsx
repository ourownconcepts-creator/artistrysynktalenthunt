import { useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardGate,
});

/**
 * The contestant dashboard is for contestants and the public only.
 * Administrators work exclusively in the control centre.
 */
function DashboardGate() {
  const { user, ready } = useSession();
  const roles = useMyRoles();

  if (!ready || (user && roles.isPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading your dashboard…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="card-stage w-full max-w-md p-8 text-center">
          <h1 className="text-2xl">Sign in to continue</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your dashboard shows your entry, its progress and your account details.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = (roles.data ?? []).some((r) => r === "SUPER_ADMIN" || r === "ADMIN");

  if (isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="card-stage w-full max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-4 text-2xl">Administrators use the control centre</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account runs the competition, so it does not have a contestant dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild>
              <Link to="/admin">Open the control centre</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to the site</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardLayout />;
}

function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Zik's Got Talent home">
            <Wordmark size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="eyebrow hidden sm:inline">Contestant dashboard</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6">
        <nav className="hidden w-56 shrink-0 lg:block" aria-label="Dashboard">
          <ul className="sticky top-24 space-y-1">
            <li>
              <Link
                to="/dashboard"
                activeOptions={{ exact: true }}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-primary/15 text-primary" }}
              >
                Overview
              </Link>
            </li>
            {DASHBOARD_SECTIONS.map((section) => (
              <li key={section.slug}>
                <Link
                  to="/dashboard/$section"
                  params={{ section: section.slug }}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "bg-primary/15 text-primary" }}
                >
                  {section.label}
                </Link>
              </li>
            ))}
            <li className="pt-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </li>
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
