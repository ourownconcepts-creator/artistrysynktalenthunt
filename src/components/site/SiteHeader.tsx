import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/competitions", label: "Competition" },
  { to: "/categories", label: "Categories" },
  { to: "/contestants", label: "Contestants" },
  { to: "/vote", label: "Vote" },
  { to: "/announcements", label: "News" },
  { to: "/sponsors", label: "Sponsors" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="Zik's Got Talent home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/register">Enter now</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-surface">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
                {[...NAV, { to: "/rules", label: "Rules" }, { to: "/auth", label: "Sign in" }].map(
                  (item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 font-display text-lg text-foreground transition-colors hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
