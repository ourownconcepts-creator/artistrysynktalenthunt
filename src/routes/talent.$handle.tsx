import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { fetchPublicContestant } from "@/lib/live-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/talent/$handle")({
  staticData: { sitemap: false },
  head: ({ params }) => ({
    meta: [
      { title: `${params.handle} | ArtistrySynk Talent` },
      {
        name: "description",
        content: `Discover ${params.handle} on the ArtistrySynk Talent Directory.`,
      },
      { property: "og:title", content: `${params.handle} | ArtistrySynk Talent` },
      {
        property: "og:description",
        content: "Explore this talent profile, competition journey and approved creative work.",
      },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: TalentProfile,
});

function TalentProfile() {
  const { handle } = Route.useParams();
  const talent = useQuery({
    queryKey: ["public-talent", handle],
    queryFn: () => fetchPublicContestant(handle),
  });

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: handle, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    toast.success("Talent profile link copied");
  }

  if (talent.isLoading) {
    return (
      <PublicShell>
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading talent profile…</p>
        </section>
      </PublicShell>
    );
  }

  if (!talent.data) {
    return (
      <PublicShell>
        <PageHeader
          eyebrow="Talent Directory"
          title="Profile unavailable"
          intro="This talent profile is not public or could not be found."
        />
      </PublicShell>
    );
  }

  const c = talent.data;

  return (
    <PublicShell>
      <PageHeader
        eyebrow={`${c.category_name} · ${c.group_name}`}
        title={c.display_name}
        intro={c.bio}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            ArtistrySynk Talent Directory
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {c.location}
          </span>
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 className="mr-1 size-4" /> Share
          </Button>
        </div>
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <article className="card-stage p-6">
          <p className="eyebrow">Primary discipline</p>
          <p className="mt-3 font-display text-2xl">{c.category_name}</p>
        </article>
        <article className="card-stage p-6">
          <p className="eyebrow">Competition journey</p>
          <p className="mt-3 font-display text-2xl">{c.stage}</p>
          <p className="mt-2 text-sm text-muted-foreground">{c.competition_slug}</p>
        </article>
        <article className="card-stage p-6">
          <p className="eyebrow">Recognition signal</p>
          <p className="mt-3 font-display text-2xl">{c.vote_count} public votes</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Competition activity can become part of a talent's permanent ArtistrySynk journey.
          </p>
        </article>

        <article className="card-stage p-6 lg:col-span-3">
          <p className="eyebrow">Creative profile</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This directory profile starts with approved competition information. The next layer is
            a permanent ArtistrySynk profile with skills, portfolio links, achievements,
            verification and collaboration discovery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={`/contestants/${encodeURIComponent(c.handle)}`}>
                <ArrowLeft className="mr-1 size-4" /> View competition profile
              </a>
            </Button>
          </div>
        </article>
      </section>
    </PublicShell>
  );
}
