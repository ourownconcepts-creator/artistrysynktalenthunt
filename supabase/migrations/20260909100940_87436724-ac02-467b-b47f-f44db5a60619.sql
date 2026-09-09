
CREATE OR REPLACE FUNCTION public.judge_queue(_competition_slug TEXT DEFAULT 'season-one')
RETURNS TABLE (
  application_id UUID,
  handle TEXT,
  display_name TEXT,
  category_name TEXT,
  bio TEXT,
  experience TEXT,
  audition_url TEXT,
  audition_notes TEXT,
  status TEXT,
  round_id UUID,
  round_name TEXT,
  my_scored_criteria BIGINT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.handle, a.display_name, c.name, a.bio, a.experience,
         a.audition_url, a.audition_notes, a.status,
         COALESCE(a.current_round_id, comp.current_round_id),
         COALESCE(r.name, 'Registration'),
         (SELECT count(*) FROM public.scores s
           WHERE s.application_id = a.id AND s.judge_id = auth.uid())
  FROM public.applications a
  JOIN public.competitions comp ON comp.id = a.competition_id
  JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN public.competition_rounds r ON r.id = COALESCE(a.current_round_id, comp.current_round_id)
  WHERE comp.slug = _competition_slug
    AND (public.is_staff(auth.uid()) OR public.judge_can_score(auth.uid(), a.id))
  ORDER BY a.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.judge_queue(TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.judge_queue(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.advance_application(_application_id UUID, _outcome TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app public.applications;
  v_current UUID;
  v_seq INTEGER;
  v_next public.competition_rounds;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _outcome NOT IN ('ADVANCED','ELIMINATED','HELD') THEN
    RAISE EXCEPTION 'invalid outcome';
  END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF v_app.id IS NULL THEN RAISE EXCEPTION 'application not found'; END IF;

  SELECT COALESCE(v_app.current_round_id, c.current_round_id) INTO v_current
    FROM public.competitions c WHERE c.id = v_app.competition_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'no active round'; END IF;

  INSERT INTO public.round_results (application_id, round_id, outcome, decided_by)
  VALUES (_application_id, v_current, _outcome, auth.uid())
  ON CONFLICT (application_id, round_id)
  DO UPDATE SET outcome = EXCLUDED.outcome, decided_by = EXCLUDED.decided_by, decided_at = now();

  IF _outcome = 'ADVANCED' THEN
    SELECT sequence INTO v_seq FROM public.competition_rounds WHERE id = v_current;
    SELECT * INTO v_next FROM public.competition_rounds
      WHERE competition_id = v_app.competition_id AND sequence > v_seq AND is_active
      ORDER BY sequence LIMIT 1;
    IF v_next.id IS NOT NULL THEN
      UPDATE public.applications
         SET current_round_id = v_next.id, status = 'APPROVED', updated_at = now()
       WHERE id = _application_id;
    END IF;
  ELSIF _outcome = 'ELIMINATED' THEN
    UPDATE public.applications SET status = 'ELIMINATED', updated_at = now() WHERE id = _application_id;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'round.decision', 'application', _application_id::text,
          jsonb_build_object('outcome', _outcome, 'round_id', v_current));

  RETURN jsonb_build_object('ok', true, 'outcome', _outcome);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.advance_application(UUID, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_application(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('SUPER_ADMIN','ADMIN')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_CLAIMED');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'SUPER_ADMIN')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (v_user, 'role.claim_first_admin', 'user_roles', v_user::text, '{}');
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
