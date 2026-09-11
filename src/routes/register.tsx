import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { useCategoryGroups, useCompetition } from "@/hooks/useCompetition";
import { isRegistrationOpen } from "@/lib/live-data";

const searchSchema = z.object({
  category: z.string().optional(),
  competition: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Register — Zik's Got Talent" },
      {
        name: "description",
        content:
          "Enter Zik's Got Talent in seven steps. Registration is free and creates or connects your ArtistrySynk creative profile.",
      },
      { property: "og:title", content: "Register — Zik's Got Talent" },
      {
        property: "og:description",
        content: "Free entry in seven steps, with a free ArtistrySynk creative profile included.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { category, competition: competitionSlug } = Route.useSearch();
  const competition = useCompetition(competitionSlug);
  const groups = useCategoryGroups(competition.data?.id, true);

  if (competition.isLoading) {
    return (
      <PublicShell>
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Loading the entry form…</p>
        </section>
      </PublicShell>
    );
  }

  if (!competition.data) {
    return (
      <PublicShell>
        <PageHeader
          eyebrow="Registration"
          title="No competition is open"
          intro="There is no competition accepting entries right now. Check the announcements for the next season."
        />
      </PublicShell>
    );
  }

  const open = isRegistrationOpen(competition.data);

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.data.name}
        title="Register your talent"
        intro="Seven steps, about ten minutes. Your registration creates or connects your permanent creative identity."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        {!open && (
          <p className="mb-8 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            Entries for {competition.data.name} are not open right now. You can still look through
            the form, but submissions are only accepted inside the entry window.
          </p>
        )}
        {groups.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading categories…</p>
        ) : (
          <RegistrationWizard
            competition={competition.data}
            groups={groups.data ?? []}
            initialCategory={category ?? ""}
          />
        )}
      </section>
    </PublicShell>
  );
}
