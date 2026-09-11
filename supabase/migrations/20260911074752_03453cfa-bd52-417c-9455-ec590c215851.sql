-- 1. AUDIT LOG: only trusted definer routines may write
DROP POLICY IF EXISTS "audit insert" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated;

-- 2. APPLICATIONS: guard contestant-controlled columns + audit staff changes
CREATE OR REPLACE FUNCTION public.applications_guard_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    IF NEW.status NOT IN ('DRAFT','SUBMITTED') THEN
      NEW.status := 'SUBMITTED';
    END IF;
    SELECT c.current_round_id INTO NEW.current_round_id
      FROM public.competitions c WHERE c.id = NEW.competition_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.applications_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_staff(auth.uid()) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_public IS DISTINCT FROM OLD.is_public
       OR NEW.current_round_id IS DISTINCT FROM OLD.current_round_id THEN
      INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (auth.uid(), 'application.update', 'application', OLD.id::text,
        jsonb_build_object(
          'before', jsonb_build_object('status', OLD.status, 'is_public', OLD.is_public, 'current_round_id', OLD.current_round_id),
          'after',  jsonb_build_object('status', NEW.status, 'is_public', NEW.is_public, 'current_round_id', NEW.current_round_id)));
    END IF;
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
  NEW.is_public := OLD.is_public;
  NEW.current_round_id := OLD.current_round_id;
  NEW.handle := OLD.handle;
  NEW.submitted_at := OLD.submitted_at;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS applications_guard_insert ON public.applications;
CREATE TRIGGER applications_guard_insert BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_guard_insert();
DROP TRIGGER IF EXISTS applications_guard_update ON public.applications;
CREATE TRIGGER applications_guard_update BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_guard_update();

-- 3. SCORES: round-scoped eligibility + score locking after a decision
CREATE OR REPLACE FUNCTION public.judge_can_score_round(_judge_id uuid, _application_id uuid, _round_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.judge_can_score(_judge_id, _application_id)
     AND EXISTS (
       SELECT 1 FROM public.applications a
       JOIN public.competitions c ON c.id = a.competition_id
       WHERE a.id = _application_id
         AND _round_id = COALESCE(a.current_round_id, c.current_round_id))
     AND NOT EXISTS (
       SELECT 1 FROM public.round_results rr
       WHERE rr.application_id = _application_id AND rr.round_id = _round_id);
$$;

DROP POLICY IF EXISTS "scores judge insert" ON public.scores;
CREATE POLICY "scores judge insert" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (judge_id = auth.uid() AND public.judge_can_score_round(auth.uid(), application_id, round_id));
DROP POLICY IF EXISTS "scores judge update" ON public.scores;
CREATE POLICY "scores judge update" ON public.scores FOR UPDATE TO authenticated
  USING (judge_id = auth.uid() AND public.judge_can_score_round(auth.uid(), application_id, round_id))
  WITH CHECK (judge_id = auth.uid() AND public.judge_can_score_round(auth.uid(), application_id, round_id));

CREATE OR REPLACE FUNCTION public.scores_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), CASE WHEN TG_OP = 'INSERT' THEN 'score.submit' ELSE 'score.edit' END,
          'score', NEW.id::text,
          jsonb_build_object(
            'application_id', NEW.application_id,
            'round_id', NEW.round_id,
            'criterion_id', NEW.criterion_id,
            'before', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD.value) ELSE NULL END,
            'after', to_jsonb(NEW.value)));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS scores_audit ON public.scores;
CREATE TRIGGER scores_audit AFTER INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.scores_audit();

-- 4. VOTING: no self-voting, and serialise limit checks per voter
CREATE OR REPLACE FUNCTION public.cast_vote(_handle text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF v_app.user_id = v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'SELF_VOTE');
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

  -- serialise every concurrent vote by this voter so counts cannot be raced
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 42));

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