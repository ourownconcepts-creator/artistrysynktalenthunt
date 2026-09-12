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
  component: AdminLayout,
});

function AdminLayout() {
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-warning">
            <Lock className="size-3" /> Server-enforced roles
          </span>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
