import { createFileRoute } from "@tanstack/react-router";
import { Pin } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { usePublicAnnouncements } from "@/hooks/useCompetition";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Official Zik's Got Talent announcements: entry windows, audition briefs, sponsors, shortlists and results.",
      },
      { property: "og:title", content: "Announcements — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Official Zik's Got Talent competition announcements and updates.",
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
        intro="Every announcement is published by staff and targeted at the public, contestants or judges."
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
