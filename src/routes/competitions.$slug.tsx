import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { JourneyTracker } from "@/components/competition/JourneyTracker";
import { StatusPill } from "@/components/competition/StatusPill";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { SponsorStrip } from "@/components/site/SponsorStrip";
import { Button } from "@/components/ui/button";
import { buildJourney, formatDateRange, isRegistrationOpen } from "@/domain/competition";
import { describeVoting } from "@/domain/voting";
import { getCompetitionBySlug, listCategoryGroups } from "@/lib/competition-data";

export const Route = createFileRoute("/competitions/$slug")({
  loader: ({ params }) => {
    const competition = getCompetitionBySlug(params.slug);
    if (!competition) throw notFound();
    return { competition };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Competition unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { competition } = loaderData;
    return {
      meta: [
        { title: `${competition.name} — Zik's Got Talent` },
        { name: "description", content: competition.description.slice(0, 155) },
        { property: "og:title", content: `${competition.name} — Zik's Got Talent` },
        { property: "og:description", content: competition.description.slice(0, 155) },
      ],
    };
  },
  component: CompetitionDetail,
});

function CompetitionDetail() {
  const { competition } = Route.useLoaderData();
  const groups = listCategoryGroups().filter((g) => competition.categoryGroupIds.includes(g.id));
  const open = isRegistrationOpen(competition);

  return (
    <PublicShell>
      <PageHeader eyebrow={competition.tagline} title={competition.name} intro={competition.description}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={competition.status} />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {formatDateRange(competition.startsAt, competition.endsAt)}
          </span>
          {open && (
            <Button asChild size="sm" className="bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/register">
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
              <JourneyTracker steps={buildJourney(competition, "registration")} />
            </div>
          </Block>

          <Block title="Categories">
            <div className="flex flex-wrap gap-2">
              {groups.flatMap((group) =>
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
              {competition.eligibility.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Rules">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {competition.rules.map((item) => (
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
            <p className="eyebrow">Registration window</p>
            <p className="mt-2 text-sm font-semibold">
              {formatDateRange(competition.registrationOpensAt, competition.registrationClosesAt)}
            </p>
          </div>
          <div className="card-stage p-6">
            <p className="eyebrow">Judging & voting</p>
            <p className="mt-2 text-sm font-semibold">{describeVoting(competition.voting)}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {competition.scoringCriteria.map((criterion) => (
                <li key={criterion.id} className="flex justify-between gap-4">
                  <span>{criterion.name}</span>
                  <span className="text-foreground">/{criterion.maxScore}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-stage p-6">
            <p className="eyebrow">Consent required</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {competition.consentRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card-stage p-6">
            <SponsorStrip placement="SPONSOR_PAGE" />
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
