# Zik's Got Talent — Architecture Assessment (Phase 1)

## 0. What exists today

This is a brand-new, empty TanStack Start project: React 19 + TanStack Router (file routes), Tailwind v4 design tokens in `src/styles.css`, shadcn primitives in `src/components/ui`, server functions via `createServerFn`. There is **no** database, **no** auth, **no** ArtistrySynk credentials, no `.env` values, no integrations folder. So nothing about ArtistrySynk can be assumed — it gets isolated behind an interface (section 5).

Backend: enable **Lovable Cloud** (managed Postgres + auth + storage + server-side authorization). This becomes Zik's Got Talent's *own* competition datastore. It does **not** become a second ArtistrySynk identity system — see section 5.

## 1. Application structure

```text
src/
  routes/                  file-based routes (see map)
  domain/                  pure competition domain: types, enums, state machines, scoring
    competition.ts  application.ts  rounds.ts  roles.ts  voting.ts
  integrations/
    artistrysynk/          THE BOUNDARY
      types.ts             ArtistrySynkIdentity, CreativeProfile contracts
      client.ts            interface ArtistrySynkClient
      local.adapter.ts     Phase 1 adapter (Cloud-backed, local identity link)
      index.server.ts      adapter selection by env flag
    supabase/              generated Cloud client (browser + server + admin)
  lib/
    *.functions.ts         client-callable server functions (RPC)
    *.server.ts            server-only helpers, authorization guards
  components/
    site/  competition/  registration/  dashboard/  admin/  ui/
  styles.css               design system (single source of truth)
```

Rule: no competition rule lives in a component. Statuses, round transitions, permissions and scoring live in `src/domain/` and are re-validated server-side.

## 2. Route map

Public
- `/` landing (hero, core message, categories, sponsors ARTISTRYSYNK × CHOW, journey, CTA)
- `/competitions`, `/competitions/$slug` discovery + detail (rounds, dates, rules, sponsors)
- `/categories`, `/categories/$slug`
- `/contestants`, `/contestants/$handle` public profile (safe fields only)
- `/announcements`, `/rules`, `/sponsors`, `/about`, `/terms`, `/privacy`
- `/auth` sign in / create identity

Registration (7 steps, resumable draft; `/register` → category chooser, then wizard)
- `/register`, `/register/$slug/step/$step`

Contestant (gated `_authenticated/`)
- `/dashboard` (overview + journey tracker), `/dashboard/application`, `/audition`, `/status`, `/announcements`, `/voting`, `/profile`, `/notifications`, `/rules`

Admin (gated + role-gated `_authenticated/_admin/`)
- `/admin` dashboard, then `competitions`, `categories`, `rounds`, `applications`, `contestants`, `submissions`, `judges`, `scoring`, `shortlists`, `voting`, `sponsors`, `announcements`, `badges`, `moderation`, `audit-logs`, `settings`

Judge (gated `_authenticated/_judge/`): `/judge`, `/judge/assignments`, `/judge/score/$applicationId` — shells only in Phase 1.

API: `/api/public/*` only for future webhooks/cron, signature-verified.

## 3. Domain model

Competition core: `competitions` (slug, dates, registration window, eligibility, status, cover), `competition_categories` (admin-configurable groups + talents, ordering, active), `competition_rounds` (name, sequence, type, opens/closes, advancement rule).

Contestant side: `applications` (competition, identity ref, status, current round, handle, submitted_at, unique per identity+competition), `application_categories`, `submissions` (media refs, type, moderation status).

Judging/voting scaffolding: `judges`, `judge_assignments`, `scoring_criteria` (configurable, weighted), `scorecards`, `scores`, `shortlists`, `votes` (+ `vote_events` for audit/fraud signals), `voting_configs` (model JUDGES_ONLY | PUBLIC_ONLY | HYBRID, weights, windows, limits).

Platform: `sponsors`, `competition_sponsors` (tier, placement, active, ordering), `announcements`, `badges` + `badge_awards`, `notifications` + `notification_events`, `audit_logs`, `user_roles` (+ `has_role()` security-definer function), `artistrysynk_links` (identity mapping table, section 5).

Statuses: DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS, VOTING_OPEN, COMPLETED, ARCHIVED. Rounds and criteria are rows, never code.

Phase 1 migrates the full schema with grants + RLS, and seeds one live competition, the category tree, a default round set, default scoring criteria, and the two major sponsors so every screen renders real data.

## 4. Authentication strategy

Cloud auth (email/password + optional Google/Apple later) is the *session* layer for Zik's Got Talent. Every authenticated user row gets exactly one `artistrysynk_links` record representing their ArtistrySynk identity. Route gates protect UI; every server function re-checks the session and role. Roles never live on a profile row and are never trusted from the client.

## 5. ArtistrySynk integration boundary

Nothing about ArtistrySynk is invented. One interface:

```ts
interface ArtistrySynkClient {
  findIdentityByEmail(email): Promise<ArtistrySynkIdentity | null>
  createIdentity(input): Promise<ArtistrySynkIdentity>       // new registrant
  linkIdentity(localUserId, identityRef): Promise<void>      // existing AS user
  getCreativeProfile(identityRef): Promise<CreativeProfile | null>
  upsertCreativeProfile(identityRef, patch): Promise<CreativeProfile>
  profileUrl(identityRef): string
}
```

Phase 1 ships `LocalArtistrySynkAdapter`: stores the identity + creative-profile fields in this project's own tables and records `provider: "local"` in `artistrysynk_links`. When the real platform is wired up, a `RemoteArtistrySynkAdapter` implements the same interface and existing links migrate by `external_id`. Server code only ever imports the interface.

Required later (documented in `src/integrations/artistrysynk/README.md`, not faked now): base API URL, machine-to-machine credential/secret, identity lookup + create/link contract, profile read/write contract, SSO or token-exchange method, and the canonical profile URL pattern. Registration UI states plainly that a free ArtistrySynk creative profile is created or connected — no hidden behavior.

## 6. Roles & permissions

Roles: SUPER_ADMIN, ADMIN, JUDGE, MODERATOR, SPONSOR_MANAGER, CONTESTANT, PUBLIC_USER — in `user_roles`, checked by `has_role()` in RLS and by server-side guards. Granular permission map in `src/domain/roles.ts` (e.g. `competition:configure`, `application:review`, `score:submit`, `sponsor:manage`, `vote:administer`, `results:publish`). Judges get scoring on assigned contestants only — no config, sponsor, vote or cross-judge access. Contestants read only their own application rows.

## 7. Storage

Cloud storage buckets: `public-media` (approved contestant media, profile photos, sponsor logos, competition covers) and private `audition-media` (raw submissions — signed, time-limited URLs, readable by owner + assigned judges + admins). Upload constraints on type/size; media becomes public only after moderation approval.

## 8. Security model

Server-side authorization on every mutation; RLS on every table with explicit GRANTs; private application data never selectable by `anon`; public profiles served through a narrow safe-field view; Zod validation at every server-function boundary; unique constraint preventing duplicate applications; append-only `audit_logs` for admin/judge/vote actions; rate limiting on registration, uploads and votes; votes recorded with dedupe keys and audit events instead of an open vote button. No client-side role checks anywhere.

## 9. Phase 1 delivery

1. Enable Lovable Cloud; migration with full schema, grants, RLS, roles, seed data.
2. Design system in `src/styles.css`: bold African-premium palette (deep night base, gold/amber spotlight accent, electric competitive highlight), expressive display + clean body typography, stage-light gradients, spotlight/marquee motion — all semantic tokens plus shadcn variants.
3. Domain layer + ArtistrySynk boundary + auth/role guards.
4. Public landing page, competition discovery + detail, category selection, contestant public profile shell.
5. Full 7-step registration UI wired to a resumable draft application and identity create/link.
6. Contestant dashboard with journey tracker and section shells reading real data.
7. Admin dashboard shell with all admin areas and working sponsor/category/announcement listings.
8. Route-level SEO metadata; mobile-first, accessible, fast.

Not in Phase 1: full judging workflow, live voting execution, payments, marketplace, real ArtistrySynk API calls, notification delivery channels (architecture only).
