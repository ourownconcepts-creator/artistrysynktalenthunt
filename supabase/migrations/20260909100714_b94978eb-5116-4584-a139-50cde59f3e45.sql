
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN','ADMIN','JUDGE','MODERATOR','SPONSOR_MANAGER','CONTESTANT','PUBLIC_USER');

-- PROFILES -------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  handle TEXT UNIQUE,
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  primary_discipline TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  artistrysynk_identity_ref TEXT,
  artistrysynk_provider TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ROLES ----------------------------------------------------------------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('SUPER_ADMIN','ADMIN','MODERATOR')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('SUPER_ADMIN','ADMIN')
  );
$$;

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- CATALOGUE ------------------------------------------------------------
CREATE TABLE public.category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_groups TO authenticated;
GRANT ALL ON public.category_groups TO service_role;
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups public read" ON public.category_groups FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "groups admin write" ON public.category_groups FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.category_groups(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  audition_hint TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- COMPETITIONS ---------------------------------------------------------
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  eligibility TEXT[] NOT NULL DEFAULT '{}',
  rules TEXT[] NOT NULL DEFAULT '{}',
  consent_requirements TEXT[] NOT NULL DEFAULT '{}',
  prize_pool TEXT NOT NULL DEFAULT '',
  cities INTEGER NOT NULL DEFAULT 0,
  voting_model TEXT NOT NULL DEFAULT 'HYBRID',
  judge_weight INTEGER NOT NULL DEFAULT 70,
  public_weight INTEGER NOT NULL DEFAULT 30,
  voting_opens_at TIMESTAMPTZ,
  voting_closes_at TIMESTAMPTZ,
  votes_per_user_per_day INTEGER NOT NULL DEFAULT 3,
  vote_rate_limit_per_minute INTEGER NOT NULL DEFAULT 5,
  requires_authentication BOOLEAN NOT NULL DEFAULT TRUE,
  current_round_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.competitions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitions public read" ON public.competitions FOR SELECT TO anon, authenticated
  USING (status <> 'DRAFT' OR public.is_staff(auth.uid()));
CREATE POLICY "competitions admin write" ON public.competitions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.competition_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  advancement_rule TEXT NOT NULL DEFAULT 'MANUAL',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, slug)
);
GRANT SELECT ON public.competition_rounds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.competition_rounds TO authenticated;
GRANT ALL ON public.competition_rounds TO service_role;
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rounds public read" ON public.competition_rounds FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "rounds admin write" ON public.competition_rounds FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.competitions
  ADD CONSTRAINT competitions_current_round_fk
  FOREIGN KEY (current_round_id) REFERENCES public.competition_rounds(id) ON DELETE SET NULL;

CREATE TABLE public.scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 10,
  weight INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scoring_criteria TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scoring_criteria TO authenticated;
GRANT ALL ON public.scoring_criteria TO service_role;
ALTER TABLE public.scoring_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "criteria public read" ON public.scoring_criteria FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "criteria admin write" ON public.scoring_criteria FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'PARTNER',
  description TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  placements TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsors public read" ON public.sponsors FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "sponsors admin write" ON public.sponsors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'SPONSOR_MANAGER'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'SPONSOR_MANAGER'));

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'PUBLIC',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements public read" ON public.announcements FOR SELECT TO anon USING (audience = 'PUBLIC');
CREATE POLICY "announcements member read" ON public.announcements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "announcements admin write" ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public read" ON public.badges FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "badges admin write" ON public.badges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- APPLICATIONS ---------------------------------------------------------
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  bio TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  audition_url TEXT NOT NULL DEFAULT '',
  audition_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  current_round_id UUID REFERENCES public.competition_rounds(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application read" ON public.applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own application insert" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own application update" ON public.applications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.application_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, badge_id)
);
GRANT SELECT ON public.application_badges TO anon, authenticated;
GRANT INSERT, DELETE ON public.application_badges TO authenticated;
GRANT ALL ON public.application_badges TO service_role;
ALTER TABLE public.application_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "application badges read" ON public.application_badges FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "application badges admin write" ON public.application_badges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- JUDGING --------------------------------------------------------------
CREATE TABLE public.judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX judge_assignments_unique
  ON public.judge_assignments (judge_id, competition_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, DELETE ON public.judge_assignments TO authenticated;
GRANT ALL ON public.judge_assignments TO service_role;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments read" ON public.judge_assignments FOR SELECT TO authenticated
  USING (judge_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "assignments admin write" ON public.judge_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.judge_can_score(_judge_id UUID, _application_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.judge_assignments ja
      ON ja.competition_id = a.competition_id
     AND (ja.category_id IS NULL OR ja.category_id = a.category_id)
    WHERE a.id = _application_id
      AND ja.judge_id = _judge_id
      AND a.status IN ('APPROVED','UNDER_REVIEW','SUBMITTED')
  );
$$;

CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
  value NUMERIC(5,2) NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, round_id, judge_id, criterion_id)
);
GRANT SELECT, INSERT, UPDATE ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores read" ON public.scores FOR SELECT TO authenticated
  USING (judge_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "scores judge insert" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (judge_id = auth.uid() AND public.judge_can_score(auth.uid(), application_id));
CREATE POLICY "scores judge update" ON public.scores FOR UPDATE TO authenticated
  USING (judge_id = auth.uid() AND public.judge_can_score(auth.uid(), application_id))
  WITH CHECK (judge_id = auth.uid());

CREATE TABLE public.round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, round_id)
);
GRANT SELECT, INSERT, UPDATE ON public.round_results TO authenticated;
GRANT SELECT ON public.round_results TO anon;
GRANT ALL ON public.round_results TO service_role;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results public read" ON public.round_results FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "results staff write" ON public.round_results FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- VOTING ---------------------------------------------------------------
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voter_id, application_id, round_id, vote_day)
);
CREATE INDEX votes_voter_day_idx ON public.votes (voter_id, vote_day);
CREATE INDEX votes_application_round_idx ON public.votes (application_id, round_id);
GRANT SELECT ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own votes read" ON public.votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL DEFAULT '',
  entity_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "audit insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- PUBLIC CONTESTANT READS (safe columns only) --------------------------
CREATE OR REPLACE FUNCTION public.public_contestants(_competition_slug TEXT DEFAULT NULL)
RETURNS TABLE (
  handle TEXT,
  display_name TEXT,
  category_name TEXT,
  group_name TEXT,
  location TEXT,
  bio TEXT,
  stage TEXT,
  competition_slug TEXT,
  vote_count BIGINT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.handle, a.display_name, c.name, g.name, a.location, a.bio,
         COALESCE(r.name, 'Registration'), comp.slug,
         (SELECT count(*) FROM public.votes v WHERE v.application_id = a.id)
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  JOIN public.category_groups g ON g.id = c.group_id
  JOIN public.competitions comp ON comp.id = a.competition_id
  LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
  WHERE a.is_public
    AND a.status IN ('APPROVED','UNDER_REVIEW')
    AND (_competition_slug IS NULL OR comp.slug = _competition_slug)
  ORDER BY a.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.public_contestants(TEXT) TO anon, authenticated;

-- GUARDED PUBLIC VOTE --------------------------------------------------
CREATE OR REPLACE FUNCTION public.cast_vote(_handle TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_app public.applications;
  v_comp public.competitions;
  v_round UUID;
  v_today INTEGER;
  v_minute INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_app FROM public.applications
   WHERE handle = _handle AND is_public AND status IN ('APPROVED','UNDER_REVIEW');
  IF v_app.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = v_app.competition_id;

  IF v_comp.voting_model = 'JUDGES_ONLY' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;

  IF v_comp.voting_opens_at IS NULL OR v_comp.voting_closes_at IS NULL
     OR now() < v_comp.voting_opens_at OR now() > v_comp.voting_closes_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;

  v_round := COALESCE(v_app.current_round_id, v_comp.current_round_id);
  IF v_round IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;

  SELECT count(*) INTO v_minute FROM public.votes
   WHERE voter_id = v_user AND created_at > now() - interval '1 minute';
  IF v_minute >= v_comp.vote_rate_limit_per_minute THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RATE_LIMITED');
  END IF;

  SELECT count(*) INTO v_today FROM public.votes
   WHERE voter_id = v_user AND vote_day = (now() AT TIME ZONE 'utc')::date;
  IF v_today >= v_comp.votes_per_user_per_day THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'DAILY_LIMIT_REACHED');
  END IF;

  BEGIN
    INSERT INTO public.votes (application_id, round_id, voter_id)
    VALUES (v_app.id, v_round, v_user);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'DUPLICATE');
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'votesRemainingToday', GREATEST(v_comp.votes_per_user_per_day - v_today - 1, 0),
    'voteCount', (SELECT count(*) FROM public.votes WHERE application_id = v_app.id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.cast_vote(TEXT) TO authenticated;

-- HYBRID LEADERBOARD ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.round_leaderboard(_competition_slug TEXT, _round_slug TEXT)
RETURNS TABLE (
  handle TEXT,
  display_name TEXT,
  category_name TEXT,
  judge_score NUMERIC,
  public_votes BIGINT,
  combined NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comp public.competitions;
  v_round UUID;
  v_max_votes NUMERIC;
BEGIN
  SELECT * INTO v_comp FROM public.competitions WHERE slug = _competition_slug;
  IF v_comp.id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_round FROM public.competition_rounds
   WHERE competition_id = v_comp.id AND slug = _round_slug;
  IF v_round IS NULL THEN RETURN; END IF;

  SELECT GREATEST(COALESCE(max(cnt), 0), 1) INTO v_max_votes
  FROM (SELECT count(*) AS cnt FROM public.votes WHERE round_id = v_round GROUP BY application_id) t;

  RETURN QUERY
  WITH judged AS (
    SELECT s.application_id,
           SUM(s.value / NULLIF(cr.max_score, 0) * cr.weight) / NULLIF(COUNT(DISTINCT s.judge_id), 0) AS pct
    FROM public.scores s
    JOIN public.scoring_criteria cr ON cr.id = s.criterion_id
    WHERE s.round_id = v_round
    GROUP BY s.application_id
  ), voted AS (
    SELECT application_id, count(*) AS cnt FROM public.votes WHERE round_id = v_round GROUP BY application_id
  )
  SELECT a.handle, a.display_name, c.name,
         ROUND(COALESCE(j.pct, 0), 2),
         COALESCE(v.cnt, 0),
         ROUND(
           COALESCE(j.pct, 0) * (v_comp.judge_weight / 100.0)
           + (COALESCE(v.cnt, 0) / v_max_votes * 100) * (v_comp.public_weight / 100.0)
         , 2)
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN judged j ON j.application_id = a.id
  LEFT JOIN voted v ON v.application_id = a.id
  WHERE a.competition_id = v_comp.id
  ORDER BY 6 DESC NULLS LAST;
END;
$$;
GRANT EXECUTE ON FUNCTION public.round_leaderboard(TEXT, TEXT) TO authenticated;

-- SEED: real Season One configuration ---------------------------------
INSERT INTO public.category_groups (slug, name, description, sort_order) VALUES
 ('music','Music','Voices, bars, beats and instruments. The sound of a generation.',1),
 ('performance','Performance','The stage arts — bodies, timing, words and nerve.',2),
 ('visual-creative','Visual / Creative','Image makers, stylists and directors of taste.',3),
 ('digital-tech','Digital / Tech','Screens, code and the new creative tools.',4),
 ('other-talent','Other Talent','Talent that refuses a box. Tell us what you do.',5);

INSERT INTO public.categories (group_id, slug, name, blurb, audition_hint, sort_order)
SELECT g.id, v.slug, v.name, v.blurb, v.hint, v.ord FROM (VALUES
 ('music','singing','Singing','Vocal performance across any genre.','One unedited vocal performance, 60–120 seconds.',1),
 ('music','rap','Rap','Bars, flow, delivery and presence.','One verse, live or over a beat, 60–120 seconds.',2),
 ('music','songwriting','Songwriting','Original writing, melody and lyric craft.','One original song plus lyric sheet.',3),
 ('music','instrumental','Instrumental','Any instrument, any tradition.','One continuous performance, 60–180 seconds.',4),
 ('music','music-production','Music Production','Beats, arrangement, mixing and sound design.','Two original productions plus a short process note.',5),
 ('music','dj','DJ','Selection, mixing and crowd control.','A 3-minute mix excerpt, video preferred.',6),
 ('performance','dance','Dance','Any style, solo or crew.','One full-body routine, 60–120 seconds.',1),
 ('performance','comedy','Comedy','Stand-up, sketch or character work.','One clean set excerpt, 90–180 seconds.',2),
 ('performance','spoken-word','Spoken Word','Poetry and performance text.','One original piece plus written text.',3),
 ('performance','acting','Acting','Monologue or scene work.','One monologue, 60–120 seconds.',4),
 ('performance','performance-art','Performance Art','Hybrid, experimental and conceptual work.','Documentation of one work plus a concept statement.',5),
 ('visual-creative','photography','Photography','Portrait, documentary, editorial, street.','A set of 8–12 images with titles.',1),
 ('visual-creative','visual-art','Visual Art','Painting, drawing, sculpture, mixed media.','5–8 works with medium and dimensions.',2),
 ('visual-creative','fashion','Fashion','Design, styling and construction.','One look book of 6+ images or 3 garments.',3),
 ('visual-creative','makeup','Makeup','Beauty, editorial and SFX.','3 completed looks, before and after.',4),
 ('visual-creative','creative-direction','Creative Direction','Concept, art direction and world building.','One campaign or project case study.',5),
 ('digital-tech','coding','Coding','Software, tools and creative engineering.','One working project plus a 2-minute walkthrough.',1),
 ('digital-tech','gaming','Gaming','Competitive play and gameplay craft.','One gameplay reel, 2–3 minutes.',2),
 ('digital-tech','animation','Animation','2D, 3D, motion and stop frame.','One animation, 30–120 seconds.',3),
 ('digital-tech','content-creation','Content Creation','Short form, storytelling and audience craft.','Three published pieces plus reach notes.',4),
 ('digital-tech','digital-art','Digital Art','Illustration, 3D and generative work.','6–10 works with tools listed.',5),
 ('other-talent','other','Other Talent','Anything extraordinary that does not fit above.','One demonstration plus a written description.',1)
) AS v(gslug, slug, name, blurb, hint, ord)
JOIN public.category_groups g ON g.slug = v.gslug;

INSERT INTO public.competitions (
  slug, name, tagline, description, status,
  starts_at, ends_at, registration_opens_at, registration_closes_at,
  eligibility, rules, consent_requirements, prize_pool, cities,
  voting_model, judge_weight, public_weight, votes_per_user_per_day, vote_rate_limit_per_minute
) VALUES (
  'season-one',
  'Zik''s Got Talent 2026',
  'Your talent deserves to be discovered.',
  'A national, multi-category talent search for singers, rappers, dancers, comedians, designers, photographers, animators, coders and creators. One season. Thousands of entries. One winner — and a creative identity that outlives the competition.',
  'REGISTRATION_OPEN',
  '2026-09-01T00:00:00Z','2026-12-20T00:00:00Z','2026-08-01T00:00:00Z','2026-10-15T23:59:00Z',
  ARRAY[
    'Open to individuals aged 16 and above.',
    'Entrants under 18 require verified guardian consent.',
    'One application per person per season.',
    'Audition material must be your own original work or properly licensed.'
  ],
  ARRAY[
    'One application per person, per season. Duplicate applications are removed.',
    'Audition media must be unedited for performance categories unless the category brief states otherwise.',
    'Any form of vote manipulation results in immediate disqualification.',
    'Judges'' scores are final within a round unless an integrity review is opened by an admin.',
    'Contestants keep ownership of their work; the competition receives a licence to feature approved media.'
  ],
  ARRAY[
    'I confirm the audition material is my own original work or properly licensed.',
    'I consent to my approved media being featured across Zik''s Got Talent channels.',
    'I understand my registration creates or connects a free ArtistrySynk creative profile.',
    'I accept the competition rules, eligibility criteria and privacy policy.'
  ],
  '₦25M+', 24, 'HYBRID', 70, 30, 3, 5
);

INSERT INTO public.competition_rounds (competition_id, slug, name, sequence, description, opens_at, closes_at, advancement_rule)
SELECT c.id, v.slug, v.name, v.seq, v.descr, v.o::timestamptz, v.cl::timestamptz, v.rule
FROM public.competitions c, (VALUES
 ('registration','Registration',1,'Choose your category, create your identity and open your application.','2026-08-01T00:00:00Z','2026-10-15T23:59:00Z','AUTOMATIC'),
 ('application-review','Application Review',2,'Moderators verify eligibility and audition material.','2026-08-15T00:00:00Z','2026-10-25T23:59:00Z','MANUAL'),
 ('audition','Audition',3,'Judges review submitted auditions per category.','2026-10-26T00:00:00Z','2026-11-05T23:59:00Z','SCORE_THRESHOLD'),
 ('top-100','Top 100',4,'The first national shortlist.',NULL,NULL,'TOP_N:100'),
 ('top-50','Top 50',5,'Category semi-finals.',NULL,NULL,'TOP_N:50'),
 ('top-20','Top 20',6,'Live rounds begin. Public voting opens.',NULL,NULL,'TOP_N:20'),
 ('top-10','Top 10',7,'The final stretch.',NULL,NULL,'TOP_N:10'),
 ('final','Final',8,'The finale, judged live with a hybrid public vote.',NULL,NULL,'TOP_N:3'),
 ('winner','Winner',9,'One winner announced.',NULL,NULL,'TOP_N:1')
) AS v(slug, name, seq, descr, o, cl, rule)
WHERE c.slug = 'season-one';

UPDATE public.competitions c
   SET current_round_id = r.id
  FROM public.competition_rounds r
 WHERE r.competition_id = c.id AND r.slug = 'registration' AND c.slug = 'season-one';

INSERT INTO public.scoring_criteria (competition_id, name, max_score, weight, sort_order)
SELECT c.id, v.name, 10, v.weight, v.ord
FROM public.competitions c, (VALUES
 ('Talent',25,1),('Creativity',20,2),('Originality',20,3),
 ('Stage Presence',15,4),('Technical Ability',15,5),('Overall',5,6)
) AS v(name, weight, ord)
WHERE c.slug = 'season-one';

INSERT INTO public.sponsors (name, tier, description, website, placements, sort_order) VALUES
 ('ArtistrySynk','MAJOR_SPONSOR','The creative identity platform behind Zik''s Got Talent. Every contestant leaves with an ArtistrySynk creative profile.','https://artistrysynk.app',ARRAY['HERO','HEADER','FOOTER','SPONSOR_PAGE'],1),
 ('New Flava','MAJOR_SPONSOR','Fuelling the stage, the crew and the contestants across every round.','https://example.com',ARRAY['HERO','FOOTER','SPONSOR_PAGE'],2);

INSERT INTO public.announcements (competition_id, title, body, audience, is_pinned, published_at)
SELECT c.id, v.title, v.body, v.audience, v.pinned, v.pub::timestamptz
FROM public.competitions c, (VALUES
 ('Registration is open for Season One','Applications are open across 22 categories in five groups. Registration closes 15 October — auditions are reviewed continuously, so early entries get earlier feedback.','PUBLIC',true,'2026-08-01T09:00:00Z'),
 ('ArtistrySynk × New Flava announced as major sponsors','Season One is powered by ArtistrySynk and New Flava, with supporting sponsors and media partners announced through the season.','PUBLIC',false,'2026-08-04T12:00:00Z'),
 ('Audition briefs published per category','Each category now has its own audition brief and length limit. Check your category page before you record.','CONTESTANTS',false,'2026-08-08T15:30:00Z')
) AS v(title, body, audience, pinned, pub)
WHERE c.slug = 'season-one';

INSERT INTO public.badges (slug, name, description) VALUES
 ('season-one-entrant','Season One Entrant','Completed a Season One application.'),
 ('top-100','Top 100','Selected for the first national shortlist.'),
 ('finalist','Finalist','Reached the Season One final.'),
 ('winner','Winner','Winner of Zik''s Got Talent.');
