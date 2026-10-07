# ArtistrySynk Talent Hunt Directory

ArtistrySynk Talent Hunt is the competition and talent-discovery directory layer of the ArtistrySynk platform.

**It is not a separate brand, company, identity system, or standalone ecosystem.**

The application is designed to live under ArtistrySynk, for example:

- https://artistrysynk.app/talent-hunt

## Product role

The Talent Hunt directory provides the operational infrastructure for ArtistrySynk competitions:

- Competition discovery
- Talent categories
- Contestant registration
- Applications
- Audition and media submissions
- Competition rounds
- Judging and scoring
- Shortlists
- Public voting
- Contestant profiles
- Announcements
- Sponsors
- Badges
- Admin operations
- Audit logs

## Identity principle

ArtistrySynk is the platform and identity layer.

This project does **not** create, mirror, or link to a separate ArtistrySynk account from inside the Talent Hunt application. Competition records use the authenticated platform user identity available to the application.

## Architecture

The application uses TanStack Start, React, TypeScript, Tailwind CSS, Supabase, React Query, Zod and Vitest.

The competition domain remains configurable. A competition can define its name, slug, artwork, dates, registration window, eligibility, categories, rounds, voting configuration, sponsors, rules and consent requirements.

## Security

Security remains non-negotiable: server-side authorization, role-based permissions, row-level access controls where applicable, private application data, secure media access, audit logs, rate limiting, input validation, duplicate-application protection and controlled voting.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

## Product principle

**Discover talent. Showcase talent. Create opportunity.**

ArtistrySynk remains the home. Talent Hunt is one of its competition and discovery experiences.
