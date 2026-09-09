import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Heart, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { VOTE_MESSAGES, castVote, fetchPublicContestant } from "@/lib/live-data";

export const Route = createFileRoute("/contestants/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.handle} — Zik's Got Talent contestant` },
      {
        name: "description",
        content: `Zik's Got Talent Season One contestant profile for ${params.handle}. Public profile, approved media and competition stage.`,
      },
      { property: "og:title", content: `${params.handle} — Zik's Got Talent contestant` },
      {
        property: "og:description",
        content: `Season One contestant profile, competition stage and public vote.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContestantProfile,
});

function ContestantProfile() {
  const { handle } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const contestant = useQuery({
    queryKey: ["public-contestant", handle],
    queryFn: () => fetchPublicContestant(handle),
  });

  const vote = useMutation({
    mutationFn: () => castVote(handle),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Vote counted. ${result.votesRemainingToday} left today.`);
        void queryClient.invalidateQueries({ queryKey: ["public-contestant", handle] });
        return;
      }
      toast.error(VOTE_MESSAGES[result.reason ?? "WINDOW_CLOSED"]);
    },
    onError: () => toast.error("Your vote could not be counted."),
  });

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: handle, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    toast.success("Profile link copied");
  }

  if (contestant.isLoading) {
    return (
      <PublicShell>
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </section>
      </PublicShell>
    );
  }

  if (!contestant.data) {
    return (
      <PublicShell>
        <PageHeader
          eyebrow="Contestant"
          title="Profile unavailable"
          intro="This contestant profile is not public. Profiles appear once an entry is approved by moderators."
        />
      </PublicShell>
    );
  }

  const c = contestant.data;

  return (
    <PublicShell>
      <PageHeader
        eyebrow={`${c.group_name} · ${c.category_name}`}
        title={c.display_name}
        intro={c.bio}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            Zik&rsquo;s Got Talent contestant
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {c.location}
          </span>
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 className="mr-1 size-4" /> Share
          </Button>
          <Button
            size="sm"
            className="bg-heat text-accent-foreground hover:opacity-90"
            disabled={!user || vote.isPending}
            onClick={() => vote.mutate()}
          >
            {vote.isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Heart className="mr-1 size-4" />
            )}
            Vote ({c.vote_count})
          </Button>
        </div>
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-3">
        <article className="card-stage p-6">
          <p className="eyebrow">Competition status</p>
          <p className="mt-3 font-display text-2xl">{c.stage}</p>
        </article>
        <article className="card-stage p-6">
          <p className="eyebrow">Public votes</p>
          <p className="mt-3 font-display text-2xl">{c.vote_count}</p>
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
