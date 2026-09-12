import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CriterionRow,
  type JudgeQueueRow,
  decideRound,
  fetchCompetition,
  fetchCriteria,
  fetchJudgeQueue,
  fetchMyScores,
  saveScores,
} from "@/lib/live-data";

/**
 * Shared scoring queue. Judges use it on their own dashboard, administrators
 * inside the control centre — so a judge never needs an admin page.
 */
export function ScoringPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const queue = useQuery({ queryKey: ["judge-queue"], queryFn: () => fetchJudgeQueue() });
  const criteria = useQuery({
    queryKey: ["criteria", competition.data?.id],
    queryFn: () => fetchCriteria(competition.data!.id),
    enabled: Boolean(competition.data?.id),
  });

  const decide = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: "ADVANCED" | "ELIMINATED" | "HELD" }) =>
      decideRound(id, outcome),
    onSuccess: () => {
      toast.success("Decision recorded");
      void queryClient.invalidateQueries({ queryKey: ["judge-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["round-results"] });
    },
    onError: () => toast.error("Only administrators can move contestants between rounds."),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Contestants to score</h2>
      {queue.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : queue.data?.length ? (
        queue.data.map((row) => (
          <article key={row.application_id} className="card-stage p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl">{row.display_name}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{row.category_name}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {row.round_name} · {row.status} · {row.my_scored_criteria} of{" "}
                  {criteria.data?.length ?? 0} criteria scored by you
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.audition_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={row.audition_url} target="_blank" rel="noreferrer noopener">
                      Audition <ArrowUpRight className="ml-1 size-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() =>
                    setOpenId(openId === row.application_id ? null : row.application_id)
                  }
                >
                  {openId === row.application_id ? (
                    <>
                      <X className="mr-1 size-4" /> Close
                    </>
                  ) : (
                    "Score"
                  )}
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide.mutate({ id: row.application_id, outcome: "ADVANCED" })}
                    >
                      Advance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        decide.mutate({ id: row.application_id, outcome: "ELIMINATED" })
                      }
                    >
                      Eliminate
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{row.bio}</p>
            {row.audition_notes && (
              <p className="mt-2 text-sm text-muted-foreground">Notes: {row.audition_notes}</p>
            )}

            {openId === row.application_id && criteria.data && (
              <ScoreForm row={row} criteria={criteria.data} />
            )}
          </article>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing assigned to you yet. Admins assign judges, and entries appear here as they arrive.
        </p>
      )}
    </section>
  );
}

function ScoreForm({ row, criteria }: { row: JudgeQueueRow; criteria: CriterionRow[] }) {
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ["my-scores", row.application_id, row.round_id],
    queryFn: () => fetchMyScores(row.application_id, row.round_id!),
    enabled: Boolean(row.round_id),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveScores(
        row.application_id,
        row.round_id!,
        criteria
          .map((c) => ({ criterionId: c.id, value: Number(values[c.id] ?? "") }))
          .filter((entry) => Number.isFinite(entry.value) && entry.value > 0),
        comment,
      ),
    onSuccess: () => {
      toast.success("Scores saved");
      void queryClient.invalidateQueries({ queryKey: ["judge-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["my-scores", row.application_id] });
      void queryClient.invalidateQueries({ queryKey: ["judge-dashboard"] });
    },
    onError: () => toast.error("You are not assigned to score this contestant."),
  });

  const saved = new Map((existing.data ?? []).map((s) => [s.criterion_id, s.value]));

  return (
    <div className="mt-6 border-t border-border/60 pt-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {criteria.map((c) => (
          <div key={c.id} className="space-y-2">
            <Label htmlFor={`c-${c.id}`}>
              {c.name}{" "}
              <span className="text-xs text-muted-foreground">
                (out of {c.max_score} · {c.weight}% weight)
              </span>
            </Label>
            <Input
              id={`c-${c.id}`}
              type="number"
              min={0}
              max={c.max_score}
              step="0.5"
              value={values[c.id] ?? String(saved.get(c.id) ?? "")}
              onChange={(e) => setValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor={`comment-${row.application_id}`}>Private comment</Label>
        <Textarea
          id={`comment-${row.application_id}`}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Only visible to you, admins and moderators."
        />
      </div>
      <Button
        className="mt-4 bg-gold text-primary-foreground hover:opacity-90"
        onClick={() => save.mutate()}
        disabled={save.isPending || !row.round_id}
      >
        {save.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
        Save scores
      </Button>
    </div>
  );
}
