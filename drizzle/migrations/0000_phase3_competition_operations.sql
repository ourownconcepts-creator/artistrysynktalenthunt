-- ============================================================
-- PHASE 3: COMPETITION OPERATIONS
-- Lifecycle, progression, judging deadlines, score corrections,
-- round completion, application/submission review, vote operations.
-- ============================================================

-- ---------- schema: rounds ----------
ALTER TABLE public.competition_rounds
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS judging_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS judging_closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ---------- schema: applications ----------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS progress_state text NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN IF NOT EXISTS submission_state text NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN IF NOT EXISTS media_is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_decision text,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS state_reason text;

-- backfill runs as the migration owner, so the contestant-facing entry guard
-- is suspended for the duration of the data move only
ALTER TABLE public.applications DISABLE TRIGGER applications_guard_update;

UPDATE public.applications SET progress_state = CASE
  WHEN status = 'DRAFT' THEN 'APPLIED'
  WHEN status = 'SUBMITTED' THEN 'SUBMITTED'
  WHEN status = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
  WHEN status = 'APPROVED' THEN 'APPROVED'
  WHEN status = 'ELIMINATED' THEN 'ELIMINATED'
  ELSE 'SUBMITTED' END;

ALTER TABLE public.applications ENABLE TRIGGER applications_guard_update;

-- ---------- schema: votes ----------
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;

-- ---------- schema: score corrections (append-only history) ----------
CREATE TABLE IF NOT EXISTS public.score_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id uuid NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.scoring_criteria(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES auth.users(id),
  previous_value numeric NOT NULL,
  corrected_value numeric NOT NULL,
  reason text NOT NULL,
  corrected_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.score_corrections TO authenticated;
GRANT ALL ON public.score_corrections TO service_role;
ALTER TABLE public.score_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corrections admin read" ON public.score_corrections;
CREATE POLICY "corrections admin read" ON public.score_corrections
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS score_corrections_score_idx ON public.score_corrections(score_id);
CREATE INDEX IF NOT EXISTS applications_competition_status_idx ON public.applications(competition_id, status);
CREATE INDEX IF NOT EXISTS applications_current_round_idx ON public.applications(current_round_id);
CREATE INDEX IF NOT EXISTS scores_round_idx ON public.scores(round_id);
CREATE INDEX IF NOT EXISTS round_results_round_idx ON public.round_results(round_id);

-- ============================================================
-- AUTHORITY: progression authority is ADMIN only (never MODERATOR)
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_progression(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('SUPER_ADMIN','ADMIN')
  );
$$;

-- ============================================================
-- COMPETITION LIFECYCLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.competition_status_allows(_from text, _to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _from = _to THEN true
    WHEN _from = 'DRAFT' THEN _to IN ('REGISTRATION_OPEN','ARCHIVED')
    WHEN _from = 'REGISTRATION_OPEN' THEN _to IN ('REGISTRATION_CLOSED','IN_PROGRESS','ARCHIVED')
    WHEN _from = 'REGISTRATION_CLOSED' THEN _to IN ('REGISTRATION_OPEN','IN_PROGRESS','ARCHIVED')
    WHEN _from = 'IN_PROGRESS' THEN _to IN ('VOTING_OPEN','COMPLETED','ARCHIVED')
    WHEN _from = 'VOTING_OPEN' THEN _to IN ('IN_PROGRESS','COMPLETED','ARCHIVED')
    WHEN _from = 'COMPLETED' THEN _to IN ('ARCHIVED')
    WHEN _from = 'ARCHIVED' THEN false
    ELSE _to IN ('DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','VOTING_OPEN','COMPLETED','ARCHIVED')
  END;
$$;

CREATE OR REPLACE FUNCTION public.competitions_status_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.can_manage_progression(auth.uid()) THEN
      RAISE EXCEPTION 'only competition administrators may change the competition state';
    END IF;
    IF NOT public.competition_status_allows(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'invalid competition state transition: % -> %', OLD.status, NEW.status;
    END IF;
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'competition.status', 'competition', OLD.id::text,
      jsonb_build_object('previous_state', OLD.status, 'new_state', NEW.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS competitions_status_guard ON public.competitions;
CREATE TRIGGER competitions_status_guard BEFORE UPDATE ON public.competitions
FOR EACH ROW EXECUTE FUNCTION public.competitions_status_guard();

CREATE OR REPLACE FUNCTION public.set_competition_status(_competition_id uuid, _status text, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  SELECT status INTO v_old FROM public.competitions WHERE id = _competition_id;
  IF v_old IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF NOT public.competition_status_allows(v_old, _status) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_TRANSITION', 'from', v_old, 'to', _status);
  END IF;
  UPDATE public.competitions SET status = _status, updated_at = now() WHERE id = _competition_id;
  IF coalesce(_reason,'') <> '' THEN
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'competition.status.reason', 'competition', _competition_id::text,
      jsonb_build_object('previous_state', v_old, 'new_state', _status, 'reason', _reason));
  END IF;
  RETURN jsonb_build_object('ok', true, 'previous_state', v_old, 'new_state', _status);
END $$;

-- ============================================================
-- ROUND LIFECYCLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.round_status_allows(_from text, _to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _from = _to THEN true
    WHEN _from = 'DRAFT' THEN _to IN ('OPEN')
    WHEN _from = 'OPEN' THEN _to IN ('DRAFT','JUDGING')
    WHEN _from = 'JUDGING' THEN _to IN ('OPEN','DECISION_PENDING')
    WHEN _from = 'DECISION_PENDING' THEN _to IN ('JUDGING','DECIDED')
    WHEN _from = 'DECIDED' THEN _to IN ('CLOSED')
    WHEN _from = 'CLOSED' THEN false
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.round_progress(_round_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comp uuid;
  v_in_round int; v_judged int; v_pending int; v_decisions int;
  v_advanced int; v_eliminated int; v_criteria int; v_judges int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  SELECT competition_id INTO v_comp FROM public.competition_rounds WHERE id = _round_id;
  IF v_comp IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;

  SELECT count(*) INTO v_criteria FROM public.scoring_criteria
   WHERE competition_id = v_comp AND is_active AND (round_id IS NULL OR round_id = _round_id);
  SELECT count(DISTINCT judge_id) INTO v_judges FROM public.judge_assignments WHERE competition_id = v_comp;

  SELECT count(*) INTO v_in_round FROM public.applications a
   JOIN public.competitions c ON c.id = a.competition_id
   WHERE a.competition_id = v_comp
     AND COALESCE(a.current_round_id, c.current_round_id) = _round_id
     AND a.progress_state NOT IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED');

  SELECT count(*) INTO v_judged FROM (
    SELECT a.id FROM public.applications a
    JOIN public.competitions c ON c.id = a.competition_id
    WHERE a.competition_id = v_comp
      AND COALESCE(a.current_round_id, c.current_round_id) = _round_id
      AND a.progress_state NOT IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED')
      AND v_criteria > 0
      AND (SELECT count(*) FROM public.scores s WHERE s.application_id = a.id AND s.round_id = _round_id) >= v_criteria
  ) t;

  v_pending := GREATEST(v_in_round - v_judged, 0);

  SELECT count(*) INTO v_decisions FROM public.round_results WHERE round_id = _round_id;
  SELECT count(*) INTO v_advanced FROM public.round_results WHERE round_id = _round_id AND outcome = 'ADVANCED';
  SELECT count(*) INTO v_eliminated FROM public.round_results WHERE round_id = _round_id AND outcome = 'ELIMINATED';

  RETURN jsonb_build_object(
    'ok', true,
    'contestants_in_round', v_in_round,
    'judging_complete', v_judged,
    'judging_pending', v_pending,
    'criteria_count', v_criteria,
    'assigned_judges', v_judges,
    'decisions', v_decisions,
    'advanced', v_advanced,
    'eliminated', v_eliminated,
    'unresolved', GREATEST(v_in_round - v_decisions, 0)
  );
END $$;

CREATE OR REPLACE FUNCTION public.set_round_status(_round_id uuid, _status text, _override boolean DEFAULT false, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_progress jsonb;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  SELECT status INTO v_old FROM public.competition_rounds WHERE id = _round_id;
  IF v_old IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF NOT public.round_status_allows(v_old, _status) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_TRANSITION', 'from', v_old, 'to', _status);
  END IF;

  IF _status IN ('DECIDED','CLOSED') AND NOT _override THEN
    v_progress := public.round_progress(_round_id);
    IF (v_progress->>'unresolved')::int > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'DECISIONS_INCOMPLETE', 'progress', v_progress);
    END IF;
    IF _status = 'DECIDED' AND (v_progress->>'judging_pending')::int > 0 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'JUDGING_INCOMPLETE', 'progress', v_progress);
    END IF;
  END IF;

  UPDATE public.competition_rounds
     SET status = _status,
         decided_at = CASE WHEN _status = 'DECIDED' THEN now() ELSE decided_at END,
         closed_at = CASE WHEN _status = 'CLOSED' THEN now() ELSE closed_at END
   WHERE id = _round_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'round.status', 'competition_round', _round_id::text,
    jsonb_build_object('previous_state', v_old, 'new_state', _status,
                       'override', _override, 'reason', coalesce(_reason,'')));

  RETURN jsonb_build_object('ok', true, 'previous_state', v_old, 'new_state', _status);
END $$;

-- ============================================================
-- CONTESTANT PROGRESSION
-- ============================================================
CREATE OR REPLACE FUNCTION public.progress_state_valid(_state text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _state IN ('APPLIED','SUBMITTED','UNDER_REVIEW','APPROVED','SHORTLISTED',
                    'ROUND_ACTIVE','ADVANCED','ELIMINATED','WITHDRAWN','DISQUALIFIED','WINNER');
$$;

CREATE OR REPLACE FUNCTION public.decide_round_result(_application_id uuid, _outcome text, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app public.applications;
  v_current uuid; v_seq int; v_next public.competition_rounds;
  v_prev_state text; v_new_state text; v_existing text;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF _outcome NOT IN ('ADVANCED','ELIMINATED','HELD') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_OUTCOME');
  END IF;

  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;

  IF v_app.progress_state IN ('WITHDRAWN','DISQUALIFIED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'CONTESTANT_INELIGIBLE', 'state', v_app.progress_state);
  END IF;

  SELECT COALESCE(v_app.current_round_id, c.current_round_id) INTO v_current
    FROM public.competitions c WHERE c.id = v_app.competition_id;
  IF v_current IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NO_ACTIVE_ROUND'); END IF;

  SELECT outcome INTO v_existing FROM public.round_results
   WHERE application_id = _application_id AND round_id = v_current;
  IF v_existing = _outcome AND _outcome <> 'HELD' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'DUPLICATE_DECISION', 'outcome', v_existing);
  END IF;

  v_prev_state := v_app.progress_state;

  INSERT INTO public.round_results (application_id, round_id, outcome, decided_by)
  VALUES (_application_id, v_current, _outcome, auth.uid())
  ON CONFLICT (application_id, round_id)
  DO UPDATE SET outcome = EXCLUDED.outcome, decided_by = EXCLUDED.decided_by, decided_at = now();

  IF _outcome = 'ADVANCED' THEN
    SELECT sequence INTO v_seq FROM public.competition_rounds WHERE id = v_current;
    SELECT * INTO v_next FROM public.competition_rounds
      WHERE competition_id = v_app.competition_id AND sequence > v_seq AND is_active
      ORDER BY sequence LIMIT 1;
    IF v_next.id IS NULL THEN
      v_new_state := 'WINNER';
      UPDATE public.applications
         SET progress_state = 'WINNER', state_reason = coalesce(_reason,''), updated_at = now()
       WHERE id = _application_id;
    ELSE
      v_new_state := 'ROUND_ACTIVE';
      UPDATE public.applications
         SET current_round_id = v_next.id, status = 'APPROVED', progress_state = 'ROUND_ACTIVE',
             state_reason = coalesce(_reason,''), updated_at = now()
       WHERE id = _application_id;
    END IF;
  ELSIF _outcome = 'ELIMINATED' THEN
    v_new_state := 'ELIMINATED';
    UPDATE public.applications
       SET status = 'ELIMINATED', progress_state = 'ELIMINATED',
           state_reason = coalesce(_reason,''), updated_at = now()
     WHERE id = _application_id;
  ELSE
    v_new_state := v_prev_state;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'progression.decision', 'application', _application_id::text,
    jsonb_build_object('outcome', _outcome, 'competition_id', v_app.competition_id,
      'category_id', v_app.category_id, 'round_id', v_current,
      'next_round_id', v_next.id, 'previous_state', v_prev_state,
      'new_state', v_new_state, 'reason', coalesce(_reason,'')));

  RETURN jsonb_build_object('ok', true, 'outcome', _outcome,
    'previous_state', v_prev_state, 'new_state', v_new_state, 'next_round_id', v_next.id);
END $$;

CREATE OR REPLACE FUNCTION public.advance_application(_application_id uuid, _outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.decide_round_result(_application_id, _outcome, '');
END $$;

CREATE OR REPLACE FUNCTION public.set_application_state(_application_id uuid, _state text, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app public.applications; v_prev text;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF NOT public.progress_state_valid(_state) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATE');
  END IF;
  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  v_prev := v_app.progress_state;

  UPDATE public.applications
     SET progress_state = _state,
         state_reason = coalesce(_reason,''),
         status = CASE
           WHEN _state IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED') THEN 'ELIMINATED'
           WHEN _state IN ('APPROVED','SHORTLISTED','ROUND_ACTIVE','ADVANCED','WINNER') THEN 'APPROVED'
           WHEN _state = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'
           ELSE status END,
         is_public = CASE WHEN _state IN ('WITHDRAWN','DISQUALIFIED') THEN false ELSE is_public END,
         updated_at = now()
   WHERE id = _application_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'progression.state', 'application', _application_id::text,
    jsonb_build_object('competition_id', v_app.competition_id, 'category_id', v_app.category_id,
      'round_id', v_app.current_round_id, 'previous_state', v_prev, 'new_state', _state,
      'reason', coalesce(_reason,'')));

  RETURN jsonb_build_object('ok', true, 'previous_state', v_prev, 'new_state', _state);
END $$;

-- ============================================================
-- APPLICATION + SUBMISSION REVIEW
-- ============================================================
CREATE OR REPLACE FUNCTION public.review_application(_application_id uuid, _decision text, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app public.applications; v_prev text; v_state text;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF _decision NOT IN ('APPROVED','REJECTED','CORRECTION_REQUESTED','UNDER_REVIEW') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_DECISION');
  END IF;
  SELECT * INTO v_app FROM public.applications WHERE id = _application_id;
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  v_prev := v_app.progress_state;

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

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'application.review', 'application', _application_id::text,
    jsonb_build_object('decision', _decision, 'reason', coalesce(_reason,''),
      'competition_id', v_app.competition_id, 'category_id', v_app.category_id,
      'previous_state', v_prev, 'new_state', v_state));

  RETURN jsonb_build_object('ok', true, 'decision', _decision, 'new_state', v_state);
END $$;

CREATE OR REPLACE FUNCTION public.review_submission(_application_id uuid, _state text, _reason text DEFAULT '', _publish boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev text; v_comp uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF _publish AND NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED_TO_PUBLISH');
  END IF;
  IF _state NOT IN ('PENDING_REVIEW','APPROVED','REJECTED','REVISION_REQUESTED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_STATE');
  END IF;

  SELECT submission_state, competition_id INTO v_prev, v_comp
    FROM public.applications WHERE id = _application_id;
  IF v_comp IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;

  UPDATE public.applications
     SET submission_state = _state,
         media_is_public = CASE WHEN _state = 'APPROVED' THEN _publish ELSE false END,
         updated_at = now()
   WHERE id = _application_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'submission.review', 'application', _application_id::text,
    jsonb_build_object('previous_state', v_prev, 'new_state', _state,
      'published', _state = 'APPROVED' AND _publish, 'reason', coalesce(_reason,''),
      'competition_id', v_comp));

  RETURN jsonb_build_object('ok', true, 'new_state', _state);
END $$;

CREATE OR REPLACE FUNCTION public.applications_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
          'after',  jsonb_build_object('status', NEW.status, 'progress_state', NEW.progress_state,
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
END $$;

CREATE OR REPLACE FUNCTION public.applications_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    IF NEW.status NOT IN ('DRAFT','SUBMITTED') THEN
      NEW.status := 'SUBMITTED';
    END IF;
    NEW.progress_state := CASE WHEN NEW.status = 'DRAFT' THEN 'APPLIED' ELSE 'SUBMITTED' END;
    NEW.submission_state := 'PENDING_REVIEW';
    NEW.media_is_public := false;
    NEW.review_decision := NULL;
    NEW.review_reason := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    SELECT c.current_round_id INTO NEW.current_round_id
      FROM public.competitions c WHERE c.id = NEW.competition_id;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- JUDGING DEADLINES + SCORE CORRECTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.scores_window_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.competition_rounds;
BEGIN
  IF public.can_manage_progression(auth.uid()) THEN RETURN NEW; END IF;

  SELECT * INTO r FROM public.competition_rounds WHERE id = NEW.round_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'round not found'; END IF;
  IF r.status IN ('DECIDED','CLOSED') THEN
    RAISE EXCEPTION 'this round is closed for judging';
  END IF;
  IF r.judging_opens_at IS NOT NULL AND now() < r.judging_opens_at THEN
    RAISE EXCEPTION 'judging for this round has not opened yet';
  END IF;
  IF r.judging_closes_at IS NOT NULL AND now() > r.judging_closes_at THEN
    RAISE EXCEPTION 'judging for this round has closed';
  END IF;
  IF r.score_deadline_at IS NOT NULL AND now() > r.score_deadline_at THEN
    RAISE EXCEPTION 'the score submission deadline for this round has passed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS scores_window_guard ON public.scores;
CREATE TRIGGER scores_window_guard BEFORE INSERT OR UPDATE ON public.scores
FOR EACH ROW EXECUTE FUNCTION public.scores_window_guard();

CREATE OR REPLACE FUNCTION public.correct_score(_score_id uuid, _value numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_score public.scores; v_max int;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF coalesce(trim(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REASON_REQUIRED');
  END IF;
  SELECT * INTO v_score FROM public.scores WHERE id = _score_id;
  IF v_score.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;

  SELECT max_score INTO v_max FROM public.scoring_criteria WHERE id = v_score.criterion_id;
  IF _value < 0 OR (v_max IS NOT NULL AND _value > v_max) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OUT_OF_RANGE', 'max_score', v_max);
  END IF;

  INSERT INTO public.score_corrections
    (score_id, application_id, round_id, criterion_id, judge_id,
     previous_value, corrected_value, reason, corrected_by)
  VALUES (v_score.id, v_score.application_id, v_score.round_id, v_score.criterion_id, v_score.judge_id,
          v_score.value, _value, trim(_reason), auth.uid());

  UPDATE public.scores SET value = _value, updated_at = now() WHERE id = _score_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'score.correction', 'score', _score_id::text,
    jsonb_build_object('application_id', v_score.application_id, 'round_id', v_score.round_id,
      'criterion_id', v_score.criterion_id, 'judge_id', v_score.judge_id,
      'before', v_score.value, 'after', _value, 'reason', trim(_reason)));

  RETURN jsonb_build_object('ok', true, 'before', v_score.value, 'after', _value);
END $$;

CREATE OR REPLACE FUNCTION public.list_score_corrections(_application_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, created_at timestamptz, application_id uuid, handle text, criterion_name text,
              judge_email text, previous_value numeric, corrected_value numeric, reason text, corrected_by_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  RETURN QUERY
  SELECT sc.id, sc.created_at, sc.application_id, a.handle, cr.name,
         ju.email::text, sc.previous_value, sc.corrected_value, sc.reason, au.email::text
  FROM public.score_corrections sc
  JOIN public.applications a ON a.id = sc.application_id
  JOIN public.scoring_criteria cr ON cr.id = sc.criterion_id
  LEFT JOIN auth.users ju ON ju.id = sc.judge_id
  LEFT JOIN auth.users au ON au.id = sc.corrected_by
  WHERE _application_id IS NULL OR sc.application_id = _application_id
  ORDER BY sc.created_at DESC;
END $$;

-- ============================================================
-- JUDGE DASHBOARD (own assignments only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.judge_dashboard(_competition_slug text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_judge uuid := auth.uid();
  v_comp public.competitions;
  v_round public.competition_rounds;
  v_criteria int; v_assigned int; v_scored int;
  v_categories jsonb;
BEGIN
  IF v_judge IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED'); END IF;

  SELECT c.* INTO v_comp FROM public.competitions c
   WHERE (_competition_slug IS NOT NULL AND c.slug = _competition_slug)
      OR (_competition_slug IS NULL AND c.id = public.active_competition_id())
   LIMIT 1;
  IF v_comp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NO_COMPETITION'); END IF;

  IF NOT EXISTS (SELECT 1 FROM public.judge_assignments
                  WHERE judge_id = v_judge AND competition_id = v_comp.id) THEN
    RETURN jsonb_build_object('ok', true, 'assigned', false, 'competition_name', v_comp.name);
  END IF;

  SELECT * INTO v_round FROM public.competition_rounds WHERE id = v_comp.current_round_id;

  SELECT count(*) INTO v_criteria FROM public.scoring_criteria
   WHERE competition_id = v_comp.id AND is_active
     AND (round_id IS NULL OR round_id = v_comp.current_round_id);

  SELECT count(*) INTO v_assigned FROM public.applications a
   WHERE a.competition_id = v_comp.id
     AND public.judge_can_score(v_judge, a.id)
     AND a.progress_state NOT IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED');

  SELECT count(*) INTO v_scored FROM (
    SELECT a.id FROM public.applications a
     WHERE a.competition_id = v_comp.id
       AND public.judge_can_score(v_judge, a.id)
       AND a.progress_state NOT IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED')
       AND v_criteria > 0
       AND (SELECT count(*) FROM public.scores s
             WHERE s.application_id = a.id AND s.judge_id = v_judge
               AND s.round_id = COALESCE(a.current_round_id, v_comp.current_round_id)) >= v_criteria
  ) t;

  SELECT coalesce(jsonb_agg(jsonb_build_object('category', name) ORDER BY name), '[]'::jsonb)
    INTO v_categories
  FROM (SELECT DISTINCT coalesce(cat.name, 'All categories') AS name
        FROM public.judge_assignments ja
        LEFT JOIN public.categories cat ON cat.id = ja.category_id
        WHERE ja.judge_id = v_judge AND ja.competition_id = v_comp.id) s;

  RETURN jsonb_build_object(
    'ok', true, 'assigned', true,
    'competition_name', v_comp.name, 'competition_slug', v_comp.slug,
    'competition_status', v_comp.status,
    'round_name', coalesce(v_round.name, 'No active round'),
    'round_status', coalesce(v_round.status, 'DRAFT'),
    'judging_opens_at', v_round.judging_opens_at,
    'judging_closes_at', v_round.judging_closes_at,
    'score_deadline_at', v_round.score_deadline_at,
    'criteria_count', v_criteria,
    'assigned_count', v_assigned,
    'scored_count', v_scored,
    'pending_count', GREATEST(v_assigned - v_scored, 0),
    'completion_pct', CASE WHEN v_assigned = 0 THEN 0
                           ELSE round((v_scored::numeric / v_assigned) * 100) END,
    'scopes', v_categories
  );
END $$;

-- ============================================================
-- VOTING OPERATIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_vote(_handle text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_app public.applications;
  v_comp public.competitions;
  v_round uuid;
  v_today int; v_minute int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED'); END IF;

  SELECT * INTO v_app FROM public.applications
   WHERE handle = _handle AND is_public AND status IN ('APPROVED','UNDER_REVIEW');
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF v_app.progress_state IN ('WITHDRAWN','DISQUALIFIED','ELIMINATED') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;
  IF v_app.user_id = v_user THEN RETURN jsonb_build_object('ok', false, 'reason', 'SELF_VOTE'); END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = v_app.competition_id;

  IF v_comp.voting_model = 'JUDGES_ONLY' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;
  IF v_comp.status NOT IN ('VOTING_OPEN','IN_PROGRESS') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;
  IF v_comp.voting_opens_at IS NULL OR v_comp.voting_closes_at IS NULL
     OR now() < v_comp.voting_opens_at OR now() > v_comp.voting_closes_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED');
  END IF;

  v_round := COALESCE(v_app.current_round_id, v_comp.current_round_id);
  IF v_round IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'WINDOW_CLOSED'); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 42));

  SELECT count(*) INTO v_minute FROM public.votes
   WHERE voter_id = v_user AND voided_at IS NULL AND created_at > now() - interval '1 minute';
  IF v_minute >= v_comp.vote_rate_limit_per_minute THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RATE_LIMITED');
  END IF;

  SELECT count(*) INTO v_today FROM public.votes
   WHERE voter_id = v_user AND voided_at IS NULL AND vote_day = (now() AT TIME ZONE 'utc')::date;
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
    'voteCount', (SELECT count(*) FROM public.votes
                   WHERE application_id = v_app.id AND voided_at IS NULL)
  );
END $$;

CREATE OR REPLACE FUNCTION public.set_voting_window(_competition_id uuid, _opens_at timestamptz, _closes_at timestamptz, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old_open timestamptz; v_old_close timestamptz;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  SELECT voting_opens_at, voting_closes_at INTO v_old_open, v_old_close
    FROM public.competitions WHERE id = _competition_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF _opens_at IS NOT NULL AND _closes_at IS NOT NULL AND _closes_at <= _opens_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_WINDOW');
  END IF;

  UPDATE public.competitions
     SET voting_opens_at = _opens_at, voting_closes_at = _closes_at, updated_at = now()
   WHERE id = _competition_id;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'voting.window', 'competition', _competition_id::text,
    jsonb_build_object('before', jsonb_build_object('opens_at', v_old_open, 'closes_at', v_old_close),
                       'after', jsonb_build_object('opens_at', _opens_at, 'closes_at', _closes_at),
                       'reason', coalesce(_reason,'')));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.close_voting_now(_competition_id uuid, _reason text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  UPDATE public.competitions SET voting_closes_at = now(), updated_at = now() WHERE id = _competition_id;
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'voting.close', 'competition', _competition_id::text,
          jsonb_build_object('reason', coalesce(_reason,'')));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.vote_totals(_competition_slug text DEFAULT NULL, _round_id uuid DEFAULT NULL, _category_id uuid DEFAULT NULL)
RETURNS TABLE(application_id uuid, handle text, display_name text, category_name text, round_name text,
              valid_votes bigint, voided_votes bigint, distinct_voters bigint, last_vote_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  RETURN QUERY
  SELECT a.id, a.handle, a.display_name, cat.name, coalesce(r.name, 'Registration'),
         count(v.id) FILTER (WHERE v.voided_at IS NULL),
         count(v.id) FILTER (WHERE v.voided_at IS NOT NULL),
         count(DISTINCT v.voter_id) FILTER (WHERE v.voided_at IS NULL),
         max(v.created_at)
  FROM public.applications a
  JOIN public.competitions c ON c.id = a.competition_id
  JOIN public.categories cat ON cat.id = a.category_id
  LEFT JOIN public.competition_rounds r ON r.id = COALESCE(a.current_round_id, c.current_round_id)
  LEFT JOIN public.votes v ON v.application_id = a.id
       AND (_round_id IS NULL OR v.round_id = _round_id)
  WHERE (_competition_slug IS NULL OR c.slug = _competition_slug)
    AND (_category_id IS NULL OR a.category_id = _category_id)
  GROUP BY a.id, a.handle, a.display_name, cat.name, r.name
  ORDER BY 6 DESC;
END $$;

CREATE OR REPLACE FUNCTION public.suspicious_vote_activity(_competition_slug text DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE(voter_id uuid, voter_email text, votes_today bigint, votes_last_hour bigint, distinct_contestants bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  RETURN QUERY
  SELECT v.voter_id, u.email::text,
         count(*) FILTER (WHERE v.vote_day = (now() AT TIME ZONE 'utc')::date AND v.voided_at IS NULL),
         count(*) FILTER (WHERE v.created_at > now() - interval '1 hour' AND v.voided_at IS NULL),
         count(DISTINCT v.application_id)
  FROM public.votes v
  JOIN public.applications a ON a.id = v.application_id
  JOIN public.competitions c ON c.id = a.competition_id
  LEFT JOIN auth.users u ON u.id = v.voter_id
  WHERE _competition_slug IS NULL OR c.slug = _competition_slug
  GROUP BY v.voter_id, u.email
  ORDER BY 4 DESC, 3 DESC
  LIMIT least(coalesce(_limit, 50), 200);
END $$;

CREATE OR REPLACE FUNCTION public.void_votes(_reason text, _vote_ids uuid[] DEFAULT NULL, _application_id uuid DEFAULT NULL, _voter_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.can_manage_progression(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_AUTHORISED');
  END IF;
  IF coalesce(trim(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'REASON_REQUIRED');
  END IF;
  IF _vote_ids IS NULL AND _application_id IS NULL AND _voter_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_TARGET');
  END IF;

  WITH updated AS (
    UPDATE public.votes
       SET voided_at = now(), voided_by = auth.uid(), void_reason = trim(_reason)
     WHERE voided_at IS NULL
       AND (_vote_ids IS NULL OR id = ANY(_vote_ids))
       AND (_application_id IS NULL OR application_id = _application_id)
       AND (_voter_id IS NULL OR voter_id = _voter_id)
    RETURNING id
  ) SELECT count(*) INTO v_count FROM updated;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'vote.void', 'vote', coalesce(_application_id::text, _voter_id::text),
    jsonb_build_object('voided', v_count, 'reason', trim(_reason),
      'application_id', _application_id, 'voter_id', _voter_id,
      'vote_ids', to_jsonb(_vote_ids)));

  RETURN jsonb_build_object('ok', true, 'voided', v_count);
END $$;

CREATE OR REPLACE FUNCTION public.public_contestants(_competition_slug text DEFAULT NULL)
RETURNS TABLE(handle text, display_name text, category_name text, group_name text, location text,
              bio text, stage text, competition_slug text, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.handle, a.display_name, c.name, g.name, a.location, a.bio,
         COALESCE(r.name, 'Registration'), comp.slug,
         (SELECT count(*) FROM public.votes v
           WHERE v.application_id = a.id AND v.voided_at IS NULL)
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  JOIN public.category_groups g ON g.id = c.group_id
  JOIN public.competitions comp ON comp.id = a.competition_id
  LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
  WHERE a.is_public
    AND a.status IN ('APPROVED','UNDER_REVIEW')
    AND a.progress_state NOT IN ('WITHDRAWN','DISQUALIFIED')
    AND (_competition_slug IS NULL OR comp.slug = _competition_slug)
  ORDER BY a.created_at DESC;
$$;

-- ============================================================
-- RESULTS (configuration-driven weighting)
-- ============================================================
CREATE OR REPLACE FUNCTION public.round_results_detail(_round_id uuid)
RETURNS TABLE(application_id uuid, handle text, display_name text, category_name text,
              progress_state text, judge_score numeric, judges_scored bigint,
              public_votes bigint, combined numeric, outcome text, decided_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_comp public.competitions; v_max_votes numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  SELECT c.* INTO v_comp FROM public.competitions c
   JOIN public.competition_rounds r ON r.competition_id = c.id WHERE r.id = _round_id;
  IF v_comp.id IS NULL THEN RETURN; END IF;

  SELECT GREATEST(COALESCE(max(cnt), 0), 1) INTO v_max_votes
  FROM (SELECT count(*) AS cnt FROM public.votes
         WHERE round_id = _round_id AND voided_at IS NULL GROUP BY application_id) t;

  RETURN QUERY
  WITH judged AS (
    SELECT s.application_id,
           SUM(s.value / NULLIF(cr.max_score, 0) * cr.weight) / NULLIF(COUNT(DISTINCT s.judge_id), 0) AS pct,
           COUNT(DISTINCT s.judge_id) AS judges
    FROM public.scores s
    JOIN public.scoring_criteria cr ON cr.id = s.criterion_id
    WHERE s.round_id = _round_id
    GROUP BY s.application_id
  ), voted AS (
    SELECT v.application_id, count(*) AS cnt FROM public.votes v
     WHERE v.round_id = _round_id AND v.voided_at IS NULL GROUP BY v.application_id
  )
  SELECT a.id, a.handle, a.display_name, cat.name, a.progress_state,
         ROUND(COALESCE(j.pct, 0), 2), COALESCE(j.judges, 0), COALESCE(vt.cnt, 0),
         ROUND(
           COALESCE(j.pct, 0) * (v_comp.judge_weight / 100.0)
           + (COALESCE(vt.cnt, 0) / v_max_votes * 100) * (v_comp.public_weight / 100.0)
         , 2),
         rr.outcome, rr.decided_at
  FROM public.applications a
  JOIN public.categories cat ON cat.id = a.category_id
  LEFT JOIN judged j ON j.application_id = a.id
  LEFT JOIN voted vt ON vt.application_id = a.id
  LEFT JOIN public.round_results rr ON rr.application_id = a.id AND rr.round_id = _round_id
  WHERE a.competition_id = v_comp.id
    AND (COALESCE(a.current_round_id, v_comp.current_round_id) = _round_id
         OR rr.id IS NOT NULL)
  ORDER BY 9 DESC NULLS LAST;
END $$;

-- ============================================================
-- ADMIN OPERATIONS SNAPSHOT
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_ops_snapshot(_competition_slug text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comp public.competitions; v_round public.competition_rounds;
  v_registrations int; v_apps_pending int; v_subs_pending int; v_progress jsonb;
  v_votes bigint; v_voided bigint;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  SELECT c.* INTO v_comp FROM public.competitions c
   WHERE (_competition_slug IS NOT NULL AND c.slug = _competition_slug)
      OR (_competition_slug IS NULL AND c.id = public.active_competition_id()) LIMIT 1;
  IF v_comp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NO_COMPETITION'); END IF;

  SELECT * INTO v_round FROM public.competition_rounds WHERE id = v_comp.current_round_id;

  SELECT count(*) INTO v_registrations FROM public.applications WHERE competition_id = v_comp.id;
  SELECT count(*) INTO v_apps_pending FROM public.applications
   WHERE competition_id = v_comp.id AND progress_state IN ('SUBMITTED','UNDER_REVIEW')
     AND (review_decision IS NULL OR review_decision = 'UNDER_REVIEW');
  SELECT count(*) INTO v_subs_pending FROM public.applications
   WHERE competition_id = v_comp.id AND submission_state IN ('PENDING_REVIEW','REVISION_REQUESTED');

  SELECT count(*) FILTER (WHERE v.voided_at IS NULL), count(*) FILTER (WHERE v.voided_at IS NOT NULL)
    INTO v_votes, v_voided
  FROM public.votes v JOIN public.applications a ON a.id = v.application_id
  WHERE a.competition_id = v_comp.id;

  IF v_round.id IS NOT NULL THEN v_progress := public.round_progress(v_round.id); END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'competition', jsonb_build_object('id', v_comp.id, 'slug', v_comp.slug, 'name', v_comp.name,
      'status', v_comp.status, 'judge_weight', v_comp.judge_weight, 'public_weight', v_comp.public_weight,
      'voting_model', v_comp.voting_model, 'voting_opens_at', v_comp.voting_opens_at,
      'voting_closes_at', v_comp.voting_closes_at),
    'current_round', CASE WHEN v_round.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_round.id, 'name', v_round.name, 'status', v_round.status,
      'judging_closes_at', v_round.judging_closes_at, 'score_deadline_at', v_round.score_deadline_at) END,
    'registrations', v_registrations,
    'applications_pending', v_apps_pending,
    'submissions_pending', v_subs_pending,
    'round_progress', coalesce(v_progress, '{}'::jsonb),
    'votes_valid', v_votes,
    'votes_voided', v_voided,
    'voting_live', (v_comp.voting_model <> 'JUDGES_ONLY'
                    AND v_comp.status IN ('VOTING_OPEN','IN_PROGRESS')
                    AND v_comp.voting_opens_at IS NOT NULL AND v_comp.voting_closes_at IS NOT NULL
                    AND now() BETWEEN v_comp.voting_opens_at AND v_comp.voting_closes_at)
  );
END $$;

-- ============================================================
-- ADMIN APPLICATION / SUBMISSION LISTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_applications(_competition_slug text DEFAULT NULL, _progress_state text DEFAULT NULL, _submission_state text DEFAULT NULL)
RETURNS TABLE(id uuid, handle text, display_name text, category_id uuid, category_name text,
              status text, progress_state text, submission_state text, media_is_public boolean,
              review_decision text, review_reason text, reviewed_at timestamptz,
              audition_url text, audition_notes text, submission_answers jsonb,
              bio text, experience text, location text, round_name text,
              created_at timestamptz, submitted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'not authorised'; END IF;
  RETURN QUERY
  SELECT a.id, a.handle, a.display_name, a.category_id, cat.name,
         a.status, a.progress_state, a.submission_state, a.media_is_public,
         a.review_decision, a.review_reason, a.reviewed_at,
         a.audition_url, a.audition_notes, a.submission_answers,
         a.bio, a.experience, a.location,
         coalesce(r.name, 'Registration'), a.created_at, a.submitted_at
  FROM public.applications a
  JOIN public.competitions c ON c.id = a.competition_id
  JOIN public.categories cat ON cat.id = a.category_id
  LEFT JOIN public.competition_rounds r ON r.id = COALESCE(a.current_round_id, c.current_round_id)
  WHERE (_competition_slug IS NULL OR c.slug = _competition_slug)
    AND (_progress_state IS NULL OR a.progress_state = _progress_state)
    AND (_submission_state IS NULL OR a.submission_state = _submission_state)
  ORDER BY a.created_at DESC;
END $$;

-- ============================================================
-- GRANTS: RPC access stays explicit and authenticated-only
-- ============================================================
REVOKE ALL ON FUNCTION public.set_competition_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_round_status(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_round_result(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_application_state(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_application(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_submission(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.correct_score(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_score_corrections(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.judge_dashboard(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.round_progress(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.round_results_detail(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ops_snapshot(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_applications(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vote_totals(text, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suspicious_vote_activity(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_votes(text, uuid[], uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_voting_window(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_voting_now(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cast_vote(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_application(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.set_competition_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_round_status(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_round_result(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_application_state(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_submission(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_score(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_score_corrections(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_dashboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.round_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.round_results_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ops_snapshot(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_applications(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_totals(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspicious_vote_activity(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_votes(text, uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_voting_window(uuid, timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_voting_now(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_vote(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_progression(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.competition_status_allows(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.round_status_allows(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.progress_state_valid(text) TO authenticated;

-- rounds already in flight reflect their real lifecycle state
UPDATE public.competition_rounds r
   SET status = 'OPEN'
 WHERE r.status = 'DRAFT' AND r.is_active
   AND EXISTS (SELECT 1 FROM public.competitions c WHERE c.current_round_id = r.id);
