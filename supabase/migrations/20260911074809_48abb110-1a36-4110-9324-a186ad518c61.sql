REVOKE ALL ON FUNCTION public.applications_guard_insert() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.applications_guard_update() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.scores_audit() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.judge_can_score_round(uuid, uuid, uuid) FROM anon, public;