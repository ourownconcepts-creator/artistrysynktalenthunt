import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_SECTIONS } from "@/domain/navigation";
import { useSession } from "@/hooks/useSession";
import { ARTISTRYSYNK } from "@/config/brand";
import { fetchMyApplication } from "@/lib/live-data";

export const Route = createFileRoute("/dashboard/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "My dashboard — ArtistrySynk Creatives Talent Hunt" },
      {
        name: "description",
        content: "Track your ArtistrySynk Creatives Talent Hunt entry, audition, stage and announcements.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My dashboard — ArtistrySynk Creatives Talent Hunt" },
      {
        property: "og:description",
        content: "Track your ArtistrySynk Creatives Talent Hunt entry and competition stage.",
      },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user, ready } = useSession();
  const application = useQuery({
    queryKey: ["my-application", user?.id ?? "anon"],
    queryFn: fetchMyApplication,
    enabled: Boolean(user),
  });

  if (ready && !user) {
    return (
      <div className="card-stage p-8">
        <h1 className="text-3xl">Sign in to your dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your entry, audition and competition stage live here once you are signed in.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register">Enter the competition</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!ready || application.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your dashboard…</p>;
  }

  const app = application.data as
    | (Record<string, unknown> & {
        display_name: string;
        status: string;
        handle: string;
        categories: { name: string; category_groups: { name: string } | null } | null;
        competitions: { name: string; slug: string } | null;
        competition_rounds: { name: string } | null;
      })
    | null;

  if (!app) {
    return (
      <div className="card-stage p-8">
        <h1 className="text-3xl">No entry yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in, but you have not entered a competition yet.
        </p>
        <Button asChild className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
          <Link to="/register">Enter the competition</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{app.display_name}</h1>
        <p className="mt-3 text-muted-foreground">{app.competitions?.name}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Your talent"
          value={`${app.categories?.category_groups?.name ?? ""} · ${app.categories?.name ?? ""}`}
        />
        <Stat label="Entry status" value={app.status.replace("_", " ").toLowerCase()} />
        <Stat label="Current stage" value={app.competition_rounds?.name ?? "Registration"} />
      </div>

      <section className="card-stage p-6">
        <h2 className="text-2xl">Your public profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your public contestant page goes live once moderators approve your entry.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/contestants/$handle" params={{ handle: app.handle }}>
            View my contestant page
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {DASHBOARD_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            to="/dashboard/$section"
            params={{ section: section.slug }}
            className="card-stage card-stage-hover block p-5"
          >
            <h3 className="text-xl">{section.label}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{section.summary}</p>
          </Link>
        ))}
      </section>

      <p className="flex gap-2 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Your contact details, date of birth and judge comments are readable only by you, assigned
        judges and authorised staff. Your permanent creative profile lives on {ARTISTRYSYNK.brand}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-stage p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-xl capitalize">{value}</p>
    </div>
  );
}
