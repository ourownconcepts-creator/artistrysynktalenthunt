DROP FUNCTION IF EXISTS public.artistrysynk_apply_link(uuid, text);

-- The verified identity reference lives on the entrant's profile record.
CREATE OR REPLACE FUNCTION public.artistrysynk_apply_link(p_user uuid, p_identity_ref text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user is required'; END IF;
  UPDATE public.profiles
     SET artistrysynk_identity_ref = p_identity_ref,
         artistrysynk_provider = CASE WHEN p_identity_ref IS NULL THEN 'unlinked' ELSE 'artistrysynk' END
   WHERE id = p_user;
  SELECT count(*) INTO v_count FROM public.profiles
   WHERE id = p_user AND artistrysynk_identity_ref IS NOT NULL;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.artistrysynk_apply_link(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) TO service_role;

-- Restore the entry guard to its audited form; no bypass is needed now that the
-- identity reference lives on profiles.
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
END $function$;