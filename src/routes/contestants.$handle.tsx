import { createFileRoute, notFound } from "@tanstack/react-router";
import { ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { getPublicContestant } from "@/lib/competition-data";

export const Route = createFileRoute("/contestants/$handle")({
  loader: ({ params }) => {
    const contestant = getPublicContestant(params.handle);
    if (!contestant) throw notFound();
    return { contestant };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Contestant unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { contestant } = loaderData;
    const description = `${contestant.displayName} — ${contestant.categoryName} contestant from ${contestant.location}. ${contestant.bio}`;
    return {
      meta: [
        { title: `${contestant.displayName} — Zik's Got Talent` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${contestant.displayName} — Zik's Got Talent` },
        { property: "og:description", content: description.slice(0, 155) },
      ],
    };
  },
  component: ContestantProfile,
});

function ContestantProfile() {
  const { contestant } = Route.useLoaderData();

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: contestant.displayName, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    toast.success("Profile link copied");
  }

  return (
    <PublicShell>
      <PageHeader
        eyebrow={`${contestant.groupName} · ${contestant.categoryName}`}
        title={contestant.displayName}
        intro={contestant.bio}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            Zik&rsquo;s Got Talent contestant
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {contestant.location}
          </span>
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 className="mr-1 size-4" /> Share
          </Button>
        </div>
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <article className="card-stage p-6">
          <p className="eyebrow">Competition status</p>
          <p className="mt-3 font-display text-2xl">{contestant.stage}</p>
        </article>
        <article className="card-stage p-6">
          <p className="eyebrow">Badges</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {contestant.badges.map((badge) => (
              <li
                key={badge}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
              >
                {badge}
              </li>
            ))}
          </ul>
        </article>
        <article className="card-stage p-6">
          <p className="eyebrow">Creative identity</p>
          <p className="mt-3 text-sm text-muted-foreground">
            This contestant&rsquo;s permanent creative profile lives on {ARTISTRYSYNK.brand}.
          </p>
          <a
            href={ARTISTRYSYNK.site}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            View on {ARTISTRYSYNK.brand} <ExternalLink className="size-3.5" />
          </a>
        </article>

        <article className="card-stage p-6 lg:col-span-3">
          <p className="eyebrow">Approved creative media</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Approved audition and portfolio media appears here once secure media storage is
            connected. Raw submissions stay private to the contestant, assigned judges and
            moderators.
          </p>
        </article>
      </section>
    </PublicShell>
  );
}
