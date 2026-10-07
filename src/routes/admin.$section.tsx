import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
  grantRoleByEmail,
  revokeRoleByEmail,
  listTeam,
} from "@/lib/live-data";
import {
  PROGRESS_STATES,
  PROGRESS_STATE_LABELS,
  SUBMISSION_STATE_LABELS,
  describeResult,
  decideRoundResult,
  fetchAdminAccounts,
  fetchAdminApplications,
  fetchRoundResults,
  fetchScoreCorrections,
  fetchSuspiciousVoters,
  setApplicationState,
  voidVotes,
} from "@/lib/operations";
import { ROLE_LABELS } from "@/domain/roles";
import { notifyContestant } from "@/lib/notify";
import { sendAnnouncementEmail, type EmailSendSummary } from "@/lib/email.functions";

export const Route = createFileRoute("/admin/$section")({
  staticData: { sitemap: false },
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
      {section.slug === "contestants" && (
        <ContestantsPanel competitionSlug={competition.data?.slug ?? null} />
      )}
      {section.slug === "shortlists" && <ShortlistsPanel competitionId={competitionId} />}
      {section.slug === "moderation" && (
        <ModerationPanel competitionSlug={competition.data?.slug ?? null} />
      )}
      {section.slug === "accounts" && <AccountsPanel />}
      {section.slug === "settings" && <SettingsPanel />}
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
    mutationFn: (announcementId: string) => sendAnnouncementEmail({ data: { announcementId } }),
    onSuccess: (result: EmailSendSummary) => {
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
              {announcement.audience === "CONTESTANTS" && announcement.is_published && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={email.isPending}
                  onClick={() => email.mutate(announcement.id)}
                >
                  {email.isPending ? "Sending…" : "Email contestants"}
                </Button>
              )}
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

/* ---------------------------- Contestants ---------------------------- */

const CONTESTANT_ACTIONS = ["WITHDRAWN", "DISQUALIFIED", "APPROVED", "ROUND_ACTIVE"] as const;

function ContestantsPanel({ competitionSlug }: { competitionSlug: string | null }) {
  const client = useQueryClient();
  const [progress, setProgress] = useState("");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useQuery({
    queryKey: ["admin-applications", competitionSlug, progress],
    queryFn: () => fetchAdminApplications({ competitionSlug, progressState: progress || null }),
    enabled: Boolean(competitionSlug),
  });

  const change = useMutation({
    mutationFn: async ({ id, state }: { id: string; state: string }) => {
      const result = await setApplicationState(id, state, reason);
      if (result.ok) await notifyContestant(id, state, reason);
      return result;
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(describeResult(result));
        return;
      }
      toast.success("Contestant record updated");
      setReason("");
      setOpenId(null);
      void client.invalidateQueries({ queryKey: ["admin-applications"] });
      void client.invalidateQueries({ queryKey: ["public-contestants"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "That change was refused."),
  });

  if (!competitionSlug) return <NoCompetition />;

  const term = search.trim().toLowerCase();
  const list = (rows.data ?? []).filter(
    (row) =>
      !term ||
      row.display_name.toLowerCase().includes(term) ||
      row.handle.toLowerCase().includes(term),
  );

  return (
    <Panel
      title="Contestant records"
      description="Every contestant in this competition, with suspension, withdrawal and disqualification controls. Each change is emailed to the contestant, written to the audit log, and shown straight away on the contestant's own portal and dashboard."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Search name or handle" value={search} onChange={setSearch} />
        <SelectField
          label="Filter by stage"
          value={progress}
          onChange={setProgress}
          options={[
            { value: "", label: "All stages" },
            ...PROGRESS_STATES.map((state) => ({
              value: state,
              label: PROGRESS_STATE_LABELS[state] ?? state,
            })),
          ]}
        />
      </div>

      <div className="mt-5 divide-y divide-border/60">
        {rows.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
        {rows.isError && (
          <p className="py-3 text-sm text-muted-foreground">
            You need contestant management access to view this list.
          </p>
        )}
        {!rows.isLoading && list.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">No contestants match that filter.</p>
        )}
        {list.map((row) => (
          <div key={row.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {row.display_name}{" "}
                  <span className="text-xs text-muted-foreground">@{row.handle}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.category_name} ·{" "}
                  {PROGRESS_STATE_LABELS[row.progress_state] ?? row.progress_state} · media{" "}
                  {SUBMISSION_STATE_LABELS[row.submission_state] ?? row.submission_state}
                  {row.round_name ? ` · ${row.round_name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin/entries/$id" params={{ id: row.id }}>
                    View entry
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                >
                  {openId === row.id ? "Close" : "Manage"}
                </Button>
              </div>
            </div>

            {openId === row.id && (
              <div className="mt-3 space-y-3 rounded-md border border-border/60 p-3">
                <AreaField
                  label="Reason (recorded and emailed)"
                  value={reason}
                  onChange={setReason}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  {CONTESTANT_ACTIONS.map((state) => (
                    <Button
                      key={state}
                      size="sm"
                      variant={state === "DISQUALIFIED" ? "destructive" : "outline"}
                      disabled={change.isPending || row.progress_state === state}
                      onClick={() => change.mutate({ id: row.id, state })}
                    >
                      {PROGRESS_STATE_LABELS[state] ?? state}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------- Shortlists ---------------------------- */

function ShortlistsPanel({ competitionId }: { competitionId: string | null }) {
  const client = useQueryClient();
  const [roundId, setRoundId] = useState("");
  const [reason, setReason] = useState("");

  const rounds = useQuery({
    queryKey: ["rounds", competitionId],
    queryFn: () => fetchRounds(competitionId as string),
    enabled: Boolean(competitionId),
  });

  const activeRound = roundId || rounds.data?.[0]?.id || "";

  const results = useQuery({
    queryKey: ["round-results", activeRound],
    queryFn: () => fetchRoundResults(activeRound),
    enabled: Boolean(activeRound),
  });

  const decide = useMutation({
    mutationFn: async ({
      id,
      outcome,
    }: {
      id: string;
      outcome: "ADVANCED" | "ELIMINATED" | "HELD";
    }) => {
      const result = await decideRoundResult(id, outcome, reason);
      if (result.ok) await notifyContestant(id, outcome, reason);
      return result;
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(describeResult(result));
        return;
      }
      toast.success("Decision recorded");
      setReason("");
      void client.invalidateQueries({ queryKey: ["round-results"] });
      void client.invalidateQueries({ queryKey: ["admin-applications"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "That decision was refused."),
  });

  if (!competitionId) return <NoCompetition />;

  const list = results.data ?? [];
  const undecided = list.filter((row) => !row.outcome).length;

  return (
    <Panel
      title="Round shortlist"
      description="Ranked standing for a round, combining judge scores and public votes. Advance, hold or eliminate contestants here."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Round"
          value={activeRound}
          onChange={setRoundId}
          options={(rounds.data ?? []).map((round) => ({
            value: round.id,
            label: `${round.sequence}. ${round.name}`,
          }))}
        />
        <AreaField label="Reason for the decision" value={reason} onChange={setReason} rows={2} />
      </div>

      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        {list.length} contestants · {undecided} awaiting a decision
      </p>

      <div className="mt-3 divide-y divide-border/60">
        {results.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
        {results.isError && (
          <p className="py-3 text-sm text-muted-foreground">
            You need progression access to view this standing.
          </p>
        )}
        {!results.isLoading && list.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">
            No contestants are in this round yet.
          </p>
        )}
        {list.map((row, index) => (
          <div
            key={row.application_id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                <span className="text-muted-foreground">{index + 1}.</span> {row.display_name}{" "}
                <span className="text-xs text-muted-foreground">@{row.handle}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {row.category_name} · judges {Number(row.judge_score ?? 0).toFixed(1)} (
                {row.judges_scored} scored) · votes {row.public_votes} · combined{" "}
                {Number(row.combined ?? 0).toFixed(1)}
                {row.outcome ? ` · ${PROGRESS_STATE_LABELS[row.outcome] ?? row.outcome}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: row.application_id, outcome: "ADVANCED" })}
              >
                Advance
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: row.application_id, outcome: "HELD" })}
              >
                Hold
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ id: row.application_id, outcome: "ELIMINATED" })}
              >
                Eliminate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------- Moderation ---------------------------- */

function ModerationPanel({ competitionSlug }: { competitionSlug: string | null }) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");

  const flagged = useQuery({
    queryKey: ["suspicious-voters", competitionSlug],
    queryFn: () => fetchSuspiciousVoters(competitionSlug ?? undefined),
  });
  const pending = useQuery({
    queryKey: ["admin-applications", competitionSlug, "PENDING_REVIEW-media"],
    queryFn: () => fetchAdminApplications({ competitionSlug, submissionState: "PENDING_REVIEW" }),
    enabled: Boolean(competitionSlug),
  });
  const corrections = useQuery({
    queryKey: ["score-corrections"],
    queryFn: () => fetchScoreCorrections(),
  });

  const void_ = useMutation({
    mutationFn: (voterId: string) => voidVotes(reason, { voterId }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(describeResult(result));
        return;
      }
      toast.success(`${result.voided ?? 0} votes voided`);
      setReason("");
      void client.invalidateQueries({ queryKey: ["suspicious-voters"] });
      void client.invalidateQueries({ queryKey: ["vote-totals"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Those votes could not be voided."),
  });

  return (
    <div className="space-y-6">
      <Panel
        title="Suspicious voting activity"
        description="Accounts with unusual voting volume in this competition. Voiding keeps the vote record and marks it invalid."
      >
        <AreaField label="Reason for voiding" value={reason} onChange={setReason} rows={2} />
        <div className="mt-4 divide-y divide-border/60">
          {flagged.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
          {flagged.isError && (
            <p className="py-3 text-sm text-muted-foreground">
              You need moderation access to view flagged activity.
            </p>
          )}
          {!flagged.isLoading && (flagged.data ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nothing looks unusual right now.</p>
          )}
          {(flagged.data ?? []).map((row) => (
            <div
              key={row.voter_id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">{row.voter_email ?? "Account"}</p>
                <p className="text-xs text-muted-foreground">
                  {row.votes_today} today · {row.votes_last_hour} in the last hour ·{" "}
                  {row.distinct_contestants} contestants
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={!reason.trim() || void_.isPending}
                onClick={() => void_.mutate(row.voter_id)}
              >
                Void their votes
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Media awaiting review"
        description="Audition material that no moderator has cleared yet. Full review happens in Submissions."
      >
        <div className="divide-y divide-border/60">
          {!pending.isLoading && (pending.data ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nothing is waiting for review.</p>
          )}
          {(pending.data ?? []).map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{row.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.category_name} · {row.audition_url}
                </p>
              </div>
              <span className="text-xs uppercase tracking-widest text-warning">
                {SUBMISSION_STATE_LABELS[row.submission_state] ?? row.submission_state}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Score corrections"
        description="Every locked score a judge or admin has corrected, with the reason given."
      >
        <div className="divide-y divide-border/60">
          {corrections.isError && (
            <p className="py-3 text-sm text-muted-foreground">
              You need integrity access to view corrections.
            </p>
          )}
          {!corrections.isLoading && (corrections.data ?? []).length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No scores have been corrected.</p>
          )}
          {(corrections.data ?? []).map((row) => (
            <div key={row.id} className="py-3 text-sm">
              <p className="font-semibold">
                @{row.handle} · {row.criterion_name}{" "}
                <span className="text-muted-foreground">
                  {row.previous_value} → {row.corrected_value}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()} · judge {row.judge_email ?? "—"} ·
                corrected by {row.corrected_by_email ?? "—"} · {row.reason}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------- Accounts ---------------------------- */

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function AccountsPanel() {
  const [search, setSearch] = useState("");
  const accounts = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => fetchAdminAccounts(),
    retry: false,
  });

  const term = search.trim().toLowerCase();
  const list = (accounts.data ?? []).filter(
    (row) =>
      !term ||
      (row.email ?? "").toLowerCase().includes(term) ||
      row.display_name.toLowerCase().includes(term) ||
      (row.entry_reference ?? "").toLowerCase().includes(term),
  );

  return (
    <Panel
      title="Registered accounts"
      description="Every account created on ArtistrySynk Creatives Talent Hunt, whether or not it has an entry: confirmation status, roles, the entry it owns and its creative identity."
    >
      <Field label="Search email, name or entry code" value={search} onChange={setSearch} />

      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        {list.length} of {accounts.data?.length ?? 0} accounts
      </p>

      <div className="mt-3 divide-y divide-border/60">
        {accounts.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
        {accounts.isError && (
          <p className="py-3 text-sm text-muted-foreground">
            Only administrators can view registered accounts.
          </p>
        )}
        {!accounts.isLoading && list.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">No accounts match that search.</p>
        )}
        {list.map((row) => (
          <div key={row.user_id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {row.display_name || row.email || "Unnamed account"}{" "}
                  {row.is_owner && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Owner
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{row.email}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  row.email_confirmed_at
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-warning/40 bg-warning/10 text-warning"
                }`}
              >
                {row.email_confirmed_at ? "Confirmed" : "Unconfirmed"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Joined {formatDate(row.created_at)} · Last sign-in {formatDate(row.last_sign_in_at)} ·
              Roles {row.roles.length ? row.roles.map((r) => ROLE_LABELS[r as never] ?? r).join(", ") : "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.entry_reference
                ? `Entry ${row.entry_reference} — ${row.entry_name ?? ""} · ${row.entry_category ?? ""} · ${
                    PROGRESS_STATE_LABELS[row.entry_progress_state ?? ""] ?? row.entry_progress_state
                  } · media ${
                    SUBMISSION_STATE_LABELS[row.entry_submission_state ?? ""] ??
                    row.entry_submission_state
                  }`
                : "No entry submitted"}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------- Settings ---------------------------- */

const GRANTABLE_ROLES = ["ADMIN", "MODERATOR", "JUDGE", "SPONSOR_MANAGER"] as const;

function SettingsPanel() {
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("MODERATOR");

  const team = useQuery({ queryKey: ["team"], queryFn: listTeam });

  const grant = useMutation({
    mutationFn: () => grantRoleByEmail(email.trim(), role),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error("No account uses that email yet — ask them to sign up first.");
        return;
      }
      toast.success("Role granted");
      setEmail("");
      void client.invalidateQueries({ queryKey: ["team"] });
    },
    onError: () => toast.error("Only administrators can change roles."),
  });

  const revoke = useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      revokeRoleByEmail(input.email, input.role),
    onSuccess: () => {
      toast.success("Role removed");
      void client.invalidateQueries({ queryKey: ["team"] });
    },
    onError: () => toast.error("Only administrators can change roles."),
  });

  return (
    <div className="space-y-6">
      <Panel
        title="Team and roles"
        description="Roles decide what each account can do. Every grant and removal is checked on the server and written to the audit log."
      >
        <div className="grid gap-4 sm:grid-cols-[2fr,1fr,auto] sm:items-end">
          <Field
            label="Account email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="name@example.com"
            hint="The person must already have a ArtistrySynk Creatives Talent Hunt account."
          />
          <SelectField
            label="Role"
            value={role}
            onChange={setRole}
            options={GRANTABLE_ROLES.map((value) => ({
              value,
              label: ROLE_LABELS[value] ?? value,
            }))}
          />
          <Button onClick={() => grant.mutate()} disabled={!email.trim() || grant.isPending}>
            Grant role
          </Button>
        </div>

        <div className="mt-5 divide-y divide-border/60">
          {team.isLoading && <p className="py-3 text-sm text-muted-foreground">Loading…</p>}
          {team.isError && (
            <p className="py-3 text-sm text-muted-foreground">
              You need administrator access to manage the team.
            </p>
          )}
          {(team.data ?? []).map((member) => (
            <div
              key={`${member.user_id}-${member.role}`}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">{member.display_name || member.email}</p>
                <p className="text-xs text-muted-foreground">
                  {member.email} ·{" "}
                  {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={revoke.isPending || !member.email}
                onClick={() => revoke.mutate({ email: member.email as string, role: member.role })}
              >
                Remove role
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Email delivery">
        <p className="text-sm text-muted-foreground">
          Confirmations, decisions and stage changes are delivered by the configured email service.
          Account confirmation and password resets use the platform's own sign-in system.
        </p>
      </Panel>
    </div>
  );
}

