import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/70 stage-surface">
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 spotlight-glow"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{intro}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
