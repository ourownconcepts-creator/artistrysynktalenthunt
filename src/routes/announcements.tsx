import { createFileRoute } from "@tanstack/react-router";
import { Pin } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { usePublicAnnouncements } from "@/hooks/useCompetition";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "News & Announcements | ZIK’S GOT TALENT" },
      {
        name: "description",
        content:
          "Official ZIK’S GOT TALENT 1.0 updates from the University of Ibadan talent competition, including entries, auditions, shortlists and results.",
      },
      { property: "og:title", content: "News & Announcements | ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "Follow official ZIK’S GOT TALENT 1.0 news, competition updates and results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Announcements,
});

function Announcements() {
  const announcements = usePublicAnnouncements();

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Official updates"
        title="Announcements"
        intro="Follow entry updates, audition news, competition highlights, shortlists and results from ZIK’S GOT TALENT 1.0."
      />
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        {announcements.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading announcements…</p>
        ) : announcements.data?.length ? (
          <div className="space-y-4">
            {announcements.data.map((announcement) => (
              <article key={announcement.id} className="card-stage p-6">
                <div className="flex items-center gap-3">
                  <time className="eyebrow" dateTime={announcement.published_at}>
                    {new Date(announcement.published_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  {announcement.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Pin className="size-3" /> Pinned
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl">{announcement.title}</h2>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {announcement.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No announcements have been published yet.</p>
        )}
      </section>
    </PublicShell>
  );
}
