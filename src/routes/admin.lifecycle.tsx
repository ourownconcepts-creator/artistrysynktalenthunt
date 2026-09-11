import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/competition/StatusPill";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { fetchCompetition, fetchRounds } from "@/lib/live-data";
import {
  COMPETITION_STATUS_LABELS,
  PROGRESS_STATE_LABELS,
  PROGRESS_STATES,
  ROUND_STATUS_LABELS,
  decideRoundResult,
  describeResult,
  fetchRoundProgress,
  fetchRoundResults,
  fetchScoreCorrections,
  nextCompetitionStatuses,
  nextRoundStatuses,
  setApplicationState,
  setCompetitionStatus,
  setRoundStatus,
} from "@/lib/operations";
import { notifyContestant } from "@/lib/notify";

export const Route = createFileRoute("/admin/lifecycle")({
  head: () => ({
    meta: [
      { title: "Competition operations — Zik's Got Talent admin" },
      {
        name: "description",
        content:
          "Move the competition and its rounds through their lifecycle, review results and advance or eliminate contestants.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Competition operations — Zik's Got Talent admin" },
      {
        property: "og:description",
        content: "Lifecycle, round completion, advancement and results.",
      },
    ],
  }),
  component: LifecyclePage,
});

function LifecyclePage() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));
  const queryClient = useQueryClient();

  const [reason, setReason] = useState("");
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const rounds = useQuery({
    queryKey: ["rounds", competition.data?.id],
    queryFn: () => fetchRounds(competition.data!.id),
    enabled: Boolean(competition.data?.id),
  });

  const roundId = selectedRound ?? competition.data?.current_round_id ?? null;

  const progress = useQuery({
    queryKey: ["round-progress", roundId],
    queryFn: () => fetchRoundProgress(roundId!),
    enabled: Boolean(roundId) && Boolean(user),
  });
  const results = useQuery({
    queryKey: ["round-results", roundId],
    queryFn: () => fetchRoundResults(roundId!),
    enabled: Boolean(roundId) && Boolean(user),
  });
  const corrections = useQuery({
    queryKey: ["score-corrections"],
    queryFn: () => fetchScoreCorrections(),
    enabled: isAdmin,
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["competition"] });
    void queryClient.invalidateQueries({ queryKey: ["rounds"] });
    void queryClient.invalidateQueries({ queryKey: ["round-progress"] });
    void queryClient.invalidateQueries({ queryKey: ["round-results"] });
    void queryClient.invalidateQueries({ queryKey: ["ops-snapshot"] });
  }

  const changeCompetition = useMutation({
    mutationFn: (status: string) => setCompetitionStatus(competition.data!.id, status, reason),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(
          `Competition moved to ${COMPETITION_STATUS_LABELS[result.new_state ?? ""] ?? result.new_state}`,
        );
        setReason("");
        refresh();
      } else {
        toast.error(describeResult(result));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change was refused."),
  });

  const changeRound = useMutation({
    mutationFn: ({ status, override }: { status: string; override: boolean }) =>
      setRoundStatus(roundId!, status, { override, reason }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Round updated");
        setReason("");
        refresh();
      } else {
        toast.error(describeResult(result));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change was refused."),
  });

  const decide = useMutation({
    mutationFn: async ({
      id,
      outcome,
    }: {
      id: string;
      outcome: "ADVANCED" | "ELIMINATED" | "HELD";
    }) => {
      const result = await decideRoundResult(id, outcome, reason);
      if (result.ok) await notifyContestant(id, outcome, reason);
      return result;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(
          `Recorded — contestant is now ${PROGRESS_STATE_LABELS[result.new_state ?? ""] ?? result.new_state} and has been emailed`,
        );
        setReason("");
        refresh();
      } else {
        toast.error(describeResult(result));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That decision was refused."),
  });

  const changeState = useMutation({
    mutationFn: async ({ id, state }: { id: string; state: string }) => {
      const result = await setApplicationState(id, state, reason);
      if (result.ok) await notifyContestant(id, state, reason);
      return result;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Contestant state updated — the contestant has been emailed");
        setReason("");
        refresh();
      } else {
        toast.error(describeResult(result));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change was refused."),
  });

  if (!ready || competition.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!competition.data) {
    return <p className="card-stage p-6 text-sm text-warning">No competition is configured yet.</p>;
  }

  const comp = competition.data;
  const round = (rounds.data ?? []).find((r) => r.id === roundId) ?? null;
  const p = progress.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="mt-3 text-4xl">{comp.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every state change below is validated by the server and written to the audit log with
            the actor, both states and your reason.
          </p>
        </div>
        <StatusPill status={comp.status} />
      </header>

      {!isAdmin && (
        <p className="card-stage p-6 text-sm text-warning">
          Only administrators can change competition state, advance or eliminate contestants.
          Moderators and judges are refused by the server as well as here.
        </p>
      )}

      <section className="card-stage space-y-4 p-6">
        <h2 className="text-2xl">Reason (recorded with the next action)</h2>
        <Input
          value={reason}
          placeholder="Why is this change being made?"
          onChange={(e) => setReason(e.target.value)}
        />
      </section>

      <section className="card-stage space-y-4 p-6">
        <div>
          <h2 className="text-2xl">Competition state</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current state: <strong>{COMPETITION_STATUS_LABELS[comp.status] ?? comp.status}</strong>.
            Only the transitions below are valid.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextCompetitionStatuses(comp.status).length === 0 && (
            <p className="text-sm text-muted-foreground">
              This competition is archived — no further state changes are possible.
            </p>
          )}
          {nextCompetitionStatuses(comp.status).map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={!isAdmin || changeCompetition.isPending}
              onClick={() => changeCompetition.mutate(status)}
            >
              {changeCompetition.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
              Move to {COMPETITION_STATUS_LABELS[status] ?? status}
            </Button>
          ))}
        </div>
      </section>

      <section className="card-stage space-y-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl">Round completion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A round cannot be decided or closed while judging or decisions are outstanding, unless
              you explicitly override it.
            </p>
          </div>
          <div className="min-w-56 space-y-2">
            <Label htmlFor="round">Round</Label>
            <select
              id="round"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={roundId ?? ""}
              onChange={(e) => setSelectedRound(e.target.value || null)}
            >
              {(rounds.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.sequence}. {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {round && (
          <>
            <p className="text-sm">
              State:{" "}
              <strong>{ROUND_STATUS_LABELS[round.status] ?? round.status}</strong>
            </p>
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="In round" value={p?.contestants_in_round} />
              <Stat label="Judging done" value={p?.judging_complete} />
              <Stat label="Judging pending" value={p?.judging_pending} />
              <Stat label="Decisions" value={p?.decisions} />
              <Stat label="Advanced" value={p?.advanced} />
              <Stat label="Unresolved" value={p?.unresolved} />
            </div>
            <div className="flex flex-wrap gap-2">
              {nextRoundStatuses(round.status).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  disabled={!isAdmin || changeRound.isPending}
                  onClick={() => changeRound.mutate({ status, override: false })}
                >
                  Move to {ROUND_STATUS_LABELS[status] ?? status}
                </Button>
              ))}
              {["DECIDED", "CLOSED"].includes(round.status) === false &&
                nextRoundStatuses(round.status).some((s) => ["DECIDED", "CLOSED"].includes(s)) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-warning"
                    disabled={!isAdmin || !reason.trim() || changeRound.isPending}
                    onClick={() =>
                      changeRound.mutate({
                        status: nextRoundStatuses(round.status).find((s) =>
                          ["DECIDED", "CLOSED"].includes(s),
                        )!,
                        override: true,
                      })
                    }
                  >
                    Override and force close (reason required)
                  </Button>
                )}
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl">Round results and advancement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Judge score and public votes are combined using this competition's configured weighting
            ({comp.judge_weight}% judges / {comp.public_weight}% public).
          </p>
        </div>
        {results.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading results…</p>
        ) : results.data?.length ? (
          <div className="card-stage overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 py-3 font-semibold">Contestant</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold">Judges</th>
                  <th className="px-4 py-3 font-semibold">Votes</th>
                  <th className="px-4 py-3 font-semibold">Combined</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.data.map((row) => (
                  <tr key={row.application_id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-semibold">{row.display_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category_name}</td>
                    <td className="px-4 py-3">
                      {PROGRESS_STATE_LABELS[row.progress_state] ?? row.progress_state}
                    </td>
                    <td className="px-4 py-3">
                      {row.judge_score} <span className="text-muted-foreground">({row.judges_scored})</span>
                    </td>
                    <td className="px-4 py-3">{row.public_votes}</td>
                    <td className="px-4 py-3 font-bold text-primary">{row.combined}</td>
                    <td className="px-4 py-3">
                      {row.outcome ? row.outcome.toLowerCase() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isAdmin || decide.isPending}
                          onClick={() =>
                            decide.mutate({ id: row.application_id, outcome: "ADVANCED" })
                          }
                        >
                          Advance
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isAdmin || decide.isPending}
                          onClick={() =>
                            decide.mutate({ id: row.application_id, outcome: "ELIMINATED" })
                          }
                        >
                          Eliminate
                        </Button>
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value=""
                          disabled={!isAdmin}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            changeState.mutate({
                              id: row.application_id,
                              state: e.target.value,
                            });
                            e.target.value = "";
                          }}
                        >
                          <option value="">Set state…</option>
                          {PROGRESS_STATES.map((state) => (
                            <option key={state} value={state}>
                              {PROGRESS_STATE_LABELS[state]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No contestants in this round yet.</p>
        )}
      </section>

      {isAdmin && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl">Score corrections</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Locked scores are never overwritten silently. Every correction keeps the original
              value, the corrected value, the reason and who made it.
            </p>
          </div>
          {corrections.data?.length ? (
            <div className="card-stage overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Contestant</th>
                    <th className="px-4 py-3 font-semibold">Criterion</th>
                    <th className="px-4 py-3 font-semibold">Judge</th>
                    <th className="px-4 py-3 font-semibold">Before → after</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">By</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.data.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{row.handle}</td>
                      <td className="px-4 py-3">{row.criterion_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.judge_email ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">
                        {row.previous_value} → {row.corrected_value}
                      </td>
                      <td className="px-4 py-3">{row.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.corrected_by_email ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No score corrections have been made.</p>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/50 p-4">
      <p className="text-2xl font-black">{value ?? 0}</p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
