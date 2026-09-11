-- Moderators flag an entry for review or ask for a correction; they never change
-- progression state or admission status. Administrators still admit or reject.
CREATE OR REPLACE FUNCTION public.review_application(_application_id uuid, _decision text, _reason text DEFAULT ''::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_app public.applications; v_prev text; v_state text; v_is_admin boolean;
BEGIN
  IF _decision NOT IN ('APPROVED','REJECTED','CORRECTION_REQUESTED','UNDER_REVIEW') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_DECISION');
  END IF;

  v_is_admin := public.can_manage_progression(auth.uid());

  IF _decision IN ('APPROVED','REJECTED') THEN
    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
    END IF;
  ELSIF NOT public.is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF v_app.progress_state IN ('WITHDRAWN','DISQUALIFIED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ENTRY_CLOSED');
  END IF;
  v_prev := v_app.progress_state;

  IF NOT v_is_admin THEN
    -- Moderator path: record the review note only, leave the result untouched.
    UPDATE public.applications
       SET review_decision = _decision,
           review_reason = coalesce(_reason,''),
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           updated_at = now()
     WHERE id = _application_id;
    v_state := v_prev;
  ELSE
    v_state := CASE _decision
      WHEN 'APPROVED' THEN 'APPROVED'
      WHEN 'REJECTED' THEN 'ELIMINATED'
      WHEN 'CORRECTION_REQUESTED' THEN 'SUBMITTED'
      ELSE 'UNDER_REVIEW' END;

    UPDATE public.applications
       SET review_decision = _decision,
           review_reason = coalesce(_reason,''),
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           progress_state = v_state,
           status = CASE _decision
             WHEN 'APPROVED' THEN 'APPROVED'
             WHEN 'REJECTED' THEN 'ELIMINATED'
             WHEN 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
             ELSE 'SUBMITTED' END,
           is_public = CASE WHEN _decision = 'APPROVED' THEN true
                            WHEN _decision = 'REJECTED' THEN false ELSE is_public END,
           current_round_id = COALESCE(v_app.current_round_id,
             (SELECT current_round_id FROM public.competitions WHERE id = v_app.competition_id)),
           updated_at = now()
     WHERE id = _application_id;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'application.review', 'application', _application_id::text,
    jsonb_build_object('decision', _decision, 'reason', coalesce(_reason,''),
      'competition_id', v_app.competition_id, 'category_id', v_app.category_id,
      'previous_state', v_prev, 'new_state', v_state,
      'moderator_note_only', NOT v_is_admin));

  RETURN jsonb_build_object('ok', true, 'decision', _decision, 'new_state', v_state,
    'note_only', NOT v_is_admin);
END $function$;

REVOKE ALL ON FUNCTION public.review_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_application(uuid, text, text) TO authenticated;
