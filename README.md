# ArtistrySynk Creatives Talent Hunt

PROJECT: ZIK’S GOT TALENT

Build a standalone, production-grade talent competition platform called:

Zik’s Got Talent

This is an official product in the ArtistrySynk ecosystem.

IMPORTANT ARCHITECTURE RULE:

Zik’s Got Talent is a SEPARATE PRODUCT from ArtistrySynk.

It will eventually run on its own domain:

ziksgottalent.com

ArtistrySynk runs separately on:

artistrysynk.app

DO NOT build Zik’s Got Talent as a page inside ArtistrySynk.

DO NOT redesign, replace, or modify ArtistrySynk.

DO NOT create a second independent creative identity ecosystem.

The long-term architecture is:

Zik’s Got Talent

        ↓

Zik’s Got Talent application/competition system

        ↓

ArtistrySynk identity

        ↓

ArtistrySynk creative profile

CORE PRODUCT PRINCIPLE:

A person who registers for Zik’s Got Talent automatically becomes an ArtistrySynk user/creative, or is linked to their existing ArtistrySynk identity.

There must NEVER be duplicate identities simply because someone entered Zik’s Got Talent.

NEW USER:

Zik’s Got Talent registration

→ ArtistrySynk identity creation/link

→ ArtistrySynk creative profile

→ Zik’s Got Talent contestant/application

EXISTING ARTISTRYSYNK USER:

ArtistrySynk authentication

→ Zik’s Got Talent registration

→ Zik’s Got Talent application linked to existing identity

For now, DO NOT guess or invent the technical integration with ArtistrySynk.

First inspect the project structure and establish a clean integration boundary that can later connect to the existing ArtistrySynk authentication/profile infrastructure.

==================================================

PRODUCT VISION

==================================================

Zik’s Got Talent is a multi-category talent discovery and competition platform.

Contestants can:

- Discover the competition

- Choose a talent category

- Register

- Build/complete their creative profile

- Submit audition material

- Track their application

- Progress through competition rounds

- Receive announcements

- Participate in voting where enabled

- View their results

- Earn competition recognition/badges

The competition is temporary.

The contestant’s ArtistrySynk creative identity is permanent.

CORE MESSAGE:

“Your talent deserves to be discovered.”

ECOSYSTEM MESSAGE:

“Zik’s Got Talent is the competition.

ArtistrySynk is the creative identity that lives beyond it.”

==================================================

BRAND

==================================================

Primary brand:

ZIK’S GOT TALENT

Positioning:

Energetic

Youthful

Premium

Aspirational

African

Creative

Competitive

Professional

Do NOT make this look like a generic school talent-show website.

The visual quality should feel capable of supporting a national-scale talent competition.

Major sponsors:

ARTISTRYSYNK × CHOW

These are the MAJOR SPONSORS.

Other sponsor logos should be supported as secondary/supporting sponsors.

Create a sponsor architecture that allows admins to configure:

- Sponsor tier

- Sponsor name

- Logo

- Description

- Website

- Placement

- Active/inactive status

Do not hard-code sponsor logos into the application.

==================================================

INITIAL TALENT CATEGORIES

==================================================

Categories must be ADMIN-CONFIGURABLE.

Initial categories:

MUSIC

- Singing

- Rap

- Songwriting

- Instrumental

- Music Production

- DJ

PERFORMANCE

- Dance

- Comedy

- Spoken Word

- Acting

- Performance Art

VISUAL / CREATIVE

- Photography

- Visual Art

- Fashion

- Makeup

- Creative Direction

DIGITAL / TECH

- Coding

- Gaming

- Animation

- Content Creation

- Digital Art

OTHER TALENT

Do not hard-code the category system so that future competitions require code changes.

==================================================

COMPETITION MODEL

==================================================

The system must support configurable competitions.

A competition can have:

- Name

- Slug

- Description

- Cover artwork

- Start date

- End date

- Registration open/close dates

- Eligibility rules

- Status

- Categories

- Rounds

- Voting configuration

- Sponsor configuration

- Rules

- Terms/consent requirements

Competition statuses should support:

DRAFT

REGISTRATION_OPEN

REGISTRATION_CLOSED

IN_PROGRESS

VOTING_OPEN

COMPLETED

ARCHIVED

Rounds must also be configurable.

Example:

Registration

→ Application Review

→ Audition

→ Top 100

→ Top 50

→ Top 20

→ Top 10

→ Final

→ Winner

But this must NOT be hard-coded.

Admins must eventually be able to create different round structures.

==================================================

USER ROLES

==================================================

Support role-based access control.

Initial roles:

SUPER_ADMIN

ADMIN

JUDGE

MODERATOR

SPONSOR_MANAGER

CONTESTANT

PUBLIC_USER

Permissions must be granular.

A judge must not be able to:

- Modify competition configuration

- Modify sponsor data

- Alter another judge’s permissions

- Manipulate votes

- Modify final results without authorization

A contestant must only see their own private application information.

==================================================

CORE DATA MODEL

==================================================

Prepare the application for the following competition-domain entities:

competitions

competition_categories

competition_rounds

applications

application_categories

submissions

judges

judge_assignments

scorecards

scores

shortlists

votes

sponsors

competition_sponsors

announcements

badges

audit_logs

These are Zik’s Got Talent domain entities.

Do NOT create a replacement for ArtistrySynk's user identity system.

The competition entities should reference the eventual ArtistrySynk identity/profile.

==================================================

REGISTRATION EXPERIENCE

==================================================

Create a premium multi-step registration experience.

Step 1:

Choose talent category.

Step 2:

Create or authenticate identity.

Step 3:

Personal information.

Step 4:

Creative information.

Step 5:

Audition/media submission.

Step 6:

Review.

Step 7:

Consent and submit.

Clearly explain:

“Your Zik’s Got Talent registration automatically creates your free ArtistrySynk creative profile, or connects to your existing ArtistrySynk account. No separate registration is required.”

Do not make this misleading or hidden.

==================================================

CONTESTANT DASHBOARD

==================================================

Create a contestant dashboard.

Example:

WELCOME, [NAME]

Your Talent:

Music

Application:

Submitted

Current Stage:

Application Review

Competition journey:

✓ Registration

✓ Profile

✓ Audition submitted

● Application review

○ Shortlist

○ Semi-final

○ Final

○ Winner

Dashboard sections:

- My Application

- My Audition

- Competition Status

- Announcements

- Voting

- My Creative Profile

- Notifications

- Competition Rules

==================================================

PUBLIC CONTESTANT PROFILE

==================================================

Create public contestant profiles.

Display:

- Profile photo

- Name

- Talent category

- Location

- Short bio

- Approved creative media

- Competition status

- Zik’s Got Talent badge

- Share button

Future destination:

ArtistrySynk creative profile.

Do not expose private application information.

==================================================

JUDGING

==================================================

Prepare the architecture for judges.

Judges should eventually be able to:

- View assigned contestants

- View audition submissions

- Score contestants

- Leave comments

- Submit scorecards

Scoring criteria must be configurable.

Example:

Talent /10

Creativity /10

Originality /10

Stage Presence /10

Technical Ability /10

Overall /10

Do not hard-code these criteria permanently.

==================================================

VOTING

==================================================

Prepare for configurable voting.

Possible models:

JUDGES_ONLY

PUBLIC_ONLY

HYBRID

Example:

70% Judges

30% Public Vote

Voting must support:

- Voting windows

- Vote limits

- Authentication

- Rate limiting

- Audit trail

- Fraud monitoring architecture

- Admin controls

Do NOT implement a simplistic unrestricted vote button.

==================================================

ADMIN

==================================================

Create the foundation for a powerful admin control centre.

Admin areas:

Dashboard

Competitions

Categories

Rounds

Applications

Contestants

Submissions

Judges

Scoring

Shortlists

Voting

Sponsors

Announcements

Badges

Moderation

Audit Logs

Settings

Admin should eventually be able to:

- Create competitions

- Configure categories

- Configure rounds

- Review applications

- Approve/reject contestants

- Move contestants between rounds

- Assign judges

- Configure scoring

- Configure voting

- Manage sponsors

- Publish announcements

- Award badges

- Suspend/disqualify contestants

==================================================

SPONSORS

==================================================

Major sponsors:

ARTISTRYSYNK × CHOW

Design the sponsor system so additional sponsors can be added without code changes.

Support sponsor tiers such as:

MAJOR SPONSOR

SUPPORTING SPONSOR

PARTNER

MEDIA PARTNER

Admin controls visibility and placement.

==================================================

NOTIFICATIONS

==================================================

Design an event-driven notification architecture.

Future channels:

- In-app

- Email

- Push

- SMS

- WhatsApp

Potential events:

APPLICATION_RECEIVED

APPLICATION_APPROVED

APPLICATION_REJECTED

AUDITION_DEADLINE

ADVANCED_TO_NEXT_ROUND

VOTING_OPEN

VOTING_CLOSED

FINALIST_SELECTED

WINNER_ANNOUNCED

==================================================

SECURITY

==================================================

Security is non-negotiable.

Use:

- Role-based authorization

- Server-side authorization

- Row-level access controls where applicable

- Private application data

- Secure media access

- Audit logs

- Rate limiting

- Validation

- Anti-duplicate application protection

- Secure vote handling

Never trust client-side role checks.

Never expose private contestant information publicly.

==================================================

IMPORTANT BUILD RULE

==================================================

DO NOT build every feature immediately.

FIRST PHASE ONLY:

1. Establish project architecture.

2. Establish routing structure.

3. Establish design system.

4. Establish competition domain model.

5. Establish database/schema plan.

6. Establish ArtistrySynk integration boundary.

7. Establish authentication strategy.

8. Establish role/permission model.

9. Build the public landing page.

10. Build competition discovery.

11. Build category selection.

12. Build registration UI.

13. Build contestant dashboard shell.

14. Build admin dashboard shell.

Do NOT implement advanced voting, complex judging, payment, or marketplace functionality yet.

DO NOT create fake integrations.

DO NOT fabricate ArtistrySynk API endpoints.

If an integration detail is unknown, clearly isolate it behind an integration service/interface so it can be connected later.

==================================================

DESIGN QUALITY

==================================================

This must look like a serious national talent platform.

Mobile-first.

Responsive.

Fast.

Accessible.

Premium.

Strong typography.

Strong photography/media presentation.

Energetic but not visually chaotic.

Do not use generic SaaS dashboard aesthetics for the public-facing experience.

The contestant journey should feel exciting.

The admin experience should feel operational and professional.

==================================================

CRITICAL CONSTRAINT

==================================================

Before implementing the backend integration, inspect the existing architecture/configuration available to this project.

Do not assume:

- database provider

- authentication provider

- ArtistrySynk API

- table names

- user IDs

- endpoints

- secrets

If these are not available in this new project, create an explicit integration abstraction and document exactly what credentials/contracts will eventually be required.

DO NOT create a second ArtistrySynk user database.

==================================================

FIRST TASK

==================================================

Do NOT start by generating the entire application.

First produce an architecture assessment for this new Zik’s Got Talent project.

Show:

1. Proposed application structure

2. Route map

3. Database/domain model

4. Authentication strategy

5. ArtistrySynk integration boundary

6. Role/permission model

7. Storage strategy

8. Security model

9. Phase 1 implementation plan

Then wait for implementation approval.

The goal is a production-grade foundation, not a mockup.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://artistrysynktalenthunt.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b07f33c-4533-425f-a1fb-b39e641b0171).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
