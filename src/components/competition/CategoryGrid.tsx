import { Link } from "@tanstack/react-router";

import type { CategoryGroup } from "@/domain/types";

export function CategoryGrid({ groups }: { groups: CategoryGroup[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
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
  );
}
