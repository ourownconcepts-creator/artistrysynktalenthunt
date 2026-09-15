import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { fetchCompetition } from "@/lib/live-data";
import {
  SUBMISSION_STATE_LABELS,
  SUBMISSION_STATES,
  describeResult,
  fetchAdminApplications,
  reviewSubmission,
} from "@/lib/operations";
import { notifyContestant } from "@/lib/notify";

export const Route = createFileRoute("/admin/submissions")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Audition review — Zik's Got Talent admin" },
      {
        name: "description",
        content:
          "Moderate audition submissions, request revisions and decide what is approved for publication.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Audition review — Zik's Got Talent admin" },
      {
        property: "og:description",
        content: "Moderate audition media before anything becomes public.",
      },
    ],
  }),
  component: SubmissionReview,
});

function SubmissionReview() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));
  const isStaff = isAdmin || (roles.data ?? []).some((r) => ["MODERATOR"].includes(r));
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("PENDING_REVIEW");
  const [reason, setReason] = useState("");

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const rows = useQuery({
    queryKey: ["admin-submissions", competition.data?.slug, filter],
    queryFn: () =>
      fetchAdminApplications({
        competitionSlug: competition.data?.slug ?? null,
        submissionState: filter || null,
      }),
    enabled: Boolean(user) && Boolean(competition.data?.slug),
  });

  const moderate = useMutation({
    mutationFn: async ({
      id,
      state,
      publish,
    }: {
      id: string;
      state: string;
      publish?: boolean;
    }) => {
      const result = await reviewSubmission(id, state, { reason, publish: publish ?? false });
      if (result.ok) {
        // A mail failure must never undo a recorded moderation decision.
        await notifyContestant(id, state, reason);
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Audition updated — the contestant has been emailed");
        setReason("");
        void queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
        void queryClient.invalidateQueries({ queryKey: ["ops-snapshot"] });
      } else toast.error(describeResult(result));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "That change was refused."),
  });

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <p className="card-stage p-6 text-sm text-warning">
        Sign in with a staff account to moderate auditions.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Auditions</p>
        <h1 className="mt-3 text-4xl">Audition review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Audition media stays private until it is approved and explicitly published. Moderators can
          approve, reject or ask for a revision; only administrators can publish.
        </p>
      </header>

      {!isStaff && (
        <p className="card-stage p-6 text-sm text-warning">
          Your account has no moderation role, so the server will refuse these actions.
        </p>
      )}

      <section className="card-stage grid gap-4 p-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="state">Filter</Label>
          <select
            id="state"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All auditions</option>
            {SUBMISSION_STATES.map((state) => (
              <option key={state} value={state}>
                {SUBMISSION_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason / note to the contestant</Label>
          <Input
            id="reason"
            value={reason}
            placeholder="e.g. Video is private — please share a public link"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </section>

      {rows.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading auditions…</p>
      ) : rows.data?.length ? (
        <div className="space-y-3">
          {rows.data.map((row) => (
            <article key={row.id} className="card-stage p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{row.display_name}</h2>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {row.category_name} ·{" "}
                    {SUBMISSION_STATE_LABELS[row.submission_state] ?? row.submission_state} ·{" "}
                    {row.media_is_public ? "published" : "not published"}
                  </p>
                  {row.audition_notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{row.audition_notes}</p>
                  )}
                  {row.audition_url ? (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
                      href={row.audition_url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Open audition <ArrowUpRight className="size-3.5" />
                    </a>
                  ) : (
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-warning">
                      <EyeOff className="size-3.5" /> No audition link supplied
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isStaff || moderate.isPending}
                    onClick={() => moderate.mutate({ id: row.id, state: "APPROVED" })}
                  >
                    {moderate.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gold text-primary-foreground hover:opacity-90"
                    disabled={!isAdmin || moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ id: row.id, state: "APPROVED", publish: true })
                    }
                  >
                    Approve and publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isStaff || moderate.isPending}
                    onClick={() => moderate.mutate({ id: row.id, state: "REVISION_REQUESTED" })}
                  >
                    Request revision
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isStaff || moderate.isPending}
                    onClick={() => moderate.mutate({ id: row.id, state: "REJECTED" })}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing is waiting for review here.</p>
      )}
    </div>
  );
}
