-- ============================================================
-- Release Gate 1 hardening: trusted identity relationships and
-- least-privilege table/routine grants.
-- ============================================================

-- 1. The identity-attachment routine must never be callable by end users.
--    It writes profiles.artistrysynk_identity_ref for an arbitrary p_user,
--    so an ordinary signed-in caller could attach (or steal) any identity.
REVOKE EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.artistrysynk_apply_link(uuid, text) TO service_role;

-- 2. Defence in depth: an ordinary user cannot write the verified identity
--    reference on their own profile row either. Only trusted routines
--    (SECURITY DEFINER, owner = postgres) and service_role may.
CREATE OR REPLACE FUNCTION public.profiles_guard_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.artistrysynk_identity_ref := NULL;
      NEW.artistrysynk_provider := 'unlinked';
    ELSE
      NEW.id := OLD.id;
      NEW.artistrysynk_identity_ref := OLD.artistrysynk_identity_ref;
      NEW.artistrysynk_provider := OLD.artistrysynk_provider;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_identity ON public.profiles;
CREATE TRIGGER profiles_guard_identity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_identity();

-- 3. One ArtistrySynk identity can belong to at most one ZGT account.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_artistrysynk_identity_ref_key
  ON public.profiles (artistrysynk_identity_ref)
  WHERE artistrysynk_identity_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS artistrysynk_links_identity_connected_key
  ON public.artistrysynk_links (identity_id)
  WHERE status = 'CONNECTED';

-- 4. Link/intent records are service-role only. RLS already denies everything
--    (no policies), but the table privileges were still broad.
REVOKE ALL ON public.artistrysynk_links FROM anon;
REVOKE ALL ON public.artistrysynk_links FROM authenticated;
REVOKE ALL ON public.artistrysynk_link_intents FROM anon;
REVOKE ALL ON public.artistrysynk_link_intents FROM authenticated;
GRANT ALL ON public.artistrysynk_links TO service_role;
GRANT ALL ON public.artistrysynk_link_intents TO service_role;

-- 5. Anonymous visitors are read-only everywhere.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- 6. Tables that may only be written through guarded routines.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.votes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.score_corrections FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.round_results FROM authenticated;
REVOKE DELETE ON public.applications FROM authenticated;

-- 7. Review / progression / moderation columns on applications are not writable
--    by any Data API caller; only the guarded RPCs (which run as owner) change
--    them. This complements the existing applications_guard_update trigger.
REVOKE UPDATE (
  progress_state,
  submission_state,
  review_decision,
  review_reason,
  reviewed_by,
  reviewed_at,
  state_reason,
  is_public,
  media_is_public,
  reference_code
) ON public.applications FROM authenticated;
