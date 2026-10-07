import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Search, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { FeaturedBadge, TalentAvatar, VerificationBadge } from "@/components/talent/TalentBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DIRECTORY_PAGE_SIZE,
  VERIFICATION_LABELS,
  talentDirectoryQuery,
  talentDisciplinesQuery,
  type TalentCard,
} from "@/lib/talent";

const searchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  discipline: z.string().max(80).optional().catch(undefined),
  location: z.string().max(80).optional().catch(undefined),
  verification: z
    .enum(["UNVERIFIED", "IDENTITY_VERIFIED", "TALENT_VERIFIED"])
    .optional()
    .catch(undefined),
  featured: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

type DirectorySearch = z.infer<typeof searchSchema>;

const TITLE = "Talent Directory | ArtistrySynk";
const DESCRIPTION =
  "Discover verified and competition-proven talent across ArtistrySynk — musicians, producers, performers and more.";

export const Route = createFileRoute("/talent/")({
  staticData: { sitemap: true },
  validateSearch: (input) => searchSchema.parse(input),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(talentDirectoryQuery(toFilters(deps))),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://artistrysynk.app/talent-hunt/talent" }],
  }),
  errorComponent: () => (
    <PublicShell>
      <PageHeader
        eyebrow="Talent Directory"
        title="The directory is unavailable"
        intro="Please try again in a moment."
      />
    </PublicShell>
  ),
  notFoundComponent: () => (
    <PublicShell>
      <PageHeader eyebrow="Talent Directory" title="Not found" />
    </PublicShell>
  ),
  component: TalentDirectory,
});

function toFilters(s: DirectorySearch) {
  return {
    q: s.q,
    discipline: s.discipline,
    location: s.location,
    verification: s.verification,
    featured: s.featured,
    page: s.page,
  };
}

function TalentDirectory() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/talent/" });
  const { data } = useSuspenseQuery(talentDirectoryQuery(toFilters(search)));
  const disciplines = useQuery(talentDisciplinesQuery());
  const [q, setQ] = useState(search.q ?? "");
  const [location, setLocation] = useState(search.location ?? "");

  useEffect(() => {
    setQ(search.q ?? "");
    setLocation(search.location ?? "");
  }, [search.q, search.location]);

  function update(patch: Partial<DirectorySearch>) {
    void navigate({
      search: (prev) => {
        const next = { ...prev, ...patch, page: patch.page ?? undefined };
        return Object.fromEntries(
          Object.entries(next).filter(([, v]) => v !== undefined && v !== "" && v !== false),
        ) as DirectorySearch;
      },
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    update({ q: q.trim() || undefined, location: location.trim() || undefined });
  }

  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(data.total / DIRECTORY_PAGE_SIZE));
  const hasFilters = Boolean(
    search.q || search.discipline || search.location || search.verification || search.featured,
  );

  return (
    <PublicShell>
      <PageHeader
        eyebrow="ArtistrySynk Talent Directory"
        title="Discover talent. Find possibility."
        intro="Musicians, producers, dancers, filmmakers, designers, writers and more — one permanent profile each, proven through competitions and trusted through verification."
      >
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Discover · Showcase · Get discovered
        </p>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <form onSubmit={submit} className="card-stage grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
          <label className="relative">
            <span className="sr-only">Search talent</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, handle, skill or discipline"
              className="pl-9"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Location</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="pl-9"
            />
          </label>
          <Button type="submit" className="bg-gold text-primary-foreground hover:opacity-90">
            Search
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            aria-label="Discipline"
            value={search.discipline ?? ""}
            onChange={(e) => update({ discipline: e.target.value || undefined })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All disciplines</option>
            {(disciplines.data ?? []).map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Verification"
            value={search.verification ?? ""}
            onChange={(e) =>
              update({
                verification: (e.target.value || undefined) as DirectorySearch["verification"],
              })
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any verification</option>
            <option value="IDENTITY_VERIFIED">{VERIFICATION_LABELS.IDENTITY_VERIFIED}</option>
            <option value="TALENT_VERIFIED">{VERIFICATION_LABELS.TALENT_VERIFIED}</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant={search.featured ? "default" : "outline"}
            aria-pressed={Boolean(search.featured)}
            onClick={() => update({ featured: search.featured ? undefined : true })}
          >
            Featured only
          </Button>
          {hasFilters && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/talent">Clear filters</Link>
            </Button>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "creative" : "creatives"}
          </span>
        </div>

        {data.rows.length === 0 ? (
          <div className="card-stage mt-8 p-10 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-4 font-semibold">No public talent matches yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a broader search — or enter a competition to create your own profile.
            </p>
            <Button asChild className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
              <Link to="/competitions">See competitions</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((t) => (
              <li key={t.id}>
                <TalentCardView talent={t} />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => update({ page: page + 1 })}
            >
              Next
            </Button>
          </nav>
        )}

        <div className="card-stage mt-14 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Coming soon</p>
            <p className="mt-2 font-display text-xl">Find collaborators</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Match by discipline, skills, location, verification and achievements. Connect. Create.
              Collaborate.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/$section" params={{ section: "profile" }}>
              Complete your profile
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}

function TalentCardView({ talent }: { talent: TalentCard }) {
  return (
    <Link
      to="/talent/$handle"
      params={{ handle: talent.handle }}
      className="card-stage card-stage-hover flex h-full flex-col p-5"
    >
      <div className="flex items-center gap-4">
        <TalentAvatar src={talent.avatar_url} name={talent.display_name} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg">{talent.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">@{talent.handle}</p>
          <p className="mt-1 truncate text-sm font-semibold text-primary">
            {talent.primary_discipline || "Creative"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <VerificationBadge status={talent.verification_status} />
        <FeaturedBadge featured={talent.is_featured} />
      </div>
      {talent.bio && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{talent.bio}</p>
      )}
      <div className="mt-auto pt-4">
        {talent.secondary_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {talent.secondary_skills.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full border border-border px-2 py-0.5 text-xs">
                {s}
              </span>
            ))}
          </div>
        )}
        {talent.location && (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {talent.location}
          </p>
        )}
      </div>
    </Link>
  );
}
