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
  staticData: { sitemap: true },
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Register for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        name: "description",
        content:
          "Register for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0, choose your talent category and showcase your ability in the ArtistrySynk campus-wide competition.",
      },
      { property: "og:title", content: "Register for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0" },
      {
        property: "og:description",
        content: "Your stage starts here. Choose your category and enter ARTISTRYSYNK CREATIVES TALENT HUNT 1.0.",
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
        title="Your stage starts here"
        intro="Choose your category, tell us about your talent and complete your entry for ARTISTRYSYNK CREATIVES TALENT HUNT 1.0."
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
