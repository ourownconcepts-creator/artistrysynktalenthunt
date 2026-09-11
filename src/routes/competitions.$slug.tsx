import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { StatusPill } from "@/components/competition/StatusPill";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { SponsorStrip } from "@/components/site/SponsorStrip";
import { Button } from "@/components/ui/button";
import { useCategoryGroups, useCompetition, useRounds } from "@/hooks/useCompetition";
import { useQuery } from "@tanstack/react-query";
import {
  buildJourney,
  describeVotingModel,
  fetchCriteria,
  formatDateRange,
  isRegistrationOpen,
} from "@/lib/live-data";

export const Route = createFileRoute("/competitions/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Zik's Got Talent` },
      {
        name: "description",
        content:
          "Dates, categories, rounds, judging weighting and rules for this Zik's Got Talent competition.",
      },
      { property: "og:title", content: "Competition — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Dates, categories, rounds, judging weighting and rules for this competition.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompetitionDetail,
});

function CompetitionDetail() {
  const { slug } = Route.useParams();
  const competition = useCompetition(slug);
  const rounds = useRounds(competition.data?.id);
  const groups = useCategoryGroups(competition.data?.id, true);
  const criteria = useQuery({
    queryKey: ["criteria", competition.data?.id],
    queryFn: () => fetchCriteria(competition.data!.id),
    enabled: Boolean(competition.data?.id),
  });

  if (competition.isLoading) {
    return (
      <PublicShell>
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading competition…</p>
        </section>
      </PublicShell>
    );
  }

  if (!competition.data) {
    return (
      <PublicShell>
        <PageHeader
          eyebrow="Competition"
          title="Competition not found"
          intro="This competition is not published."
        />
        <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
          <Button asChild variant="outline">
            <Link to="/competitions">All competitions</Link>
          </Button>
        </section>
      </PublicShell>
    );
  }

  const data = competition.data;
  const open = isRegistrationOpen(data);

  return (
    <PublicShell>
      <PageHeader eyebrow={data.tagline} title={data.name} intro={data.description}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={data.status} />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {formatDateRange(data.starts_at, data.ends_at)}
          </span>
          {open && (
            <Button asChild size="sm" className="bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/register" search={{ competition: data.slug }}>
                Enter now <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          <Block title="Competition journey">
            <div className="card-stage p-6">
              <JourneyTracker steps={buildJourney(rounds.data ?? [], data.current_round_id)} />
            </div>
          </Block>

          <Block title="Categories">
            <div className="flex flex-wrap gap-2">
              {(groups.data ?? []).flatMap((group) =>
                group.categories.map((category) => (
                  <Link
                    key={category.id}
                    to="/categories/$slug"
                    params={{ slug: category.slug }}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {category.name}
                  </Link>
                )),
              )}
            </div>
          </Block>

          <Block title="Eligibility">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {data.eligibility.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Rules">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {data.rules.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <aside className="space-y-4">
          <div className="card-stage p-6">
            <p className="eyebrow">Entry window</p>
            <p className="mt-2 text-sm font-semibold">
              {formatDateRange(data.registration_opens_at, data.registration_closes_at)}
            </p>
          </div>
          <div className="card-stage p-6">
            <p className="eyebrow">Judging & voting</p>
            <p className="mt-2 text-sm font-semibold">{describeVotingModel(data)}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {(criteria.data ?? []).map((criterion) => (
                <li key={criterion.id} className="flex justify-between gap-4">
                  <span>{criterion.name}</span>
                  <span className="text-foreground">/{criterion.max_score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-stage p-6">
            <p className="eyebrow">Consent required</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {data.consent_requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card-stage p-6">
            <SponsorStrip placement="SPONSOR_PAGE" competitionId={data.id} />
          </div>
        </aside>
      </section>
    </PublicShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
