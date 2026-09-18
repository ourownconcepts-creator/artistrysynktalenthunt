import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCategoryGroups, useCompetition } from "@/hooks/useCompetition";

export const Route = createFileRoute("/categories/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Talent Categories | ArtistrySynk Creatives Talent Hunt 1.0" },
      {
        name: "description",
        content:
          "Explore ArtistrySynk Creatives Talent Hunt categories including singing, dancing, comedy, spoken word, rap, acting, instrumentals, cultural performance, fashion and more.",
      },
      { property: "og:title", content: "Talent Categories | ArtistrySynk Creatives Talent Hunt 1.0" },
      {
        property: "og:description",
        content: "Find the category that fits your talent and discover what to prepare for your entry.",
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
        eyebrow="Discover your talent"
        title="Showcase your gift"
        intro="Choose from singing, dancing, comedy, spoken word, rap, acting, instrumentals, cultural performance, fashion and other creative talents."
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
            No categories are open yet. Check back for the official ArtistrySynk Creatives Talent Hunt 1.0 entry categories.
          </p>
        )}
      </section>
    </PublicShell>
  );
}
