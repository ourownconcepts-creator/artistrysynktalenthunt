import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { VOTE_MESSAGES, castVote, fetchCompetition, fetchPublicContestants } from "@/lib/live-data";

export const Route = createFileRoute("/vote")({
  head: () => ({
    meta: [
      { title: "Vote — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Cast your public vote for Zik's Got Talent contestants. Votes are limited per person per day and protected against manipulation.",
      },
      { property: "og:title", content: "Vote — Zik's Got Talent" },
      {
        property: "og:description",
        content:
          "Cast your public vote. Limited votes per person, per day, verified accounts only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VotePage,
});

function VotePage() {
  const { user, ready } = useSession();
  const queryClient = useQueryClient();

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const contestants = useQuery({
    queryKey: ["public-contestants"],
    queryFn: () => fetchPublicContestants(),
  });

  const vote = useMutation({
    mutationFn: castVote,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(
          result.votesRemainingToday === 0
            ? "Vote counted — that was your last vote today."
            : `Vote counted. ${result.votesRemainingToday} left today.`,
        );
        void queryClient.invalidateQueries({ queryKey: ["public-contestants"] });
        return;
      }
      toast.error(VOTE_MESSAGES[result.reason ?? "WINDOW_CLOSED"]);
    },
    onError: () => toast.error("Your vote could not be counted. Please try again."),
  });

  const comp = competition.data;
  const votingOpen =
    comp?.voting_model !== "JUDGES_ONLY" &&
    Boolean(comp?.voting_opens_at && comp?.voting_closes_at) &&
    new Date(comp!.voting_opens_at!) <= new Date() &&
    new Date(comp!.voting_closes_at!) >= new Date();

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Public vote"
        title="Vote for your favourite"
        intro={
          comp
            ? `${comp.judge_weight}% judges · ${comp.public_weight}% public vote. ${comp.votes_per_user_per_day} votes per person per day.`
            : "Loading the voting rules…"
        }
      />

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="card-stage flex flex-wrap items-center gap-3 p-5 text-sm">
          <ShieldCheck className="size-5 text-primary" />
          {votingOpen ? (
            <span>Voting is open. Votes are tied to your account and rate limited.</span>
          ) : (
            <span className="text-warning">
              Public voting opens when the live rounds begin — an admin sets the voting window in
              the control centre.
            </span>
          )}
          {ready && !user && (
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link to="/auth">Sign in to vote</Link>
            </Button>
          )}
        </div>

        {contestants.isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading contestants…</p>
        ) : contestants.data?.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {contestants.data.map((c) => (
              <article key={c.handle} className="card-stage flex flex-col p-6">
                <span className="eyebrow">{c.group_name}</span>
                <h2 className="mt-3 text-2xl">{c.display_name}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">{c.category_name}</p>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{c.bio}</p>
                <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                  {c.location} · {c.stage} · {c.vote_count} votes
                </p>
                <Button
                  className="mt-5 bg-heat text-accent-foreground hover:opacity-90"
                  disabled={!user || !votingOpen || vote.isPending}
                  onClick={() => vote.mutate(c.handle)}
                >
                  {vote.isPending && vote.variables === c.handle ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <Heart className="mr-1 size-4" />
                  )}
                  Vote
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-sm text-muted-foreground">
            No contestants are public yet. Approved entries appear here as soon as moderators clear
            them.
          </p>
        )}
      </section>
    </PublicShell>
  );
}
