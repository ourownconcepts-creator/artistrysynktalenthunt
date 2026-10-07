import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { fetchPublicContestants } from "@/lib/live-data";

export const Route = createFileRoute("/talent/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Talent Directory | ArtistrySynk" },
      {
        name: "description",
        content:
          "Discover verified and competition-proven talent across ArtistrySynk — musicians, producers, performers and more.",
      },
      { property: "og:title", content: "Talent Directory | ArtistrySynk" },
      {
        property: "og:description",
        content: "Discover talent, explore creative journeys and find your next collaborator.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TalentDirectory,
});

function TalentDirectory() {
  const contestants = useQuery({
    queryKey: ["public-talent-directory"],
    queryFn: () => fetchPublicContestants(),
  });

  return (
    <PublicShell>
      <PageHeader
        eyebrow="ArtistrySynk Talent Directory"
        title="Discover talent. Find possibility."
        intro="Explore people whose skills, work and competition journeys are becoming part of the ArtistrySynk creative ecosystem."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            <Search className="size-4" /> Browse disciplines
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold"
          >
            <Sparkles className="size-4" /> Join ArtistrySynk
          </Link>
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        {contestants.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading talent…</p>
        ) : contestants.data?.length ? (
          <>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Discover</p>
                <h2 className="mt-2 text-3xl">People making things happen</h2>
              </div>
              <p className="max-w-sm text-right text-sm text-muted-foreground">
                Competition history is one signal. The directory is designed to grow into a wider
                creative profile and discovery layer.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {contestants.data.map((talent) => (
                <Link
                  key={talent.handle}
                  to="/talent/$handle"
                  params={{ handle: talent.handle }}
                  className="card-stage card-stage-hover block p-6"
                >
                  <span className="eyebrow">{talent.category_name}</span>
                  <h3 className="mt-3 text-2xl">{talent.display_name}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">{talent.group_name}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{talent.bio}</p>
                  <div className="mt-6 flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                    <span>{talent.location}</span>
                    <span>{talent.stage}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="card-stage p-8">
            <p className="eyebrow">Directory is growing</p>
            <h2 className="mt-3 text-2xl">Talent profiles will appear here</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Approved public entries become discoverable here. As ArtistrySynk expands, this
              directory will also support permanent profiles, portfolios, achievements and
              collaboration discovery.
            </p>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
