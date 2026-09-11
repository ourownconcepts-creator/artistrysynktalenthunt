-- ArtistrySynk Integration v1: server-only link records + one-time authorization intents.

CREATE TABLE IF NOT EXISTS public.artistrysynk_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  external_subject text NOT NULL UNIQUE,
  identity_id text NOT NULL,
  link_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'LINKED' CHECK (status IN ('LINKED','REVOKED')),
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_at timestamptz,
  linked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS artistrysynk_links_identity_idx
  ON public.artistrysynk_links (identity_id) WHERE status = 'LINKED';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artistrysynk_links TO service_role;
ALTER TABLE public.artistrysynk_links ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.artistrysynk_link_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_hash text NOT NULL UNIQUE,
  intent_id text,
  redirect_uri text NOT NULL,
  external_subject text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artistrysynk_link_intents_user_idx
  ON public.artistrysynk_link_intents (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artistrysynk_link_intents TO service_role;
ALTER TABLE public.artistrysynk_link_intents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS artistrysynk_links_touch ON public.artistrysynk_links;
CREATE TRIGGER artistrysynk_links_touch BEFORE UPDATE ON public.artistrysynk_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Associating a verified identity with the entrant's applications must work even
-- once an entry is locked, so it runs through a narrow service-role routine that
-- may only touch the identity reference columns.
CREATE OR REPLACE FUNCTION public.artistrysynk_apply_link(p_user uuid, p_identity_ref text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user is required'; END IF;
  PERFORM set_config('app.artistrysynk_link', 'on', true);
  UPDATE public.applications
     SET artistrysynk_identity_ref = p_identity_ref,
         artistrysynk_provider = CASE WHEN p_identity_ref IS NULL THEN 'unlinked' ELSE 'artistrysynk' END
   WHERE user_id = p_user;
  SELECT count(*) INTO v_count FROM public.applications WHERE user_id = p_user;
  PERFORM set_config('app.artistrysynk_link', 'off', true);
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.artistrysynk_apply_link(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.applications_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_ref text; v_provider text;
BEGIN
  -- Identity-reference-only write from artistrysynk_apply_link.
  IF coalesce(current_setting('app.artistrysynk_link', true), 'off') = 'on' THEN
    v_ref := NEW.artistrysynk_identity_ref;
    v_provider := NEW.artistrysynk_provider;
    NEW := OLD;
    NEW.artistrysynk_identity_ref := v_ref;
    NEW.artistrysynk_provider := v_provider;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

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