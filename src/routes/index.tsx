import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Sparkles, Trophy, Users } from "lucide-react";

import heroStage from "@/assets/hero-stage.jpg";
import { CategoryGrid } from "@/components/competition/CategoryGrid";
import { StatusPill } from "@/components/competition/StatusPill";
import { PublicShell } from "@/components/site/PublicShell";
import { SponsorStrip } from "@/components/site/SponsorStrip";
import { Button } from "@/components/ui/button";
import { daysUntil, formatDateRange, isRegistrationOpen } from "@/domain/competition";
import { describeVoting } from "@/domain/voting";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import {
  getFeaturedCompetition,
  listAnnouncements,
  listCategoryGroups,
} from "@/lib/competition-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zik's Got Talent — Your talent deserves to be discovered" },
      {
        name: "description",
        content:
          "A national multi-category talent competition for singers, dancers, comedians, designers, photographers, coders and creators. Enter Season One free.",
      },
      { property: "og:title", content: "Zik's Got Talent — Your talent deserves to be discovered" },
      {
        property: "og:description",
        content:
          "Enter Season One across 22 talent categories. Every contestant leaves with a free ArtistrySynk creative profile.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const competition = getFeaturedCompetition();
  const groups = listCategoryGroups();
  const announcements = listAnnouncements("PUBLIC").slice(0, 3);
  const open = isRegistrationOpen(competition);
  const closingIn = daysUntil(competition.registrationClosesAt);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden stage-surface">
        <div
          className="pointer-events-none absolute inset-x-0 -top-52 h-[28rem] spotlight-glow animate-pulse-spot"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block"
          aria-hidden
        >
          <img
            src={heroStage}
            alt=""
            width={1280}
            height={1600}
            className="size-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={competition.status} />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {formatDateRange(competition.startsAt, competition.endsAt)}
            </span>
          </div>

          <h1 className="relative mt-7 max-w-4xl lg:max-w-[42rem] text-5xl sm:text-7xl lg:text-8xl">
            Your talent
            <br />
            <span className="text-gold">deserves to be</span>
            <br />
            <span className="text-heat">discovered.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base text-muted-foreground sm:text-lg">
            {competition.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/register">
                Enter Season One
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/competitions/$slug" params={{ slug: competition.slug }}>
                How it works
              </Link>
            </Button>
            {open && (
              <span className="text-sm text-muted-foreground">
                Registration closes in{" "}
                <span className="font-bold text-primary">{closingIn} days</span>
              </span>
            )}
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-border/60 pt-8 sm:grid-cols-4">
            <Stat
              label="Talent categories"
              value={String(competition.stats.categories)}
              icon={Sparkles}
            />
            <Stat label="Cities" value={String(competition.stats.cities)} icon={Users} />
            <Stat label="Prize pool" value={competition.stats.prizePool} icon={Trophy} />
            <Stat label="Rounds" value={String(competition.rounds.length)} icon={BadgeCheck} />
          </dl>

          <SponsorStrip placement="HERO" className="mt-16" />
        </div>
      </section>

      {/* Ecosystem promise */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">The competition ends. Your identity doesn&rsquo;t.</p>
            <h2 className="mt-4 text-3xl sm:text-4xl">{ARTISTRYSYNK.ecosystem}</h2>
            <p className="mt-5 max-w-xl text-muted-foreground">{ARTISTRYSYNK.promise}</p>
            <a
              href={ARTISTRYSYNK.site}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Learn about ArtistrySynk
              <ArrowRight className="size-4" />
            </a>
          </div>
          <ol className="card-stage divide-y divide-border/60 p-2">
            {[
              "Register for Zik's Got Talent",
              "Your ArtistrySynk identity is created or connected",
              "Your creative profile goes live",
              "Your contestant application enters the competition",
            ].map((step, index) => (
              <li key={step} className="flex items-center gap-4 px-4 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-sm text-primary">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Talent categories</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Pick your lane</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/categories">All categories</Link>
          </Button>
        </div>
        <div className="mt-9">
          <CategoryGrid groups={groups} />
        </div>
      </section>

      {/* Rounds */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">The road to the final</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            {competition.rounds.length} configurable rounds
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Judging is weighted {describeVoting(competition.voting).toLowerCase()} once public
            voting opens.
          </p>
          <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {competition.rounds.map((round) => (
              <li key={round.id} className="card-stage card-stage-hover p-5">
                <span className="font-display text-3xl text-primary/40">
                  {String(round.sequence).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-xl">{round.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{round.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Announcements */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Latest</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Announcements</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/announcements">All news</Link>
          </Button>
        </div>
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="card-stage card-stage-hover p-6">
              <time className="eyebrow" dateTime={announcement.publishedAt}>
                {new Date(announcement.publishedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                })}
              </time>
              <h3 className="mt-3 text-xl">{announcement.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{announcement.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/70 stage-surface">
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-40 h-80 spotlight-glow"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-4xl sm:text-6xl">
            One entry. <span className="text-gold">One shot.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Registration is free and takes about ten minutes. You can save your application and
            finish it later.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-heat text-accent-foreground hover:opacity-90"
          >
            <Link to="/register">
              Start my application
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <Icon className="size-4 text-primary" />
      <dd className="mt-2 font-display text-3xl sm:text-4xl">{value}</dd>
      <dt className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
    </div>
  );
}
