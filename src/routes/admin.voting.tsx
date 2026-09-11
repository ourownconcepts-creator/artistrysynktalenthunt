import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompetition } from "@/lib/live-data";
import {
  closeVotingNow,
  describeResult,
  fetchSuspiciousVoters,
  fetchVoteTotals,
  voidVotes,
} from "@/lib/operations";

export const Route = createFileRoute("/admin/voting")({
  head: () => ({
    meta: [
      { title: "Voting controls — Zik's Got Talent admin" },
      {
        name: "description",
        content:
          "Configure the voting model, judge and public weighting, voting window and limits.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Voting controls — Zik's Got Talent admin" },
      { property: "og:description", content: "Voting model, weighting, window and fraud limits." },
    ],
  }),
  component: VotingControls,
});

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function VotingControls() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const queryClient = useQueryClient();
  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });

  const [form, setForm] = useState({
    voting_model: "HYBRID",
    judge_weight: 70,
    public_weight: 30,
    voting_opens_at: "",
    voting_closes_at: "",
    votes_per_user_per_day: 3,
    vote_rate_limit_per_minute: 5,
  });

  useEffect(() => {
    const c = competition.data;
    if (!c) return;
    setForm({
      voting_model: c.voting_model,
      judge_weight: c.judge_weight,
      public_weight: c.public_weight,
      voting_opens_at: toLocalInput(c.voting_opens_at),
      voting_closes_at: toLocalInput(c.voting_closes_at),
      votes_per_user_per_day: c.votes_per_user_per_day,
      vote_rate_limit_per_minute: c.vote_rate_limit_per_minute,
    });
  }, [competition.data]);

  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));

  const save = useMutation({
    mutationFn: async () => {
      if (form.voting_model === "HYBRID" && form.judge_weight + form.public_weight !== 100) {
        throw new Error("Judge and public weighting must add up to 100.");
      }
      const { error } = await supabase
        .from("competitions")
        .update({
          voting_model: form.voting_model,
          judge_weight: form.judge_weight,
          public_weight: form.public_weight,
          voting_opens_at: form.voting_opens_at
            ? new Date(form.voting_opens_at).toISOString()
            : null,
          voting_closes_at: form.voting_closes_at
            ? new Date(form.voting_closes_at).toISOString()
            : null,
          votes_per_user_per_day: form.votes_per_user_per_day,
          vote_rate_limit_per_minute: form.vote_rate_limit_per_minute,
          updated_at: new Date().toISOString(),
        })
        .eq("id", competition.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voting settings saved");
      void queryClient.invalidateQueries({ queryKey: ["competition"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Only admins can change voting settings.",
      ),
  });

  if (!ready || competition.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Voting</p>
        <h1 className="mt-3 text-4xl">Voting controls</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Public votes require a signed-in account, are limited per person per day, rate limited per
          minute, and can only be cast once per contestant per day.
        </p>
      </header>

      {!user && (
        <p className="card-stage p-6 text-sm text-warning">
          Sign in with an admin account to edit.
        </p>
      )}

      <section className="card-stage grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="model">Voting model</Label>
          <select
            id="model"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.voting_model}
            onChange={(e) => setForm({ ...form, voting_model: e.target.value })}
          >
            <option value="JUDGES_ONLY">Judges only</option>
            <option value="PUBLIC_ONLY">Public vote only</option>
            <option value="HYBRID">Hybrid (judges + public)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="jw">Judges %</Label>
            <Input
              id="jw"
              type="number"
              min={0}
              max={100}
              value={form.judge_weight}
              onChange={(e) => setForm({ ...form, judge_weight: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Public %</Label>
            <Input
              id="pw"
              type="number"
              min={0}
              max={100}
              value={form.public_weight}
              onChange={(e) => setForm({ ...form, public_weight: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opens">Voting opens</Label>
          <Input
            id="opens"
            type="datetime-local"
            value={form.voting_opens_at}
            onChange={(e) => setForm({ ...form, voting_opens_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closes">Voting closes</Label>
          <Input
            id="closes"
            type="datetime-local"
            value={form.voting_closes_at}
            onChange={(e) => setForm({ ...form, voting_closes_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="daily">Votes per person per day</Label>
          <Input
            id="daily"
            type="number"
            min={1}
            max={50}
            value={form.votes_per_user_per_day}
            onChange={(e) => setForm({ ...form, votes_per_user_per_day: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Maximum votes per minute</Label>
          <Input
            id="rate"
            type="number"
            min={1}
            max={60}
            value={form.vote_rate_limit_per_minute}
            onChange={(e) =>
              setForm({ ...form, vote_rate_limit_per_minute: Number(e.target.value) })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => save.mutate()}
            disabled={!isAdmin || save.isPending}
          >
            {save.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Save voting settings
          </Button>
          {!isAdmin && user && (
            <p className="mt-3 text-xs text-warning">
              Your account is not an admin, so saving is blocked by the server as well as here.
            </p>
          )}
        </div>
      </section>

      <VoteOperations
        competitionId={competition.data?.id ?? null}
        competitionSlug={competition.data?.slug ?? null}
        isAdmin={isAdmin}
      />
    </div>
  );
}

/**
 * Live vote operations: totals, unusual voter activity and voiding votes.
 * Every void needs a reason and is written to the audit log by the database.
 */
function VoteOperations({
  competitionId,
  competitionSlug,
  isAdmin,
}: {
  competitionId: string | null;
  competitionSlug: string | null;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [voidReason, setVoidReason] = useState("");

  const totals = useQuery({
    queryKey: ["vote-totals", competitionSlug],
    queryFn: () => fetchVoteTotals({ competitionSlug }),
    enabled: Boolean(competitionSlug),
  });
  const suspicious = useQuery({
    queryKey: ["suspicious-voters", competitionSlug],
    queryFn: () => fetchSuspiciousVoters(competitionSlug ?? undefined),
    enabled: Boolean(competitionSlug),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["vote-totals"] });
    void queryClient.invalidateQueries({ queryKey: ["suspicious-voters"] });
    void queryClient.invalidateQueries({ queryKey: ["ops-snapshot"] });
    void queryClient.invalidateQueries({ queryKey: ["public-contestants"] });
  }

  const closeNow = useMutation({
    mutationFn: () => closeVotingNow(competitionId!, voidReason),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Voting closed");
        void queryClient.invalidateQueries({ queryKey: ["competition"] });
        refresh();
      } else toast.error(describeResult(result));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That action was refused."),
  });

  const voidFor = useMutation({
    mutationFn: (target: { applicationId?: string; voterId?: string }) =>
      voidVotes(voidReason, target),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${result.voided ?? 0} vote(s) voided`);
        setVoidReason("");
        refresh();
      } else toast.error(describeResult(result));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That action was refused."),
  });

  return (
    <div className="space-y-8">
      <section className="card-stage space-y-4 p-6">
        <div>
          <h2 className="text-2xl">Vote operations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Voided votes stop counting everywhere immediately — public tallies, results and limits.
            Voting is not yet ready for a large public campaign: email verification and stronger
            abuse controls are still outstanding.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason (required before voiding or closing)</Label>
          <Input
            id="void-reason"
            value={voidReason}
            placeholder="e.g. Duplicate accounts from one device"
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          disabled={!isAdmin || !competitionId || !voidReason.trim() || closeNow.isPending}
          onClick={() => closeNow.mutate()}
        >
          {closeNow.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
          Close voting now
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Vote totals</h2>
        {totals.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading totals…</p>
        ) : totals.data?.length ? (
          <div className="card-stage overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 py-3 font-semibold">Contestant</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Round</th>
                  <th className="px-4 py-3 font-semibold">Valid</th>
                  <th className="px-4 py-3 font-semibold">Voided</th>
                  <th className="px-4 py-3 font-semibold">Voters</th>
                  <th className="px-4 py-3 font-semibold">Last vote</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {totals.data.map((row) => (
                  <tr key={row.application_id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-semibold">{row.display_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.round_name}</td>
                    <td className="px-4 py-3 font-bold text-primary">{row.valid_votes}</td>
                    <td className="px-4 py-3">{row.voided_votes}</td>
                    <td className="px-4 py-3">{row.distinct_voters}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {row.last_vote_at ? new Date(row.last_vote_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isAdmin || !voidReason.trim() || voidFor.isPending}
                        onClick={() => voidFor.mutate({ applicationId: row.application_id })}
                      >
                        Void all
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No votes have been cast yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Unusual voter activity</h2>
        <p className="text-sm text-muted-foreground">
          A simple review aid, not fraud detection: voters ranked by how many different contestants
          they voted for.
        </p>
        {suspicious.data?.length ? (
          <div className="card-stage overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 py-3 font-semibold">Voter</th>
                  <th className="px-4 py-3 font-semibold">Today</th>
                  <th className="px-4 py-3 font-semibold">Last hour</th>
                  <th className="px-4 py-3 font-semibold">Contestants</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {suspicious.data.map((row) => (
                  <tr key={row.voter_id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3">{row.voter_email ?? row.voter_id}</td>
                    <td className="px-4 py-3">{row.votes_today}</td>
                    <td className="px-4 py-3">{row.votes_last_hour}</td>
                    <td className="px-4 py-3">{row.distinct_contestants}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isAdmin || !voidReason.trim() || voidFor.isPending}
                        onClick={() => voidFor.mutate({ voterId: row.voter_id })}
                      >
                        Void this voter's votes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        )}
      </section>
    </div>
  );
}
