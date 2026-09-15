import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PublicShell } from "@/components/site/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy | ZIK’S GOT TALENT" },
      {
        name: "description",
        content:
          "How ZIK’S GOT TALENT handles contestant details, application information, audition media and connected creative identities.",
      },
      { property: "og:title", content: "Privacy | ZIK’S GOT TALENT" },
      {
        property: "og:description",
        content: "How contestant data, audition media and identity are handled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="Legal"
        title="Privacy"
        intro="What we collect, who can see it, and what stays private."
      />
      <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-16 text-sm text-muted-foreground sm:px-6">
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-warning">
          Draft summary only. Final privacy policy must be supplied before entries open publicly.
        </p>
        <Section title="What stays private">
          Contact details, date of birth, guardian consent records, the audition link you submit,
          judge scores and comments, and moderation notes. None of this appears on a public
          contestant profile unless you mark your audition public.
        </Section>
        <Section title="Audition links">
          Auditions are entered as a link to video you host elsewhere &mdash; YouTube, Google Drive,
          Vimeo or similar. ZIK&rsquo;S GOT TALENT stores the link, not the file, and keeps the link
          itself out of public view unless you choose to make your audition public. Who else can open
          that video depends on the site hosting it and the sharing permissions you set there, which
          are outside our control. If your audition should stay private, keep it unlisted or
          restricted on the hosting site.
        </Section>
        <Section title="What becomes public">
          Only your creative name, category, location, short bio, approved media, competition stage
          and badges.
        </Section>
        <Section title="Identity">
          ArtistrySynk supports your creative identity and connection to the wider creative
          community beyond ZIK&rsquo;S GOT TALENT.
        </Section>
        <Section title="Access controls">
          Access is enforced on the server and at the database row level. Every administrative and
          judging action is recorded in an append-only audit log.
        </Section>
      </section>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl text-foreground">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
