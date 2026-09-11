import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AreaField, Field, Panel, SelectField, ToggleField } from "@/components/admin/Field";
import { Button } from "@/components/ui/button";
import { ADMIN_SECTIONS } from "@/domain/navigation";
import { useCompetition } from "@/hooks/useCompetition";
import {
  type AnnouncementRow,
  type BadgeRow,
  type CategoryRow,
  type CriterionRow,
  type RequirementKind,
  REQUIREMENT_KINDS,
  REQUIREMENT_KIND_LABELS,
  type RequirementRow,
  type RoundRow,
  SPONSOR_PLACEMENTS,
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
  type SponsorRow,
  deleteRequirement,
  fetchAuditFeed,
  fetchBadges,
  fetchCategories,
  fetchCategoryGroups,
  fetchCriteria,
  fetchRequirements,
  fetchRounds,
  fetchSponsors,
  fetchAnnouncements,
  saveAnnouncement,
  saveBadge,
  saveCategory,
  saveCriterion,
  saveRequirement,
  saveRound,
  saveSponsor,
  setCategoryActive,
  slugifyHandle,
} from "@/lib/live-data";

export const Route = createFileRoute("/admin/$section")({
  loader: ({ params }) => {
    const section = ADMIN_SECTIONS.find((s) => s.slug === params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.section.label} — Admin` : "Unavailable" },
      { name: "robots", content: "noindex" },
      { name: "description", content: loaderData?.section.summary ?? "Admin" },
      { property: "og:title", content: loaderData?.section.label ?? "Admin" },
      { property: "og:description", content: loaderData?.section.summary ?? "Admin" },
    ],
  }),
  component: AdminSectionPage,
});

function AdminSectionPage() {
  const { section } = Route.useLoaderData();
  const competition = useCompetition();
  const competitionId = competition.data?.id ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Admin · requires {section.permission}</p>
        <h1 className="mt-2 text-3xl">{section.label}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{section.summary}</p>
        {competition.data && (
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            Current competition: {competition.data.name}
          </p>
        )}
      </header>

      {section.slug === "categories" && <CategoriesPanel competitionId={competitionId} />}
      {section.slug === "rounds" && <RoundsPanel competitionId={competitionId} />}
      {section.slug === "scoring" && <CriteriaPanel competitionId={competitionId} />}
      {section.slug === "sponsors" && <SponsorsPanel competitionId={competitionId} />}
      {section.slug === "announcements" && <AnnouncementsPanel competitionId={competitionId} />}
      {section.slug === "badges" && <BadgesPanel competitionId={competitionId} />}
      {section.slug === "audit-logs" && <AuditPanel />}

      {section.phase === "LATER" && section.slug !== "audit-logs" && (
        <div className="card-stage p-5">
          <p className="text-sm text-muted-foreground">
            This area is intentionally not built yet. Its data model, permissions and audit rules
            are already defined, so it can be added without reshaping the foundation.
          </p>
        </div>
      )}
    </div>
  );
}

function useSaver(keys: string[], label: string) {
  const client = useQueryClient();
  return {
    onSuccess: () => {
      keys.forEach((key) => void client.invalidateQueries({ queryKey: [key] }));
      toast.success(`${label} saved`);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : `${label} could not be saved`),
  };
}

/* ---------------------------- Categories ---------------------------- */

function CategoriesPanel({ competitionId }: { competitionId: string | null }) {
  const groups = useQuery({ queryKey: ["category-groups"], queryFn: fetchCategoryGroups });
  const categories = useQuery({
    queryKey: ["admin-categories", competitionId],
    queryFn: () => fetchCategories({ competitionId, activeOnly: false }),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<CategoryRow>>({});
  const handlers = useSaver(["admin-categories", "categories"], "Category");
  const save = useMutation({ mutationFn: saveCategory, ...handlers });
  const archive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setCategoryActive(id, active),
    ...handlers,
  });

  const groupOptions = (groups.data ?? []).map((group) => ({
    value: group.id,
    label: group.name,
  }));

  return (
    <div className="space-y-5">
      <Panel
        title="Talent categories"
        description="Categories are archived, never deleted, because past entries depend on them."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                {["Group", "Category", "Order", "Active", ""].map((head) => (
                  <th key={head} className="px-3 py-2.5 font-semibold">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(categories.data ?? []).map((category) => (
                <tr key={category.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {category.category_groups?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{category.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{category.sort_order}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {category.is_active ? "Yes" : "Archived"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDraft(category)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          archive.mutate({ id: category.id, active: !category.is_active })
                        }
                      >
                        {category.is_active ? "Archive" : "Restore"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(selected === category.id ? null : category.id)}
                      >
                        Requirements
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && <RequirementsPanel categoryId={selected} />}

      <Panel title={draft.id ? "Edit category" : "New category"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Group"
            value={draft.group_id ?? groupOptions[0]?.value ?? ""}
            onChange={(value) => setDraft({ ...draft, group_id: value })}
            options={groupOptions}
          />
          <Field
            label="Name"
            value={draft.name ?? ""}
            onChange={(value) =>
              setDraft({
                ...draft,
                name: value,
                slug: draft.id ? (draft.slug ?? "") : slugifyHandle(value),
              })
            }
          />
          <Field
            label="Slug"
            value={draft.slug ?? ""}
            onChange={(value) => setDraft({ ...draft, slug: value })}
          />
          <Field
            label="Order"
            type="number"
            value={String(draft.sort_order ?? 0)}
            onChange={(value) => setDraft({ ...draft, sort_order: Number(value) })}
          />
          <AreaField
            label="Blurb"
            value={draft.blurb ?? ""}
            onChange={(value) => setDraft({ ...draft, blurb: value })}
          />
          <AreaField
            label="Eligibility notes"
            value={draft.eligibility ?? ""}
            onChange={(value) => setDraft({ ...draft, eligibility: value })}
          />
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            disabled={save.isPending}
            onClick={() => {
              if (!draft.name || !draft.slug || !(draft.group_id ?? groupOptions[0]?.value)) {
                toast.error("Group, name and slug are required");
                return;
              }
              save.mutate(
                {
                  ...draft,
                  competition_id: draft.competition_id ?? null,
                  group_id: (draft.group_id ?? groupOptions[0]!.value) as string,
                  name: draft.name,
                  slug: draft.slug,
                } as CategoryRow,
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save category
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

function RequirementsPanel({ categoryId }: { categoryId: string }) {
  const requirements = useQuery({
    queryKey: ["requirements", categoryId],
    queryFn: () => fetchRequirements(categoryId),
  });
  const [draft, setDraft] = useState<Partial<RequirementRow>>({});
  const handlers = useSaver(["requirements"], "Requirement");
  const save = useMutation({ mutationFn: saveRequirement, ...handlers });
  const remove = useMutation({ mutationFn: deleteRequirement, ...handlers });

  return (
    <Panel
      title="Submission requirements"
      description="What this category asks entrants to provide. Registration builds its fields from this list."
    >
      <ul className="divide-y divide-border/50 text-sm">
        {(requirements.data ?? []).map((requirement) => (
          <li key={requirement.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="font-semibold">{requirement.label}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {REQUIREMENT_KIND_LABELS[requirement.kind]}
              {requirement.is_required ? " · required" : " · optional"}
              {requirement.is_active ? "" : " · archived"}
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setDraft(requirement)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(requirement.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
        {(requirements.data ?? []).length === 0 && (
          <li className="py-3 text-muted-foreground">No requirements configured.</li>
        )}
      </ul>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Requirement label"
          value={draft.label ?? ""}
          onChange={(value) =>
            setDraft({
              ...draft,
              label: value,
              key: draft.id ? (draft.key ?? "") : slugifyHandle(value),
            })
          }
        />
        <Field
          label="Key"
          value={draft.key ?? ""}
          onChange={(value) => setDraft({ ...draft, key: value })}
          hint="Stored with each entry. Changing it hides previous answers."
        />
        <SelectField
          label="Kind"
          value={draft.kind ?? "URL"}
          onChange={(value) => setDraft({ ...draft, kind: value as RequirementKind })}
          options={REQUIREMENT_KINDS.map((kind) => ({
            value: kind,
            label: REQUIREMENT_KIND_LABELS[kind],
          }))}
        />
        <Field
          label="Order"
          type="number"
          value={String(draft.sort_order ?? 0)}
          onChange={(value) => setDraft({ ...draft, sort_order: Number(value) })}
        />
        <AreaField
          label="Help text"
          value={draft.help_text ?? ""}
          onChange={(value) => setDraft({ ...draft, help_text: value })}
        />
        <div className="space-y-3">
          <ToggleField
            label="Required"
            checked={draft.is_required ?? true}
            onChange={(checked) => setDraft({ ...draft, is_required: checked })}
          />
          <ToggleField
            label="Active"
            checked={draft.is_active ?? true}
            onChange={(checked) => setDraft({ ...draft, is_active: checked })}
          />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <Button
          className="bg-gold text-primary-foreground hover:opacity-90"
          onClick={() => {
            if (!draft.label || !draft.key) {
              toast.error("Label and key are required");
              return;
            }
            save.mutate(
              {
                ...draft,
                category_id: categoryId,
                key: draft.key,
                label: draft.label,
                kind: draft.kind ?? "URL",
              },
              { onSuccess: () => setDraft({}) },
            );
          }}
        >
          Save requirement
        </Button>
        {draft.id && (
          <Button variant="outline" onClick={() => setDraft({})}>
            Cancel
          </Button>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------ Rounds ------------------------------ */

function RoundsPanel({ competitionId }: { competitionId: string | null }) {
  const rounds = useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => fetchRounds(competitionId!),
    enabled: Boolean(competitionId),
  });
  const [draft, setDraft] = useState<Partial<RoundRow>>({});
  const save = useMutation({ mutationFn: saveRound, ...useSaver(["rounds"], "Round") });

  if (!competitionId) return <NoCompetition />;

  return (
    <div className="space-y-5">
      <Panel title="Round structure" description="Sequence, windows, judging and voting per round.">
        <ul className="divide-y divide-border/50 text-sm">
          {(rounds.data ?? []).map((round) => (
            <li key={round.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-display text-lg text-gold">
                {String(round.sequence).padStart(2, "0")}
              </span>
              <span className="font-semibold">{round.name}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {round.advancement_rule}
                {round.judging_enabled ? " · judged" : ""}
                {round.voting_enabled ? " · voting" : ""}
                {round.is_active ? "" : " · inactive"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setDraft(round)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={draft.id ? "Edit round" : "New round"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={draft.name ?? ""}
            onChange={(value) =>
              setDraft({
                ...draft,
                name: value,
                slug: draft.id ? (draft.slug ?? "") : slugifyHandle(value),
              })
            }
          />
          <Field
            label="Slug"
            value={draft.slug ?? ""}
            onChange={(value) => setDraft({ ...draft, slug: value })}
          />
          <Field
            label="Sequence"
            type="number"
            value={String(draft.sequence ?? 1)}
            onChange={(value) => setDraft({ ...draft, sequence: Number(value) })}
          />
          <Field
            label="Advancement rule"
            value={draft.advancement_rule ?? "MANUAL"}
            onChange={(value) => setDraft({ ...draft, advancement_rule: value })}
            hint="For example MANUAL or TOP_N:50."
          />
          <Field
            label="Opens"
            type="datetime-local"
            value={toLocal(draft.opens_at)}
            onChange={(value) => setDraft({ ...draft, opens_at: fromLocal(value) })}
          />
          <Field
            label="Closes"
            type="datetime-local"
            value={toLocal(draft.closes_at)}
            onChange={(value) => setDraft({ ...draft, closes_at: fromLocal(value) })}
          />
          <Field
            label="Judging opens"
            type="datetime-local"
            value={toLocal(draft.judging_opens_at)}
            onChange={(value) => setDraft({ ...draft, judging_opens_at: fromLocal(value) })}
            hint="Judges cannot score before this time."
          />
          <Field
            label="Judging closes"
            type="datetime-local"
            value={toLocal(draft.judging_closes_at)}
            onChange={(value) => setDraft({ ...draft, judging_closes_at: fromLocal(value) })}
          />
          <Field
            label="Score submission deadline"
            type="datetime-local"
            value={toLocal(draft.score_deadline_at)}
            onChange={(value) => setDraft({ ...draft, score_deadline_at: fromLocal(value) })}
            hint="After this time the server refuses new or changed scores."
          />
          <AreaField
            label="Description"
            value={draft.description ?? ""}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <AreaField
            label="Submission requirements for this round"
            value={draft.submission_requirements ?? ""}
            onChange={(value) => setDraft({ ...draft, submission_requirements: value })}
          />
          <ToggleField
            label="Judging enabled"
            checked={draft.judging_enabled ?? true}
            onChange={(checked) => setDraft({ ...draft, judging_enabled: checked })}
          />
          <ToggleField
            label="Public voting enabled"
            checked={draft.voting_enabled ?? false}
            onChange={(checked) => setDraft({ ...draft, voting_enabled: checked })}
          />
          <ToggleField
            label="Active"
            checked={draft.is_active ?? true}
            onChange={(checked) => setDraft({ ...draft, is_active: checked })}
          />
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => {
              if (!draft.name || !draft.slug) {
                toast.error("Name and slug are required");
                return;
              }
              save.mutate(
                {
                  ...draft,
                  competition_id: competitionId,
                  name: draft.name,
                  slug: draft.slug,
                },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save round
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------- Criteria ----------------------------- */

function CriteriaPanel({ competitionId }: { competitionId: string | null }) {
  const rounds = useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => fetchRounds(competitionId!),
    enabled: Boolean(competitionId),
  });
  const criteria = useQuery({
    queryKey: ["admin-criteria", competitionId],
    queryFn: () => fetchCriteria(competitionId!, { activeOnly: false }),
    enabled: Boolean(competitionId),
  });
  const [draft, setDraft] = useState<Partial<CriterionRow>>({});
  const save = useMutation({
    mutationFn: saveCriterion,
    ...useSaver(["admin-criteria", "criteria"], "Criterion"),
  });

  if (!competitionId) return <NoCompetition />;

  const totalWeight = (criteria.data ?? [])
    .filter((c) => c.is_active)
    .reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="space-y-5">
      <Panel
        title="Scoring criteria"
        description={`Active weights total ${totalWeight}%. Criteria can apply to every round or a single round.`}
      >
        <ul className="divide-y divide-border/50 text-sm">
          {(criteria.data ?? []).map((criterion) => (
            <li key={criterion.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-semibold">{criterion.name}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                max {criterion.max_score} · {criterion.weight}% ·{" "}
                {criterion.round_id
                  ? ((rounds.data ?? []).find((r) => r.id === criterion.round_id)?.name ??
                    "one round")
                  : "all rounds"}
                {criterion.is_active ? "" : " · archived"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setDraft(criterion)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={draft.id ? "Edit criterion" : "New criterion"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Criterion name"
            value={draft.name ?? ""}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <SelectField
            label="Applies to"
            value={draft.round_id ?? ""}
            onChange={(value) => setDraft({ ...draft, round_id: value || null })}
            options={[
              { value: "", label: "All rounds" },
              ...(rounds.data ?? []).map((round) => ({ value: round.id, label: round.name })),
            ]}
          />
          <Field
            label="Maximum score"
            type="number"
            value={String(draft.max_score ?? 10)}
            onChange={(value) => setDraft({ ...draft, max_score: Number(value) })}
          />
          <Field
            label="Weight (%)"
            type="number"
            value={String(draft.weight ?? 0)}
            onChange={(value) => setDraft({ ...draft, weight: Number(value) })}
          />
          <Field
            label="Order"
            type="number"
            value={String(draft.sort_order ?? 0)}
            onChange={(value) => setDraft({ ...draft, sort_order: Number(value) })}
          />
          <ToggleField
            label="Active"
            checked={draft.is_active ?? true}
            onChange={(checked) => setDraft({ ...draft, is_active: checked })}
          />
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => {
              if (!draft.name) {
                toast.error("A name is required");
                return;
              }
              save.mutate(
                { ...draft, competition_id: competitionId, name: draft.name },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save criterion
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------- Sponsors ----------------------------- */

function SponsorsPanel({ competitionId }: { competitionId: string | null }) {
  const sponsors = useQuery({
    queryKey: ["admin-sponsors"],
    queryFn: () => fetchSponsors({ activeOnly: false }),
  });
  const [draft, setDraft] = useState<Partial<SponsorRow>>({});
  const save = useMutation({
    mutationFn: saveSponsor,
    ...useSaver(["admin-sponsors", "sponsors"], "Sponsor"),
  });

  const placements = draft.placements ?? ["FOOTER"];

  return (
    <div className="space-y-5">
      <Panel title="Sponsors" description="Tiers, placements and order are fully configurable.">
        <ul className="divide-y divide-border/50 text-sm">
          {(sponsors.data ?? []).map((sponsor) => (
            <li key={sponsor.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-semibold">{sponsor.name}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {SPONSOR_TIER_LABELS[sponsor.tier] ?? sponsor.tier} ·{" "}
                {sponsor.placements.join(", ").toLowerCase()}
                {sponsor.is_active ? "" : " · hidden"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setDraft(sponsor)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={draft.id ? "Edit sponsor" : "New sponsor"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sponsor name"
            value={draft.name ?? ""}
            onChange={(value) => setDraft({ ...draft, name: value })}
          />
          <SelectField
            label="Tier"
            value={draft.tier ?? "PARTNER"}
            onChange={(value) => setDraft({ ...draft, tier: value })}
            options={SPONSOR_TIERS.map((tier) => ({
              value: tier,
              label: SPONSOR_TIER_LABELS[tier] ?? tier,
            }))}
          />
          <Field
            label="Website"
            value={draft.website ?? ""}
            onChange={(value) => setDraft({ ...draft, website: value })}
          />
          <Field
            label="Logo URL"
            value={draft.logo_url ?? ""}
            onChange={(value) => setDraft({ ...draft, logo_url: value || null })}
          />
          <AreaField
            label="Description"
            value={draft.description ?? ""}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Placements</p>
            {SPONSOR_PLACEMENTS.map((placement) => (
              <ToggleField
                key={placement}
                label={placement.replace("_", " ").toLowerCase()}
                checked={placements.includes(placement)}
                onChange={(checked) =>
                  setDraft({
                    ...draft,
                    placements: checked
                      ? [...placements, placement]
                      : placements.filter((p) => p !== placement),
                  })
                }
              />
            ))}
          </div>
          <Field
            label="Order"
            type="number"
            value={String(draft.sort_order ?? 0)}
            onChange={(value) => setDraft({ ...draft, sort_order: Number(value) })}
          />
          <div className="space-y-3">
            <ToggleField
              label="Visible"
              checked={draft.is_active ?? true}
              onChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />
            <ToggleField
              label="Only this competition"
              checked={Boolean(draft.competition_id)}
              onChange={(checked) =>
                setDraft({ ...draft, competition_id: checked ? competitionId : null })
              }
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => {
              if (!draft.name) {
                toast.error("A sponsor name is required");
                return;
              }
              save.mutate(
                { ...draft, name: draft.name, tier: draft.tier ?? "PARTNER", placements },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save sponsor
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------- Announcements -------------------------- */

function AnnouncementsPanel({ competitionId }: { competitionId: string | null }) {
  const announcements = useQuery({
    queryKey: ["admin-announcements", competitionId],
    queryFn: () => fetchAnnouncements({ competitionId, includeUnpublished: true }),
  });
  const rounds = useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => fetchRounds(competitionId!),
    enabled: Boolean(competitionId),
  });
  const [draft, setDraft] = useState<Partial<AnnouncementRow>>({});
  const save = useMutation({
    mutationFn: saveAnnouncement,
    ...useSaver(["admin-announcements", "announcements"], "Announcement"),
  });
  const email = useMutation({
    mutationFn: (announcementId: string) =>
      sendAnnouncementEmail({ data: { announcementId } }),
    onSuccess: (result) => {
      if (!result.configured) {
        toast.error("Email sending is not configured yet.");
      } else if (result.sent === 0) {
        toast.error("No contestant email addresses were available.");
      } else {
        toast.success(`Emailed ${result.sent} contestant${result.sent === 1 ? "" : "s"}`);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The emails could not be sent."),
  });

  return (
    <div className="space-y-5">
      <Panel title="Announcements" description="Target the public, contestants or judges.">
        <ul className="divide-y divide-border/50 text-sm">
          {(announcements.data ?? []).map((announcement) => (
            <li key={announcement.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-semibold">{announcement.title}</span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {announcement.audience.toLowerCase()}
                {announcement.is_pinned ? " · pinned" : ""}
                {announcement.is_published ? "" : " · draft"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setDraft(announcement)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={draft.id ? "Edit announcement" : "New announcement"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            value={draft.title ?? ""}
            onChange={(value) => setDraft({ ...draft, title: value })}
          />
          <SelectField
            label="Audience"
            value={draft.audience ?? "PUBLIC"}
            onChange={(value) => setDraft({ ...draft, audience: value })}
            options={[
              { value: "PUBLIC", label: "Public" },
              { value: "CONTESTANTS", label: "Contestants" },
              { value: "JUDGES", label: "Judges" },
            ]}
          />
          <SelectField
            label="Round"
            value={draft.round_id ?? ""}
            onChange={(value) => setDraft({ ...draft, round_id: value || null })}
            options={[
              { value: "", label: "Whole competition" },
              ...(rounds.data ?? []).map((round) => ({ value: round.id, label: round.name })),
            ]}
          />
          <Field
            label="Publish at"
            type="datetime-local"
            value={toLocal(draft.scheduled_for)}
            onChange={(value) => setDraft({ ...draft, scheduled_for: fromLocal(value) })}
            hint="Leave empty to publish immediately."
          />
          <AreaField
            label="Body"
            rows={5}
            value={draft.body ?? ""}
            onChange={(value) => setDraft({ ...draft, body: value })}
          />
          <div className="space-y-3">
            <ToggleField
              label="Published"
              checked={draft.is_published ?? true}
              onChange={(checked) => setDraft({ ...draft, is_published: checked })}
            />
            <ToggleField
              label="Pinned"
              checked={draft.is_pinned ?? false}
              onChange={(checked) => setDraft({ ...draft, is_pinned: checked })}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => {
              if (!draft.title || !draft.body) {
                toast.error("Title and body are required");
                return;
              }
              save.mutate(
                {
                  ...draft,
                  competition_id: draft.competition_id ?? competitionId,
                  title: draft.title,
                  body: draft.body,
                  audience: draft.audience ?? "PUBLIC",
                },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save announcement
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------ Badges ------------------------------ */

function BadgesPanel({ competitionId }: { competitionId: string | null }) {
  const badges = useQuery({ queryKey: ["admin-badges"], queryFn: fetchBadges });
  const [draft, setDraft] = useState<Partial<BadgeRow>>({});
  const save = useMutation({ mutationFn: saveBadge, ...useSaver(["admin-badges"], "Badge") });

  return (
    <div className="space-y-5">
      <Panel title="Badges" description="Recognition badges awarded to contestants.">
        <ul className="divide-y divide-border/50 text-sm">
          {(badges.data ?? []).map((badge) => (
            <li key={badge.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="font-semibold">{badge.name}</span>
              <span className="text-xs text-muted-foreground">{badge.description}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setDraft(badge)}
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={draft.id ? "Edit badge" : "New badge"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Badge name"
            value={draft.name ?? ""}
            onChange={(value) =>
              setDraft({
                ...draft,
                name: value,
                slug: draft.id ? (draft.slug ?? "") : slugifyHandle(value),
              })
            }
          />
          <Field
            label="Slug"
            value={draft.slug ?? ""}
            onChange={(value) => setDraft({ ...draft, slug: value })}
          />
          <AreaField
            label="Description"
            value={draft.description ?? ""}
            onChange={(value) => setDraft({ ...draft, description: value })}
          />
          <Field
            label="Award condition"
            value={draft.award_condition ?? ""}
            onChange={(value) => setDraft({ ...draft, award_condition: value })}
            hint="Plain-language note for the team awarding it."
          />
          <div className="space-y-3">
            <ToggleField
              label="Active"
              checked={draft.is_active ?? true}
              onChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />
            <ToggleField
              label="Only this competition"
              checked={Boolean(draft.competition_id)}
              onChange={(checked) =>
                setDraft({ ...draft, competition_id: checked ? competitionId : null })
              }
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => {
              if (!draft.name || !draft.slug) {
                toast.error("Name and slug are required");
                return;
              }
              save.mutate(
                { ...draft, name: draft.name, slug: draft.slug },
                { onSuccess: () => setDraft({}) },
              );
            }}
          >
            Save badge
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({})}>
              Cancel
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------ Audit ------------------------------- */

function AuditPanel() {
  const [filters, setFilters] = useState({ action: "", entity: "", actorEmail: "" });
  const feed = useQuery({
    queryKey: ["audit", filters],
    queryFn: () =>
      fetchAuditFeed({
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entity ? { entity: filters.entity } : {}),
        ...(filters.actorEmail ? { actorEmail: filters.actorEmail } : {}),
      }),
  });

  return (
    <Panel title="Audit log" description="Append-only record. Nothing here can be edited.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Action"
          value={filters.action}
          onChange={(value) => setFilters({ ...filters, action: value })}
        />
        <Field
          label="Entity"
          value={filters.entity}
          onChange={(value) => setFilters({ ...filters, entity: value })}
        />
        <Field
          label="Actor email"
          value={filters.actorEmail}
          onChange={(value) => setFilters({ ...filters, actorEmail: value })}
        />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left">
              {["When", "Actor", "Action", "Entity", "Detail"].map((head) => (
                <th key={head} className="px-3 py-2.5 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(feed.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border/40 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5">
                  {new Date(row.created_at).toLocaleString("en-GB")}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.actor_email ?? "system"}</td>
                <td className="px-3 py-2.5 font-semibold">{row.action}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {row.entity}
                  {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {JSON.stringify(row.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {feed.data?.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">No matching entries.</p>
        )}
        {feed.isError && (
          <p className="py-3 text-sm text-muted-foreground">
            You need audit access to view this log.
          </p>
        )}
      </div>
    </Panel>
  );
}

function NoCompetition() {
  return (
    <div className="card-stage p-5">
      <p className="text-sm text-muted-foreground">
        Create a competition first, then configure it here.
      </p>
    </div>
  );
}

function toLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
