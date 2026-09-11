import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCategoryGroups, useCompetition } from "@/hooks/useCompetition";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Talent Categories — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Every Zik's Got Talent category and what you need to submit — music, performance, visual, digital and beyond.",
      },
      { property: "og:title", content: "Talent Categories — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Explore every Zik's Got Talent category and its submission brief.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const competition = useCompetition();
  const groups = useCategoryGroups(competition.data?.id, true);

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.data?.name ?? "Choose your lane"}
        title="Talent categories"
        intro="Categories, their briefs and what each one asks you to submit are configured by admins for every competition."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        {groups.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        ) : groups.data?.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groups.data.map((group) => (
              <article key={group.id} className="card-stage card-stage-hover p-6">
                <h2 className="text-2xl">{group.name}</h2>
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
        ) : (
          <p className="text-sm text-muted-foreground">
            No categories are open yet. They appear here as soon as an admin activates them.
          </p>
        )}
      </section>
    </PublicShell>
  );
}
