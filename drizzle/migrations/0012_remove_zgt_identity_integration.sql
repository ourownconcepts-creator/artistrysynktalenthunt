-- Remove the former standalone ZGT identity/integration layer.
-- Talent Hunt is now a directory surface inside ArtistrySynk and uses the
-- platform's authenticated user identity directly.

DROP FUNCTION IF EXISTS public.artistrysynk_apply_link(uuid, text);
DROP FUNCTION IF EXISTS public.profiles_guard_identity();
DROP TRIGGER IF EXISTS profiles_guard_identity ON public.profiles;

DROP TRIGGER IF EXISTS artistrysynk_links_touch ON public.artistrysynk_links;
DROP TABLE IF EXISTS public.artistrysynk_link_intents;
DROP TABLE IF EXISTS public.artistrysynk_links;

DROP INDEX IF EXISTS public.profiles_artistrysynk_identity_ref_key;
DROP INDEX IF EXISTS public.artistrysynk_links_identity_idx;
DROP INDEX IF EXISTS public.artistrysynk_links_identity_connected_key;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS artistrysynk_identity_ref,
  DROP COLUMN IF EXISTS artistrysynk_provider;

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS artistrysynk_identity_ref,
  DROP COLUMN IF EXISTS artistrysynk_provider;

-- Restore the normal application update guard after removing the old
-- identity-link bypass.
CREATE OR REPLACE FUNCTION public.applications_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.can_manage_progression(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.progress_state IS DISTINCT FROM OLD.progress_state
       OR NEW.is_public IS DISTINCT FROM OLD.is_public
       OR NEW.current_round_id IS DISTINCT FROM OLD.current_round_id THEN
      INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (auth.uid(), 'application.update', 'application', OLD.id::text,
        jsonb_build_object(
          'before', jsonb_build_object('status', OLD.status, 'progress_state', OLD.progress_state,
                                       'is_public', OLD.is_public, 'current_round_id', OLD.current_round_id),
          'after', jsonb_build_object('status', NEW.status, 'progress_state', NEW.progress_state,
                                      'is_public', NEW.is_public, 'current_round_id', NEW.current_round_id)));
    END IF;
    RETURN NEW;
  END IF;

  IF public.is_staff(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.progress_state IS DISTINCT FROM OLD.progress_state
       OR NEW.current_round_id IS DISTINCT FROM OLD.current_round_id
       OR NEW.is_public IS DISTINCT FROM OLD.is_public THEN
      RAISE EXCEPTION 'moderators cannot change competition progression or results';
    END IF;
    IF NEW.submission_state IS DISTINCT FROM OLD.submission_state THEN
      INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (auth.uid(), 'submission.moderate', 'application', OLD.id::text,
        jsonb_build_object('previous_state', OLD.submission_state, 'new_state', NEW.submission_state));
    END IF;
    NEW.media_is_public := OLD.media_is_public;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.competition_id IS DISTINCT FROM OLD.competition_id THEN
    RAISE EXCEPTION 'entry ownership cannot be changed';
  END IF;
  IF OLD.status NOT IN ('DRAFT','SUBMITTED') THEN
    RAISE EXCEPTION 'this entry is locked and can only be changed by competition staff';
  END IF;

  NEW.status := OLD.status;
  NEW.progress_state := OLD.progress_state;
  NEW.is_public := OLD.is_public;
  NEW.current_round_id := OLD.current_round_id;
  NEW.handle := OLD.handle;
  NEW.submitted_at := OLD.submitted_at;
  NEW.submission_state := OLD.submission_state;
  NEW.media_is_public := OLD.media_is_public;
  NEW.review_decision := OLD.review_decision;
  NEW.review_reason := OLD.review_reason;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

-- Remove ArtistrySynk-specific output from the admin account RPC.
DROP FUNCTION IF EXISTS public.admin_accounts(text, integer);

CREATE OR REPLACE FUNCTION public.admin_accounts(_search text DEFAULT NULL::text, _limit integer DEFAULT 200)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  handle text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  is_owner boolean,
  roles text[],
  entry_reference text,
  entry_name text,
  entry_category text,
  entry_progress_state text,
  entry_submission_state text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id,
         u.email::text,
         coalesce(p.display_name, ''),
         p.handle,
         u.created_at,
         u.email_confirmed_at,
         u.last_sign_in_at,
         lower(u.email) = public.owner_admin_email(),
         coalesce((SELECT array_agg(ur.role::text ORDER BY ur.role::text)
                     FROM public.user_roles ur WHERE ur.user_id = u.id), '{}'::text[]),
         a.reference_code,
         a.display_name,
         cat.name,
         a.progress_state,
         a.submission_state
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT ap.* FROM public.applications ap
     WHERE ap.user_id = u.id ORDER BY ap.created_at DESC LIMIT 1
  ) a ON true
  LEFT JOIN public.categories cat ON cat.id = a.category_id
  WHERE public.is_admin(auth.uid())
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR coalesce(p.display_name, '') ILIKE '%' || _search || '%'
         OR coalesce(a.reference_code, '') ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT least(coalesce(_limit, 200), 500);
$$;

REVOKE ALL ON FUNCTION public.admin_accounts(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_accounts(text, integer) TO authenticated;

-- Remove ArtistrySynk identity data from admin entry detail responses.
CREATE OR REPLACE FUNCTION public.admin_entry_detail(_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_SIGNED_IN');
  END IF;

  IF NOT (public.is_staff(_uid) OR public.has_role(_uid, 'JUDGE')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'FORBIDDEN');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id', a.id, 'reference_code', a.reference_code, 'display_name', a.display_name,
      'handle', a.handle, 'category_name', c.name, 'group_name', cg.name,
      'competition_name', comp.name, 'round_name', COALESCE(r.name, ''),
      'status', a.status, 'progress_state', a.progress_state,
      'submission_state', a.submission_state, 'media_is_public', a.media_is_public,
      'is_public', a.is_public, 'review_decision', a.review_decision,
      'review_reason', a.review_reason, 'reviewed_at', a.reviewed_at,
      'state_reason', a.state_reason, 'location', a.location, 'bio', a.bio,
      'experience', a.experience, 'audition_url', a.audition_url,
      'audition_notes', a.audition_notes, 'submission_answers', a.submission_answers,
      'created_at', a.created_at, 'submitted_at', a.submitted_at, 'updated_at', a.updated_at
    ),
    'profile', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
      'display_name', p.display_name, 'handle', p.handle, 'bio', p.bio,
      'location', p.location, 'primary_discipline', p.primary_discipline,
      'avatar_url', p.avatar_url, 'is_public', p.is_public
    ) END,
    'criteria', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'sort_order', x->>'name')
      FROM (
        SELECT jsonb_build_object(
          'id', sc.id, 'name', sc.name, 'max_score', sc.max_score,
          'weight', sc.weight, 'sort_order', sc.sort_order,
          'average', ROUND(AVG(s.value), 2), 'judges_scored', COUNT(s.id)
        ) AS x
        FROM public.scoring_criteria sc
        LEFT JOIN public.scores s ON s.criterion_id = sc.id AND s.application_id = a.id
        WHERE sc.competition_id = a.competition_id AND sc.is_active
        GROUP BY sc.id, sc.name, sc.max_score, sc.weight, sc.sort_order
      ) q
    ), '[]'::jsonb),
    'scores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'criterion_name', sc2.name, 'value', s2.value,
        'max_score', sc2.max_score, 'comment', s2.comment,
        'round_name', COALESCE(r2.name, ''), 'updated_at', s2.updated_at
      ) ORDER BY s2.updated_at DESC)
      FROM public.scores s2
      JOIN public.scoring_criteria sc2 ON sc2.id = s2.criterion_id
      LEFT JOIN public.competition_rounds r2 ON r2.id = s2.round_id
      WHERE s2.application_id = a.id
    ), '[]'::jsonb),
    'judges_scored', (SELECT COUNT(DISTINCT s3.judge_id) FROM public.scores s3 WHERE s3.application_id = a.id),
    'valid_votes', (SELECT COUNT(*) FROM public.votes v WHERE v.application_id = a.id AND v.voided_at IS NULL),
    'results', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'round_name', r3.name, 'outcome', rr.outcome, 'decided_at', rr.decided_at
      ) ORDER BY r3.sequence)
      FROM public.round_results rr
      JOIN public.competition_rounds r3 ON r3.id = rr.round_id
      WHERE rr.application_id = a.id
    ), '[]'::jsonb)
  )
  INTO _result
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  JOIN public.category_groups cg ON cg.id = c.group_id
  JOIN public.competitions comp ON comp.id = a.competition_id
  LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.id = _application_id;

  IF _result IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_entry_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_entry_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_entry_detail(uuid) TO service_role;

-- The former ZGT-specific owner address is no longer part of the product.
CREATE OR REPLACE FUNCTION public.owner_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 'admin@artistrysynk.app'::text $$;
