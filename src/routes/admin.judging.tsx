import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, Loader2, ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyRoles, useSession } from "@/hooks/useSession";
import {
  type CriterionRow,
  type JudgeQueueRow,
  claimFirstAdmin,
  decideRound,
  fetchCompetition,
  fetchCriteria,
  fetchJudgeQueue,
  fetchLeaderboard,
  fetchMyScores,
  grantRoleByEmail,
  listTeam,
  saveScores,
} from "@/lib/live-data";

export const Route = createFileRoute("/admin/judging")({
  head: () => ({
    meta: [
      { title: "Judging panel — Zik's Got Talent admin" },
      {
        name: "description",
        content: "Score contestants and move them through competition rounds.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Judging panel — Zik's Got Talent admin" },
      { property: "og:description", content: "Score contestants and manage round progression." },
    ],
  }),
  component: JudgingPanel,
});

function JudgingPanel() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });
  const queue = useQuery({
    queryKey: ["judge-queue"],
    queryFn: () => fetchJudgeQueue(),
    enabled: Boolean(user),
  });
  const criteria = useQuery({
    queryKey: ["criteria", competition.data?.id],
    queryFn: () => fetchCriteria(competition.data!.id),
    enabled: Boolean(competition.data?.id),
  });

  const isStaff = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(r));
  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));
  const isJudge = (roles.data ?? []).includes("JUDGE");

  const claim = useMutation({
    mutationFn: claimFirstAdmin,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("You are now the super admin for this platform.");
        void queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      } else {
        toast.error("An admin already exists — ask them to give you access.");
      }
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: "ADVANCED" | "ELIMINATED" | "HELD" }) =>
      decideRound(id, outcome),
    onSuccess: () => {
      toast.success("Decision recorded");
      void queryClient.invalidateQueries({ queryKey: ["judge-queue"] });
    },
    onError: () => toast.error("Only administrators can move contestants between rounds."),
  });

  if (!ready) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!user) {
    return (
      <div className="card-stage p-6">
        <h1 className="text-3xl">Judging panel</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with a judge, moderator or admin account to score contestants.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Judging</p>
        <h1 className="mt-3 text-4xl">Judging panel</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Judges score each entry against the configured criteria. Only administrators decide who
          advances or is eliminated. Contact details are never shown here.
        </p>
      </header>

      {!isStaff && !isJudge && (
        <div className="card-stage p-6">
          <p className="text-sm text-warning">
            Your account has no judging role yet. If this platform is brand new, you can claim the
            first super admin account.
          </p>
          <Button className="mt-4" onClick={() => claim.mutate()} disabled={claim.isPending}>
            {claim.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Claim super admin
          </Button>
        </div>
      )}

      {isStaff && <TeamPanel />}

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
                        onClick={() =>
                          decide.mutate({ id: row.application_id, outcome: "ADVANCED" })
                        }
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
            Nothing assigned to you yet. Admins assign judges, and entries appear here as they
            arrive.
          </p>
        )}
      </section>

      {isStaff && <Leaderboard />}
    </div>
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

function TeamPanel() {
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: ["team"], queryFn: listTeam });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("JUDGE");

  const grant = useMutation({
    mutationFn: () => grantRoleByEmail(email, role),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Role granted");
        setEmail("");
        void queryClient.invalidateQueries({ queryKey: ["team"] });
      } else {
        toast.error("No account uses that email yet — ask them to sign up first.");
      }
    },
    onError: () => toast.error("Only admins can appoint judges."),
  });

  return (
    <section className="card-stage p-6">
      <p className="flex items-center gap-2 eyebrow">
        <ShieldCheck className="size-4" /> Panel and staff
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="grant-email">Account email</Label>
          <Input
            id="grant-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="judge@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grant-role">Role</Label>
          <select
            id="grant-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {["JUDGE", "MODERATOR", "ADMIN", "SPONSOR_MANAGER"].map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => grant.mutate()} disabled={!email || grant.isPending}>
          {grant.isPending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <UserPlus className="mr-1 size-4" />
          )}
          Appoint
        </Button>
      </div>

      {team.data?.length ? (
        <ul className="mt-5 divide-y divide-border/60 text-sm">
          {team.data.map((member) => (
            <li key={`${member.user_id}-${member.role}`} className="flex justify-between py-2.5">
              <span>{member.display_name || member.email}</span>
              <span className="text-muted-foreground">{member.role.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Leaderboard() {
  const [roundSlug, setRoundSlug] = useState("audition");
  const board = useQuery({
    queryKey: ["leaderboard", roundSlug],
    queryFn: () => fetchLeaderboard(roundSlug),
  });

  return (
    <section className="card-stage p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Hybrid standings</h2>
        <select
          value={roundSlug}
          onChange={(e) => setRoundSlug(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Round"
        >
          {["audition", "top-100", "top-50", "top-20", "top-10", "final"].map((slug) => (
            <option key={slug} value={slug}>
              {slug.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>
      {board.data?.length ? (
        <table className="mt-5 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2">Contestant</th>
              <th className="py-2">Category</th>
              <th className="py-2">Judges</th>
              <th className="py-2">Votes</th>
              <th className="py-2">Combined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {board.data.map((row) => (
              <tr key={row.handle}>
                <td className="py-2.5 font-semibold">{row.display_name}</td>
                <td className="py-2.5 text-muted-foreground">{row.category_name}</td>
                <td className="py-2.5">{row.judge_score}</td>
                <td className="py-2.5">{row.public_votes}</td>
                <td className="py-2.5 font-bold text-primary">{row.combined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No scores or votes recorded for this round yet.
        </p>
      )}
    </section>
  );
}
