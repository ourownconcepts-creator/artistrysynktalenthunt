import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Sparkles, Trophy, Users } from "lucide-react";

import heroStage from "@/assets/hero-stage.jpg";
import { StatusPill } from "@/components/competition/StatusPill";
import { PublicShell } from "@/components/site/PublicShell";
import { SponsorStrip } from "@/components/site/SponsorStrip";
import { Button } from "@/components/ui/button";
import {
  useCategoryGroups,
  useCompetition,
  usePublicAnnouncements,
  useRounds,
} from "@/hooks/useCompetition";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import { describeVotingModel, formatDateRange, isRegistrationOpen } from "@/lib/live-data";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 | ArtistrySynk Talent Hunt" },
      {
        name: "description",
        content:
          "ARTISTRYSYNK CREATIVES TALENT HUNT is an ArtistrySynk talent hunt discovering, showcasing and celebrating student talent across music, dance, comedy, spoken word, rap, acting, fashion and more.",
      },
      { property: "og:title", content: "ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 — Where Creatives Meet Opportunity" },
      {
        property: "og:description",
        content:
          "ARTISTRYSYNK CREATIVES TALENT HUNT 1.0 — Where Creatives Meet Opportunity. An ArtistrySynk talent hunt discovering, showcasing and celebrating exceptional student talent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const competition = useCompetition();
  const rounds = useRounds(competition.data?.id);
  const groups = useCategoryGroups(competition.data?.id, true);
  const announcements = usePublicAnnouncements(competition.data?.id);

  const data = competition.data;
  const activeRounds = (rounds.data ?? []).filter((r) => r.is_active);
  const categoryCount = (groups.data ?? []).reduce((sum, g) => sum + g.categories.length, 0);
  const open = data ? isRegistrationOpen(data) : false;
  const closingIn =
    data?.registration_closes_at &&
    Math.max(
      0,
      Math.ceil((new Date(data.registration_closes_at).getTime() - Date.now()) / 86_400_000),
    );

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
            {data && <StatusPill status={data.status} />}
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {formatDateRange(data?.starts_at ?? null, data?.ends_at ?? null)}
            </span>
          </div>

          <h1 className="relative mt-7 max-w-4xl lg:max-w-[42rem] text-5xl sm:text-7xl lg:text-8xl">
            ARTISTRYSYNK CREATIVES TALENT HUNT 1.0
            <br />
            <span className="text-gold">Where Creatives Meet</span>
            <br />
            <span className="text-heat">Opportunity.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base text-muted-foreground sm:text-lg">
            An ArtistrySynk talent hunt created to discover, showcase and
            celebrate exceptional student talent.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/register">
                Enter ARTISTRYSYNK CREATIVES TALENT HUNT
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/how-it-works">How it works</Link>
            </Button>
            {open && closingIn ? (
              <span className="text-sm text-muted-foreground">
                Entries close in <span className="font-bold text-primary">{closingIn} days</span>
              </span>
            ) : null}
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-border/60 pt-8 sm:grid-cols-4">
            <Stat label="Talent categories" value={String(categoryCount)} icon={Sparkles} />
            <Stat label="Campus community" value="UI" icon={Users} />
            <Stat label="Prize pool" value={data?.prize_pool || "TBC"} icon={Trophy} />
            <Stat label="Rounds" value={String(activeRounds.length)} icon={BadgeCheck} />
          </dl>

          <SponsorStrip placement="HERO" className="mt-16" competitionId={data?.id} />
        </div>
      </section>

      {/* Ecosystem promise */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">From talent discovery to creative connection</p>
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
              "Register for ARTISTRYSYNK CREATIVES TALENT HUNT",
              "Your ArtistrySynk identity is created or connected",
              "Showcase your talent in your chosen category",
              "Connect with a wider creative community",
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
            <h2 className="mt-3 text-3xl sm:text-4xl">Showcase your gift</h2>
          </div>
          <Button asChild variant="outline">
            <Link to="/categories">All categories</Link>
          </Button>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(groups.data ?? []).map((group) => (
            <article key={group.id} className="card-stage card-stage-hover p-6">
              <h3 className="text-2xl">{group.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {group.categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to="/categories/$slug"
                      params={{ slug: category.slug }}
                      className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Rounds */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <p className="eyebrow">The road to the final</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">From talent to opportunity</h2>
          {data && (
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Judging is weighted {describeVotingModel(data).toLowerCase()} once public voting
              opens.
            </p>
          )}
          <ol className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeRounds.map((round) => (
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
          {(announcements.data ?? []).slice(0, 3).map((announcement) => (
            <article key={announcement.id} className="card-stage card-stage-hover p-6">
              <time className="eyebrow" dateTime={announcement.published_at}>
                {new Date(announcement.published_at).toLocaleDateString("en-GB", {
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
            Your stage <span className="text-gold">starts here.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Discover your talent. Showcase your ability. Meet your opportunity.
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
