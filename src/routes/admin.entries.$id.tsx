import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Panel } from "@/components/admin/Field";
import { Button } from "@/components/ui/button";
import { PROGRESS_STATE_LABELS, SUBMISSION_STATE_LABELS, fetchEntryDetail } from "@/lib/operations";

export const Route = createFileRoute("/admin/entries/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Entry details — ArtistrySynk Creatives Talent Hunt admin" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Full submission record: profile, creative identity, marks and status.",
      },
      { property: "og:title", content: "Entry details — ArtistrySynk Creatives Talent Hunt admin" },
      { property: "og:description", content: "Review a submission before scoring." },
    ],
  }),
  component: EntryDetailPage,
});

function when(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function EntryDetailPage() {
  const { id } = Route.useParams();
  const detail = useQuery({
    queryKey: ["admin-entry-detail", id],
    queryFn: () => fetchEntryDetail(id),
  });

  if (detail.isLoading) return <p className="text-sm text-muted-foreground">Loading entry…</p>;

  const data = detail.data;
  if (!data?.ok || !data.entry) {
    return (
      <div className="card-stage p-6">
        <h1 className="text-2xl">Entry unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data?.reason === "FORBIDDEN"
            ? "You need reviewing access to open this entry."
            : "That entry could not be found."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/$section" params={{ section: "contestants" }}>
            Back to contestants
          </Link>
        </Button>
      </div>
    );
  }

  const e = data.entry;
  const criteria = data.criteria ?? [];
  const totalAverage = criteria.reduce((sum, c) => sum + Number(c.average ?? 0), 0);
  const totalMax = criteria.reduce((sum, c) => sum + Number(c.max_score ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/$section" params={{ section: "contestants" }}>
            <ArrowLeft className="mr-1 size-4" /> All contestants
          </Link>
        </Button>
        <p className="eyebrow mt-2">{e.reference_code ?? "Entry"}</p>
        <h1 className="mt-2 text-3xl">{e.display_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{e.handle} · {e.category_name} · {e.group_name}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Status" description="Where this entry stands right now.">
          <Row label="Stage" value={PROGRESS_STATE_LABELS[e.progress_state] ?? e.progress_state} />
          <Row
            label="Media review"
            value={SUBMISSION_STATE_LABELS[e.submission_state] ?? e.submission_state}
          />
          <Row label="Current round" value={e.round_name} />
          <Row label="Review decision" value={e.review_decision ?? "Not reviewed"} />
          <Row label="Reviewed" value={when(e.reviewed_at)} />
          <Row label="Reason on file" value={e.review_reason || e.state_reason} />
          <Row label="Submitted" value={when(e.submitted_at)} />
          <Row label="Last change" value={when(e.updated_at)} />
        </Panel>

        <Panel
          title="Talent profile"
          description="This account's permanent ArtistrySynk talent profile."
        >
          <Row label="Profile name" value={data.profile?.display_name} />
          <Row label="Discipline" value={data.profile?.primary_discipline} />
          <Row label="Location" value={data.profile?.location || e.location} />
        </Panel>

        <Panel title="Audition" description="What the contestant sent in for review.">
          <div className="space-y-3 text-sm">
            {e.audition_url ? (
              <a
                href={e.audition_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-semibold text-primary underline"
              >
                Open audition <ExternalLink className="size-4" />
              </a>
            ) : (
              <p className="text-muted-foreground">No audition link on file.</p>
            )}
            {e.audition_notes && <p className="text-muted-foreground">{e.audition_notes}</p>}
            {e.bio && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">About</p>
                <p className="mt-1">{e.bio}</p>
              </div>
            )}
            {e.experience && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Experience
                </p>
                <p className="mt-1">{e.experience}</p>
              </div>
            )}
            {e.submission_answers &&
              Object.entries(e.submission_answers).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{key}</p>
                  <p className="mt-1">{String(value)}</p>
                </div>
              ))}
          </div>
        </Panel>

        <Panel title="Marks" description="Average of every judge mark recorded against this entry.">
          <Row label="Judges who scored" value={String(data.judges_scored ?? 0)} />
          <Row label="Public votes" value={String(data.valid_votes ?? 0)} />
          <Row
            label="Total average"
            value={totalMax ? `${totalAverage.toFixed(2)} / ${totalMax}` : "—"}
          />
          {criteria.length > 0 && (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Criterion</th>
                  <th className="py-2">Average</th>
                  <th className="py-2">Judges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {criteria.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 font-semibold text-primary">
                      {c.average === null ? "—" : `${c.average} / ${c.max_score}`}
                    </td>
                    <td className="py-2 text-muted-foreground">{c.judges_scored}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(data.results ?? []).length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {(data.results ?? []).map((r, i) => (
                <li key={i} className="text-muted-foreground">
                  {r.round_name}: <span className="text-foreground">{r.outcome}</span> ·{" "}
                  {when(r.decided_at)}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(data.scores ?? []).length > 0 && (
        <Panel title="Judge comments" description="Private notes left with each mark.">
          <ul className="divide-y divide-border/60 text-sm">
            {(data.scores ?? []).map((s, i) => (
              <li key={i} className="py-2.5">
                <p className="font-semibold">
                  {s.criterion_name} — {s.value} / {s.max_score}
                  {s.round_name ? (
                    <span className="ml-2 text-xs text-muted-foreground">{s.round_name}</span>
                  ) : null}
                </p>
                {s.comment && <p className="mt-1 text-muted-foreground">{s.comment}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
