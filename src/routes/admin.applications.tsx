import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { fetchCompetition, fetchRequirements } from "@/lib/live-data";
import {
  PROGRESS_STATE_LABELS,
  PROGRESS_STATES,
  SUBMISSION_STATE_LABELS,
  describeResult,
  fetchAdminApplications,
  reviewApplication,
  setApplicationState,
} from "@/lib/operations";
import { notifyContestant } from "@/lib/notify";

export const Route = createFileRoute("/admin/applications")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Application review — Zik's Got Talent admin" },
      {
        name: "description",
        content:
          "Review submitted entries, approve, reject or request a correction, and record the decision reason.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Application review — Zik's Got Talent admin" },
      { property: "og:description", content: "Approve, reject or return entries for correction." },
    ],
  }),
  component: ApplicationReview,
});

function ApplicationReview() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));
  const isStaff = isAdmin || (roles.data ?? []).some((r) => ["MODERATOR"].includes(r));
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const applications = useQuery({
    queryKey: ["admin-applications", competition.data?.slug, filter],
    queryFn: () =>
      fetchAdminApplications({
        competitionSlug: competition.data?.slug ?? null,
        progressState: filter || null,
      }),
    enabled: Boolean(user) && Boolean(competition.data?.slug),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["ops-snapshot"] });
    void queryClient.invalidateQueries({ queryKey: ["public-contestants"] });
  }

  const review = useMutation({
    mutationFn: async ({
      id,
      decision,
    }: {
      id: string;
      decision: "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED" | "UNDER_REVIEW";
    }) => {
      const result = await reviewApplication(id, decision, reason);
      if (result.ok) await notifyContestant(id, decision, reason);
      return result;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Decision recorded — the contestant has been emailed");
        setReason("");
        refresh();
      } else toast.error(describeResult(result));
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
      } else toast.error(describeResult(result));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change was refused."),
  });

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <p className="card-stage p-6 text-sm text-warning">
        Sign in with a staff account to review entries.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Applications</p>
        <h1 className="mt-3 text-4xl">Application review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Contestants can never approve their own entry. Only administrators admit or reject an
          entry; moderators can flag one for review or ask for a correction. Every action is
          recorded in the audit log.
        </p>
      </header>

      {!isAdmin && (
        <p className="card-stage p-6 text-sm text-warning">
          {isStaff
            ? "As a moderator you can flag entries and ask for corrections. Admitting or rejecting an entry is reserved for administrators."
            : "You can read entries, but only competition staff can act on them."}
        </p>
      )}

      <section className="card-stage grid gap-4 p-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="state">Filter by state</Label>
          <select
            id="state"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All states</option>
            {PROGRESS_STATES.map((state) => (
              <option key={state} value={state}>
                {PROGRESS_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Decision reason (recorded with the next action)</Label>
          <Input
            id="reason"
            value={reason}
            placeholder="e.g. Meets all category requirements"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </section>

      {applications.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading entries…</p>
      ) : applications.data?.length ? (
        <div className="space-y-4">
          {applications.data.map((row) => (
            <article key={row.id} className="card-stage p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl">{row.display_name}</h2>
                  <p className="mt-1 text-sm font-semibold text-primary">{row.category_name}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {PROGRESS_STATE_LABELS[row.progress_state] ?? row.progress_state} ·{" "}
                    {SUBMISSION_STATE_LABELS[row.submission_state] ?? row.submission_state} ·{" "}
                    {row.round_name}
                  </p>
                  {row.review_decision && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Last decision: {row.review_decision.toLowerCase().replace(/_/g, " ")}
                      {row.review_reason ? ` — ${row.review_reason}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  >
                    {openId === row.id ? "Hide entry" : "View entry"}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-primary-foreground hover:opacity-90"
                    disabled={!isAdmin || review.isPending}
                    onClick={() => review.mutate({ id: row.id, decision: "APPROVED" })}
                  >
                    {review.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isStaff || review.isPending}
                    onClick={() => review.mutate({ id: row.id, decision: "CORRECTION_REQUESTED" })}
                  >
                    Request correction
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isStaff || review.isPending}
                    onClick={() => review.mutate({ id: row.id, decision: "UNDER_REVIEW" })}
                  >
                    Flag for review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isAdmin || review.isPending}
                    onClick={() => review.mutate({ id: row.id, decision: "REJECTED" })}
                  >
                    Reject
                  </Button>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value=""
                    disabled={!isAdmin}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      changeState.mutate({ id: row.id, state: e.target.value });
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
              </div>

              {openId === row.id && <EntryDetail row={row} />}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No entries match this filter.</p>
      )}
    </div>
  );
}

function EntryDetail({
  row,
}: {
  row: {
    category_id: string;
    bio: string;
    experience: string;
    location: string;
    audition_url: string;
    audition_notes: string;
    submission_answers: Record<string, string> | null;
    created_at: string;
    submitted_at: string | null;
  };
}) {
  const requirements = useQuery({
    queryKey: ["requirements", row.category_id],
    queryFn: () => fetchRequirements(row.category_id, true),
  });

  const answers = row.submission_answers ?? {};

  return (
    <div className="mt-6 grid gap-6 border-t border-border/50 pt-5 sm:grid-cols-2">
      <div className="space-y-3 text-sm">
        <Detail label="Location" value={row.location} />
        <Detail label="Bio" value={row.bio} />
        <Detail label="Experience" value={row.experience} />
        <Detail
          label="Submitted"
          value={row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "Not submitted"}
        />
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Audition</p>
          {row.audition_url ? (
            <a
              className="mt-1 inline-flex items-center gap-1 font-semibold text-primary underline"
              href={row.audition_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open audition <ArrowUpRight className="size-3.5" />
            </a>
          ) : (
            <p className="mt-1">No audition link</p>
          )}
          {row.audition_notes && <p className="mt-1 text-muted-foreground">{row.audition_notes}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Category requirements
          </p>
          <ul className="mt-2 space-y-2">
            {(requirements.data ?? []).map((req) => {
              const value = answers[req.key] ?? "";
              return (
                <li key={req.id}>
                  <span className="font-semibold">{req.label}</span>
                  {req.is_required && !value && (
                    <span className="ml-2 text-xs font-bold uppercase tracking-widest text-warning">
                      missing
                    </span>
                  )}
                  <p className="break-words text-muted-foreground">{value || "—"}</p>
                </li>
              );
            })}
            {(requirements.data ?? []).length === 0 && (
              <li className="text-muted-foreground">
                This category has no extra requirements configured.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line">{value || "—"}</p>
    </div>
  );
}
