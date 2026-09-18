import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";

import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

const BASE_URL = "https://artistrysynk.app/talent-hunt";

function publicSupabase() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          // Opaque sb_ keys are not JWTs; send apikey without the default bearer.
          if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    }),
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const categoryRouteId = "/categories/$slug";
        const competitionRouteId = "/competitions/$slug";
        const wantsCategories = isSitemapRouteIncluded(router.routesById[categoryRouteId]);
        const wantsCompetitions = isSitemapRouteIncluded(router.routesById[competitionRouteId]);

        if (wantsCategories || wantsCompetitions) {
          const supabase = await publicSupabase();
          const pageSize = 1000;

          if (wantsCategories) {
            for (let offset = 0; ; ) {
              const { data, error } = await supabase
                .from("categories")
                .select("slug")
                .eq("is_active", true)
                .order("id")
                .range(offset, offset + pageSize - 1);
              if (error) throw error;
              if (data.length === 0) break;
              for (const row of data) {
                const location = router.buildLocation({
                  to: categoryRouteId,
                  params: { slug: row.slug },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, categoryRouteId);
                if (path) entries.push({ path });
              }
              offset += data.length;
            }
          }

          if (wantsCompetitions) {
            for (let offset = 0; ; ) {
              const { data, error } = await supabase
                .from("competitions")
                .select("slug, status")
                .not("status", "in", "(DRAFT,ARCHIVED)")
                .order("id")
                .range(offset, offset + pageSize - 1);
              if (error) throw error;
              if (data.length === 0) break;
              for (const row of data) {
                const location = router.buildLocation({
                  to: competitionRouteId,
                  params: { slug: row.slug },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, competitionRouteId);
                if (path) entries.push({ path });
              }
              offset += data.length;
            }
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }

        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
