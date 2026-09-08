import { createFileRoute } from "@tanstack/react-router";
import { Pin } from "lucide-react";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { listAnnouncements } from "@/lib/competition-data";

export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Official Zik's Got Talent announcements: registration windows, audition briefs, sponsors, shortlists and results.",
      },
      { property: "og:title", content: "Announcements — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Official Zik's Got Talent competition announcements and updates.",
      },
    ],
  }),
  component: Announcements,
});

function Announcements() {
  const announcements = listAnnouncements("PUBLIC");

  return (
    <PublicShell>
      <PageHeader
        eyebrow="Official updates"
        title="Announcements"
        intro="Every announcement is published by an admin and can be targeted at the public, contestants or judges."
      />
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="card-stage p-6">
              <div className="flex items-center gap-3">
                <time className="eyebrow" dateTime={announcement.publishedAt}>
                  {new Date(announcement.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
                {announcement.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                    <Pin className="size-3" /> Pinned
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-2xl">{announcement.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{announcement.body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
