ALTER TABLE public.artistrysynk_link_intents
  ADD COLUMN IF NOT EXISTS code_verifier text,
  ADD COLUMN IF NOT EXISTS processing_at timestamptz;

CREATE INDEX IF NOT EXISTS artistrysynk_link_intents_active_idx
  ON public.artistrysynk_link_intents (user_id, state_hash, expires_at)
  WHERE consumed_at IS NULL;

REVOKE ALL ON public.artistrysynk_link_intents FROM anon, authenticated;
GRANT ALL ON public.artistrysynk_link_intents TO service_role;