import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, LogOut, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { ADMIN_SECTIONS } from "@/domain/navigation";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

/** Sections that have their own live, database-backed page. */
const LIVE_ADMIN_PAGES = ["competitions", "lifecycle", "applications", "submissions", "judging", "voting"];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminGate,
});

function AdminGate() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
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

  if (!ready || (user && roles.isPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Checking your access…
        </p>
      </div>
    );
  }

  const isAdmin = Boolean(user) && (roles.data ?? []).some((r) => ADMIN_ROLES.includes(r));

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="card-stage w-full max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-4 text-2xl">Admin access only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {user
              ? "This account is not an administrator. Sign in with the Zik's Got Talent admin account to open the control centre."
              : "Sign in with the Zik's Got Talent admin account to open the control centre."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {user ? (
              <Button onClick={handleSignOut} disabled={signingOut}>
                <LogOut className="mr-1.5 size-4" aria-hidden />
                {signingOut ? "Signing out…" : "Sign out and switch account"}
              </Button>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/">Back to the site</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminLayout onSignOut={handleSignOut} signingOut={signingOut} email={user?.email ?? ""} />;
}

function AdminLayout({
  onSignOut,
  signingOut,
  email,
}: {
  onSignOut: () => void;
  signingOut: boolean;
  email: string;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Link to="/" aria-label="Zik's Got Talent home">
            <Wordmark size="sm" />
          </Link>
        </div>
        <nav className="p-3" aria-label="Admin">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="block rounded-md px-3 py-2 text-sm font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
          >
            Dashboard
          </Link>
          <ul className="mt-1 space-y-0.5">
            {ADMIN_SECTIONS.map((section) => (
              <li key={section.slug}>
                {LIVE_ADMIN_PAGES.includes(section.slug) ? (
                  <Link
                    to={`/admin/${section.slug}` as "/admin/competitions"}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
                  >
                    {section.label}
                  </Link>
                ) : (
                  <Link
                    to="/admin/$section"
                    params={{ section: section.slug }}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
                  >
                    {section.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface/60 px-4 sm:px-6">
          <span className="eyebrow">Control centre</span>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-warning">
              <Lock className="size-3" /> Admin only
            </span>
            <Button variant="outline" size="sm" onClick={onSignOut} disabled={signingOut}>
              <LogOut className="mr-1.5 size-4" aria-hidden />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
