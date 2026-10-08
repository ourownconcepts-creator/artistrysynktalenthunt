-- ArtistrySynk Competition Platform foundation
-- Creative Talent Hunt is the first domain adapter. Future sports/gaming competitions
-- can reuse these tables without adding domain-specific columns.

create extension if not exists pgcrypto;

create table if not exists public.competition_competitions (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  domain text not null default 'CREATIVE', type text not null default 'TALENT_HUNT', status text not null default 'DRAFT',
  description text not null default '', registration_starts_at timestamptz, registration_ends_at timestamptz,
  voting_starts_at timestamptz, voting_ends_at timestamptz, config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint competition_competitions_domain_check check (domain in ('CREATIVE','SPORTS','GAMING','OTHER')),
  constraint competition_competitions_status_check check (status in ('DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','VOTING_OPEN','COMPLETED','ARCHIVED'))
);

create table if not exists public.competition_categories (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  name text not null, slug text not null, description text not null default '', sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(), unique (competition_id, slug)
);

create table if not exists public.competition_rounds (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  name text not null, slug text not null, round_type text not null default 'AUDITION', status text not null default 'DRAFT',
  sequence integer not null default 0, scoring_enabled boolean not null default false, public_voting_enabled boolean not null default false,
  starts_at timestamptz, ends_at timestamptz, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique (competition_id, slug), unique (competition_id, sequence)
);

create table if not exists public.competition_applications (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  category_id uuid not null references public.competition_categories(id) on delete restrict, current_round_id uuid references public.competition_rounds(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade, handle text not null, display_name text not null,
  full_name text not null default '', email text not null default '', phone text not null default '', location text not null default '',
  date_of_birth date, bio text not null default '', experience text not null default '', audition_url text not null default '', audition_notes text not null default '',
  submission_answers jsonb not null default '{}'::jsonb, progress_state text not null default 'PROFILE', submission_state text not null default 'DRAFT',
  status text not null default 'DRAFT', reference_code text unique, review_decision text, review_reason text, reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null, submitted_at timestamptz, is_public boolean not null default false,
  media_is_public boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (competition_id, user_id), unique (competition_id, handle)
);

create table if not exists public.competition_submissions (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.competition_applications(id) on delete cascade,
  round_id uuid not null references public.competition_rounds(id) on delete cascade, title text not null, description text not null default '',
  media_url text not null default '', media_type text not null default 'LINK', thumbnail_url text, metadata jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING_REVIEW', submitted_at timestamptz not null default now(), approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null
);

create table if not exists public.competition_judges (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, display_name text not null, bio text not null default '',
  is_active boolean not null default true, created_at timestamptz not null default now(), unique (competition_id, user_id)
);
create table if not exists public.competition_judge_assignments (
  id uuid primary key default gen_random_uuid(), judge_id uuid not null references public.competition_judges(id) on delete cascade,
  application_id uuid not null references public.competition_applications(id) on delete cascade, round_id uuid not null references public.competition_rounds(id) on delete cascade,
  status text not null default 'ASSIGNED', assigned_at timestamptz not null default now(), unique (judge_id, application_id, round_id)
);
create table if not exists public.competition_scoring_criteria (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  round_id uuid not null references public.competition_rounds(id) on delete cascade, name text not null, description text not null default '',
  max_score numeric(8,2) not null default 10, weight numeric(8,4) not null default 1, sort_order integer not null default 0, unique (round_id, name)
);
create table if not exists public.competition_scores (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.competition_judge_assignments(id) on delete cascade,
  criterion_id uuid not null references public.competition_scoring_criteria(id) on delete cascade, score numeric(8,2) not null,
  comment text not null default '', submitted_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (assignment_id, criterion_id)
);
create table if not exists public.competition_votes (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  round_id uuid not null references public.competition_rounds(id) on delete cascade, application_id uuid not null references public.competition_applications(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), unique (round_id, application_id, voter_user_id)
);
create table if not exists public.competition_announcements (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competition_competitions(id) on delete cascade,
  round_id uuid references public.competition_rounds(id) on delete set null, title text not null, body text not null,
  audience text not null default 'PUBLIC', is_published boolean not null default false, is_pinned boolean not null default false,
  scheduled_for timestamptz, published_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.competition_audit_logs (
  id uuid primary key default gen_random_uuid(), competition_id uuid references public.competition_competitions(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_competition_categories_competition on public.competition_categories(competition_id);
create index if not exists idx_competition_rounds_competition on public.competition_rounds(competition_id);
create index if not exists idx_competition_applications_competition on public.competition_applications(competition_id);
create index if not exists idx_competition_applications_user on public.competition_applications(user_id);
create index if not exists idx_competition_applications_category on public.competition_applications(category_id);
create index if not exists idx_competition_applications_status on public.competition_applications(status);
create index if not exists idx_competition_submissions_application on public.competition_submissions(application_id);
create index if not exists idx_competition_submissions_round on public.competition_submissions(round_id);
create index if not exists idx_competition_votes_round_application on public.competition_votes(round_id, application_id);

alter table public.competition_competitions enable row level security;
alter table public.competition_categories enable row level security;
alter table public.competition_rounds enable row level security;
alter table public.competition_applications enable row level security;
alter table public.competition_submissions enable row level security;
alter table public.competition_judges enable row level security;
alter table public.competition_judge_assignments enable row level security;
alter table public.competition_scoring_criteria enable row level security;
alter table public.competition_scores enable row level security;
alter table public.competition_votes enable row level security;
alter table public.competition_announcements enable row level security;
alter table public.competition_audit_logs enable row level security;

create policy "Public can view published competitions" on public.competition_competitions for select using (status <> 'DRAFT');
create policy "Public can view active competition categories" on public.competition_categories for select using (is_active = true);
create policy "Public can view competition rounds" on public.competition_rounds for select using (true);
create policy "Public can view published announcements" on public.competition_announcements for select using (is_published = true and audience = 'PUBLIC');
create policy "Users can view their competition applications" on public.competition_applications for select using (auth.uid() = user_id or is_public = true);
create policy "Users can create their competition applications" on public.competition_applications for insert with check (auth.uid() = user_id);
create policy "Users can update their competition applications" on public.competition_applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view their submissions" on public.competition_submissions for select using (exists (select 1 from public.competition_applications a where a.id = application_id and (a.user_id = auth.uid() or a.is_public = true)));
create policy "Users can create their submissions" on public.competition_submissions for insert with check (exists (select 1 from public.competition_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "Users can update their submissions" on public.competition_submissions for update using (exists (select 1 from public.competition_applications a where a.id = application_id and a.user_id = auth.uid()));
create policy "Authenticated users can vote" on public.competition_votes for insert with check (auth.uid() = voter_user_id);
create policy "Users can view their votes" on public.competition_votes for select using (auth.uid() = voter_user_id);

insert into public.competition_competitions (slug, name, domain, type, status, description, config)
values ('creative-talent-hunt','ArtistrySynk Creative Talent Hunt','CREATIVE','TALENT_HUNT','DRAFT','A discovery-first competition for emerging creatives across music, performance, visual arts, digital creativity and more.','{"identity":"artistrysynk","age_min":18,"voting_mode":"AUTHENTICATED_PUBLIC"}'::jsonb)
on conflict (slug) do update set name=excluded.name, domain=excluded.domain, type=excluded.type, description=excluded.description, config=excluded.config, updated_at=now();
insert into public.competition_categories (competition_id,name,slug,sort_order)
select c.id,v.name,v.slug,v.sort_order from public.competition_competitions c cross join (values ('Music','music',1),('Performance','performance',2),('Visual Arts','visual-arts',3),('Film & Photography','film-photography',4),('Fashion & Style','fashion-style',5),('Digital & Tech','digital-tech',6),('Writing & Storytelling','writing-storytelling',7),('Content Creation','content-creation',8),('Other Creative Talent','other',9)) v(name,slug,sort_order)
where c.slug='creative-talent-hunt' on conflict (competition_id,slug) do update set name=excluded.name,sort_order=excluded.sort_order;
insert into public.competition_rounds (competition_id,name,slug,round_type,sequence,scoring_enabled,public_voting_enabled)
select id,'Open Entry','open-entry','AUDITION',1,false,false from public.competition_competitions where slug='creative-talent-hunt'
on conflict (competition_id,slug) do nothing;
