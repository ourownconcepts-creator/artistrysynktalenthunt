import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { useCategoryGroups, useCompetition } from "@/hooks/useCompetition";
import { REQUIREMENT_KIND_LABELS, fetchCategoryBySlug, fetchRequirements } from "@/lib/live-data";

function categoryTitleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/categories/$slug")({
  staticData: { sitemap: true },
  head: ({ params }) => {
    const name = categoryTitleFromSlug(params.slug);
    const url = `https://artistrysynk.app/talent-hunt/categories/${params.slug}`;
    return {
      meta: [
        { title: `${name} Category | ARTISTRYSYNK CREATIVES TALENT HUNT` },
        {
          name: "description",
          content: `Explore the ${name} category at ARTISTRYSYNK CREATIVES TALENT HUNT and see what to prepare for your ArtistrySynk talent competition entry.`,
        },
        { property: "og:title", content: `${name} Category — ARTISTRYSYNK CREATIVES TALENT HUNT` },
        {
          property: "og:description",
          content: `What the ${name} category is looking for and exactly what to submit for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0.`,
        },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CategoryDetail,
});

function CategoryDetail() {
  const { slug } = Route.useParams();
  const competition = useCompetition();
  const category = useQuery({
    queryKey: ["category", slug],
    queryFn: () => fetchCategoryBySlug(slug),
  });
  const requirements = useQuery({
    queryKey: ["requirements", category.data?.id],
    queryFn: () => fetchRequirements(category.data!.id, true),
    enabled: Boolean(category.data?.id),
  });
  const groups = useCategoryGroups(competition.data?.id, true);

  if (category.isLoading) {
    return (
      <PublicShell>
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading category…</p>
        </section>
      </PublicShell>
    );
  }

  if (!category.data) {
    return (
      <PublicShell>
        <PageHeader
          eyebrow="Category"
          title="Category not found"
          intro="This category is not part of the current competition."
        />
        <section className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
          <Button asChild variant="outline">
            <Link to="/categories">See all categories</Link>
          </Button>
        </section>
      </PublicShell>
    );
  }

  const data = category.data;
  const groupName = data.category_groups?.name ?? "Talent";
  const siblings =
    groups.data?.find((g) => g.id === data.group_id)?.categories.filter((c) => c.slug !== slug) ??
    [];

  return (
    <PublicShell>
      <PageHeader eyebrow={groupName} title={data.name} intro={data.blurb}>
        {data.is_active ? (
          <Button asChild className="bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/register" search={{ category: data.slug }}>
              Enter {data.name}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        ) : (
          <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            This category is closed to new entries. Existing entrants and their profiles are
            unaffected.
          </p>
        )}
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <article className="card-stage p-7">
          <h2 className="text-2xl">What to submit</h2>
          {requirements.data?.length ? (
            <ul className="mt-4 space-y-4">
              {requirements.data.map((requirement) => (
                <li key={requirement.id}>
                  <p className="text-sm font-semibold">
                    {requirement.label}
                    <span className="ml-2 text-xs font-normal uppercase tracking-widest text-muted-foreground">
                      {REQUIREMENT_KIND_LABELS[requirement.kind]}
                      {requirement.is_required ? " · required" : " · optional"}
                    </span>
                  </p>
                  {requirement.help_text && (
                    <p className="mt-1 text-sm text-muted-foreground">{requirement.help_text}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">{data.audition_hint}</p>
          )}
          {data.eligibility && (
            <p className="mt-6 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Eligibility:</span> {data.eligibility}
            </p>
          )}
        </article>

        <article className="card-stage p-7">
          <h2 className="text-2xl">Other {groupName} categories</h2>
          {siblings.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link
                    to="/categories/$slug"
                    params={{ slug: sibling.slug }}
                    className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {sibling.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              This is the only category in this group right now.
            </p>
          )}
        </article>
      </section>
    </PublicShell>
  );
}
