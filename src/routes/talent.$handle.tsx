import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Award, ExternalLink, Globe, Instagram, MapPin, Youtube, Briefcase } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { FeaturedBadge, TalentAvatar, VerificationBadge } from "@/components/talent/TalentBadges";
import { Button } from "@/components/ui/button";
import { PROGRESS_STATE_LABELS } from "@/lib/operations";
import { talentProfileQuery } from "@/lib/talent";

export const Route = createFileRoute("/talent/$handle")({
  staticData: { sitemap: false },
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(talentProfileQuery(params.handle));
    if (!detail) throw notFound();
    return {
      name: detail.profile.display_name,
      discipline: detail.profile.primary_discipline,
      bio: detail.profile.bio,
    };
  },
  head: ({ loaderData, params }) => {
    const title = loaderData ? `${loaderData.name} | ArtistrySynk Talent` : "Talent | ArtistrySynk";
    const description = loaderData
      ? (loaderData.bio || `${loaderData.name} — ${loaderData.discipline} on ArtistrySynk.`).slice(0, 155)
      : "A creative on the ArtistrySynk Talent Directory.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [
        { rel: "canonical", href: `https://artistrysynk.app/talent-hunt/talent/${params.handle}` },
      ],
    };
  },
  errorComponent: () => (
    <PublicShell>
      <PageHeader eyebrow="Talent" title="This profile could not load" intro="Please try again shortly." />
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell>
      <PageHeader eyebrow="Talent" title="Profile not found" intro="This profile does not exist or is not public.">
        <Button asChild className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
          <Link to="/talent">Browse the Talent Directory</Link>
        </Button>
      </PageHeader>
    </PublicShell>
  ),
  component: TalentProfilePage,
});

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Entered",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
};

function TalentProfilePage() {
  const { handle } = Route.useParams();
  const { data } = useSuspenseQuery(talentProfileQuery(handle));
  if (!data) return null;
  const p = data.profile;
  const links = [
    { href: p.portfolio_url, label: "Portfolio", icon: Briefcase },
    { href: p.website_url, label: "Website", icon: Globe },
    { href: p.instagram_url, label: "Instagram", icon: Instagram },
    { href: p.youtube_url, label: "YouTube", icon: Youtube },
  ].filter((l): l is typeof l & { href: string } => Boolean(l.href));

  return (
    <PublicShell>
      <section className="relative overflow-hidden border-b border-border/70 stage-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
          <TalentAvatar src={p.avatar_url} name={p.display_name} className="size-28 text-3xl" />
          <div className="min-w-0">
            <p className="eyebrow">{p.primary_discipline || "Creative"}</p>
            <h1 className="mt-2 text-4xl sm:text-5xl">{p.display_name}</h1>
            <p className="mt-1 text-muted-foreground">@{p.handle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerificationBadge status={p.verification_status} />
              <FeaturedBadge featured={p.is_featured} />
              {p.location && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden /> {p.location}
                </span>
              )}
            </div>
            {p.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-muted-foreground">{p.bio}</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="card-stage p-6">
          <h2 className="text-xl">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.primary_discipline && (
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-primary-foreground">
                {p.primary_discipline}
              </span>
            )}
            {p.secondary_skills.map((s) => (
              <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="card-stage p-6">
          <h2 className="text-xl">Portfolio</h2>
          {links.length ? (
            <ul className="mt-4 space-y-2">
              {links.map(({ href, label, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                    className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Icon className="size-4" aria-hidden /> {label}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No portfolio links yet.</p>
          )}
        </div>

        <div className="card-stage p-6 lg:col-span-2">
          <h2 className="text-xl">Competition journey</h2>
          {data.competitions.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {data.competitions.map((c) => (
                <li key={c.application_handle + c.competition_slug} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link to="/competitions/$slug" params={{ slug: c.competition_slug }} className="font-semibold hover:underline">
                      {c.competition_name}
                    </Link>
                    <p className="text-muted-foreground">
                      {c.category_name ?? "—"} · {c.round_name ?? "Registration"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {PROGRESS_STATE_LABELS[c.progress_state] ?? STATUS_LABELS[c.status] ?? c.status}
                    </p>
                    {c.participated_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.participated_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No public competition history yet.</p>
          )}
        </div>

        <div className="card-stage p-6 lg:col-span-2">
          <h2 className="text-xl">Achievements</h2>
          {data.achievements.length ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.achievements.map((a) => (
                <li key={a.slug + a.awarded_at} className="flex gap-3 rounded-md border border-border/60 p-3">
                  <Award className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.competition_name} · {new Date(a.awarded_at).toLocaleDateString("en-GB")}
                    </p>
                    {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No awards yet.</p>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
