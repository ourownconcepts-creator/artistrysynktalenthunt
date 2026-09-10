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
    </div>
  );
}
