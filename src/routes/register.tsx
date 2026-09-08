import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import { PageHeader, PublicShell } from "@/components/site/PublicShell";
import { getFeaturedCompetition, listCategoryGroups } from "@/lib/competition-data";

const searchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Register — Zik's Got Talent Season One" },
      {
        name: "description",
        content:
          "Enter Zik's Got Talent in seven steps. Registration is free and creates or connects your ArtistrySynk creative profile.",
      },
      { property: "og:title", content: "Register — Zik's Got Talent Season One" },
      {
        property: "og:description",
        content: "Free entry in seven steps, with a free ArtistrySynk creative profile included.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { category } = Route.useSearch();
  const competition = getFeaturedCompetition();
  const groups = listCategoryGroups();

  return (
    <PublicShell>
      <PageHeader
        eyebrow={competition.name}
        title="Register your talent"
        intro="Seven steps, about ten minutes. Your registration creates or connects your permanent creative identity."
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <RegistrationWizard
          competition={competition}
          groups={groups}
          initialCategory={category ?? ""}
        />
      </section>
    </PublicShell>
  );
}
