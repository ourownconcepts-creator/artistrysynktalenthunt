-- 1. round_results: stop exposing every application's advancement decision + decider identity
DROP POLICY IF EXISTS "results public read" ON public.round_results;

CREATE POLICY "results public read" ON public.round_results
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = round_results.application_id
      AND a.is_public
      AND a.status IN ('APPROVED','UNDER_REVIEW','ELIMINATED')
  )
);

CREATE POLICY "results owner read" ON public.round_results
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = round_results.application_id AND a.user_id = auth.uid()
  )
);

-- 2. scores: judges must still be eligible when updating, not just at insert time
DROP POLICY IF EXISTS "scores judge update" ON public.scores;

CREATE POLICY "scores judge update" ON public.scores
FOR UPDATE TO authenticated
USING (judge_id = auth.uid() AND public.judge_can_score(auth.uid(), application_id))
WITH CHECK (judge_id = auth.uid() AND public.judge_can_score(auth.uid(), application_id));