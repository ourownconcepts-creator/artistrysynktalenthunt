import { createFileRoute } from "@tanstack/react-router";

import { CategoryGrid } from "@/components/competition/CategoryGrid";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { listCategoryGroups } from "@/lib/competition-data";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "Talent Categories — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Music, performance, visual, digital and beyond — explore every Zik's Got Talent category and its audition brief.",
      },
      { property: "og:title", content: "Talent Categories — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Explore every Zik's Got Talent category and its audition brief.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  const groups = listCategoryGroups();

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Choose your lane"
        title="Talent categories"
        intro="Categories are configured per competition by admins — new categories can be added for any future season without a code change."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <CategoryGrid groups={groups} />
      </section>
    </PublicShell>
  );
}
