import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { Button } from "@/components/ui/button";
import { findCategory, findGroupForCategory } from "@/domain/catalogue";

export const Route = createFileRoute("/categories/$slug")({
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    const group = findGroupForCategory(params.slug);
    if (!category || !group) throw notFound();
    return { category, group };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Category unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { category, group } = loaderData;
    const description = `${category.blurb} Audition brief: ${category.auditionHint}`;
    return {
      meta: [
        { title: `${category.name} — ${group.name} — Zik's Got Talent` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${category.name} — Zik's Got Talent` },
        { property: "og:description", content: description.slice(0, 155) },
      ],
    };
  },
  component: CategoryDetail,
});

function CategoryDetail() {
  const { category, group } = Route.useLoaderData();

  return (
    <PublicShell>
      <PageHeader eyebrow={group.name} title={category.name} intro={category.blurb}>
        <Button asChild className="bg-gold text-primary-foreground hover:opacity-90">
          <Link to="/register" search={{ category: category.slug }}>
            Enter {category.name}
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </PageHeader>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <article className="card-stage p-7">
          <h2 className="text-2xl">Audition brief</h2>
          <p className="mt-3 text-muted-foreground">{category.auditionHint}</p>
        </article>
        <article className="card-stage p-7">
          <h2 className="text-2xl">Other {group.name} categories</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {group.categories
              .filter((c) => c.slug !== category.slug)
              .map((sibling) => (
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
        </article>
      </section>
    </PublicShell>
  );
}
