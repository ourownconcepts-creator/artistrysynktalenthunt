-- 1. Competition context ----------------------------------------------------
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

UPDATE public.competitions SET is_featured = true
WHERE id = (
  SELECT id FROM public.competitions WHERE status <> 'DRAFT'
  ORDER BY created_at LIMIT 1
) AND NOT EXISTS (SELECT 1 FROM public.competitions WHERE is_featured);

CREATE OR REPLACE FUNCTION public.active_competition_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.competitions
  WHERE status <> 'DRAFT'
  ORDER BY is_featured DESC,
    CASE status
      WHEN 'OPEN_FOR_ENTRIES' THEN 0
      WHEN 'REGISTRATION_OPEN' THEN 0
      WHEN 'IN_PROGRESS' THEN 1
      WHEN 'VOTING_OPEN' THEN 1
      WHEN 'ANNOUNCED' THEN 2
      WHEN 'REGISTRATION_CLOSED' THEN 2
      WHEN 'COMPLETED' THEN 3
      ELSE 4
    END,
    coalesce(starts_at, created_at) DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.active_competition_slug()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT slug FROM public.competitions WHERE id = public.active_competition_id()
$$;

-- 2. Categories -------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligibility text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS categories_competition_idx ON public.categories(competition_id);

-- 3. Category-specific submission requirements ------------------------------
CREATE TABLE IF NOT EXISTS public.category_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'URL',
  help_text text NOT NULL DEFAULT '',
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_requirements_kind_check
    CHECK (kind IN ('URL','TEXT','LONG_TEXT','NUMBER','DATE','FILE_URL','IMAGE_URL_LIST')),
  UNIQUE (category_id, key)
);

GRANT SELECT ON public.category_requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_requirements TO authenticated;
GRANT ALL ON public.category_requirements TO service_role;
ALTER TABLE public.category_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requirements public read" ON public.category_requirements
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "requirements admin write" ON public.category_requirements
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS category_requirements_category_idx
  ON public.category_requirements(category_id, sort_order);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER category_requirements_updated_at
  BEFORE UPDATE ON public.category_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: every active category keeps its existing audition brief as a requirement.
INSERT INTO public.category_requirements (category_id, key, label, kind, help_text, is_required, sort_order)
SELECT c.id, 'audition_url', 'Audition media link', 'URL',
       coalesce(nullif(c.audition_hint, ''), 'Paste a link to your audition media.'), true, 0
FROM public.categories c
ON CONFLICT (category_id, key) DO NOTHING;

-- 4. Entry answers for those requirements -----------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS submission_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Rounds -----------------------------------------------------------------
ALTER TABLE public.competition_rounds
  ADD COLUMN IF NOT EXISTS judging_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voting_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_requirements text NOT NULL DEFAULT '';

-- 6. Scoring criteria per round ---------------------------------------------
ALTER TABLE public.scoring_criteria
  ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL;

-- 7. Sponsors per competition ----------------------------------------------
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL;

-- 8. Announcements ----------------------------------------------------------
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

DROP POLICY IF EXISTS "announcements public read" ON public.announcements;
DROP POLICY IF EXISTS "announcements member read" ON public.announcements;

CREATE POLICY "announcements public read" ON public.announcements
  FOR SELECT TO anon
  USING (audience = 'PUBLIC' AND is_published AND published_at <= now());

CREATE POLICY "announcements member read" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_staff(auth.uid())
    OR (
      is_published AND published_at <= now() AND (
        audience = 'PUBLIC'
        OR (audience = 'CONTESTANTS' AND EXISTS (
              SELECT 1 FROM public.applications a WHERE a.user_id = auth.uid()))
        OR (audience = 'JUDGES' AND has_role(auth.uid(), 'JUDGE'::app_role))
      )
    )
  );

-- 9. Badges -----------------------------------------------------------------
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS competition_id uuid REFERENCES public.competitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS award_condition text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 10. Role granting for any competition -------------------------------------
DROP FUNCTION IF EXISTS public.grant_role_by_email(text, app_role);

CREATE OR REPLACE FUNCTION public.grant_role_by_email(
  _email text, _role app_role, _competition_slug text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _competition uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SUCH_USER');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'JUDGE'::app_role THEN
    SELECT id INTO _competition FROM public.competitions
     WHERE _competition_slug IS NOT NULL AND slug = _competition_slug;
    IF _competition IS NULL THEN
      _competition := public.active_competition_id();
    END IF;
    IF _competition IS NOT NULL THEN
      INSERT INTO public.judge_assignments (judge_id, competition_id)
      SELECT _uid, _competition
      WHERE NOT EXISTS (
        SELECT 1 FROM public.judge_assignments ja
        WHERE ja.judge_id = _uid AND ja.competition_id = _competition
          AND ja.category_id IS NULL
      );
    END IF;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'role.grant', 'user_roles', _uid::text,
          jsonb_build_object('role', _role, 'email', _email, 'competition', _competition));

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_role_by_email(_email text, _role app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;
  IF _role IN ('SUPER_ADMIN'::app_role) AND NOT public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_PERMITTED');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SUCH_USER');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;

  IF _role = 'JUDGE'::app_role THEN
    DELETE FROM public.judge_assignments WHERE judge_id = _uid;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'role.revoke', 'user_roles', _uid::text,
          jsonb_build_object('role', _role, 'email', _email));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 11. Read-only admin viewers ----------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_feed(
  _action text DEFAULT NULL,
  _entity text DEFAULT NULL,
  _actor_email text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit integer DEFAULT 200
) RETURNS TABLE (
  id uuid, created_at timestamptz, action text, entity text, entity_id text,
  actor_email text, detail jsonb
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
  SELECT l.id, l.created_at, l.action, l.entity, l.entity_id,
         u.email::text, l.detail
  FROM public.audit_log l
  LEFT JOIN auth.users u ON u.id = l.actor_id
  WHERE (_action IS NULL OR l.action ILIKE '%' || _action || '%')
    AND (_entity IS NULL OR l.entity = _entity)
    AND (_entity_id IS NULL OR l.entity_id = _entity_id)
    AND (_actor_email IS NULL OR u.email ILIKE '%' || _actor_email || '%')
    AND (_from IS NULL OR l.created_at >= _from)
    AND (_to IS NULL OR l.created_at <= _to)
  ORDER BY l.created_at DESC
  LIMIT least(coalesce(_limit, 200), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_judge_assignments(_competition_slug text DEFAULT NULL)
RETURNS TABLE (
  assignment_id uuid, judge_id uuid, judge_email text, judge_name text,
  competition_id uuid, competition_name text, category_id uuid, category_name text,
  created_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
  SELECT ja.id, ja.judge_id, u.email::text, coalesce(p.display_name, ''),
         ja.competition_id, c.name, ja.category_id, coalesce(cat.name, 'All categories'),
         ja.created_at
  FROM public.judge_assignments ja
  JOIN public.competitions c ON c.id = ja.competition_id
  LEFT JOIN auth.users u ON u.id = ja.judge_id
  LEFT JOIN public.profiles p ON p.id = ja.judge_id
  LEFT JOIN public.categories cat ON cat.id = ja.category_id
  WHERE _competition_slug IS NULL OR c.slug = _competition_slug
  ORDER BY c.name, u.email, cat.name NULLS FIRST;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_feed(text, text, text, text, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_judge_assignments(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_role_by_email(text, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_role_by_email(text, app_role, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.audit_feed(text, text, text, text, timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_judge_assignments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role_by_email(text, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_role_by_email(text, app_role, text) TO authenticated;