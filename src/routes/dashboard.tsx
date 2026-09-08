import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { Wordmark } from "@/components/brand/Wordmark";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Zik's Got Talent home">
            <Wordmark size="sm" />
          </Link>
          <span className="eyebrow">Contestant dashboard</span>
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
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
