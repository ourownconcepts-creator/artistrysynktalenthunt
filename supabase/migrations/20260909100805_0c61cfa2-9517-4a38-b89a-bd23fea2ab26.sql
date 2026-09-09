
DROP POLICY "competitions public read" ON public.competitions;
CREATE POLICY "competitions anon read" ON public.competitions FOR SELECT TO anon
  USING (status <> 'DRAFT');
CREATE POLICY "competitions member read" ON public.competitions FOR SELECT TO authenticated
  USING (status <> 'DRAFT' OR public.is_staff(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.judge_can_score(UUID, UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.judge_can_score(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.round_leaderboard(_competition_slug TEXT, _round_slug TEXT)
RETURNS TABLE (
  handle TEXT,
  display_name TEXT,
  category_name TEXT,
  judge_score NUMERIC,
  public_votes BIGINT,
  combined NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_comp public.competitions;
  v_round UUID;
  v_max_votes NUMERIC;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE slug = _competition_slug;
  IF v_comp.id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_round FROM public.competition_rounds
   WHERE competition_id = v_comp.id AND slug = _round_slug;
  IF v_round IS NULL THEN RETURN; END IF;

  SELECT GREATEST(COALESCE(max(cnt), 0), 1) INTO v_max_votes
  FROM (SELECT count(*) AS cnt FROM public.votes WHERE round_id = v_round GROUP BY application_id) t;

  RETURN QUERY
  WITH judged AS (
    SELECT s.application_id,
           SUM(s.value / NULLIF(cr.max_score, 0) * cr.weight) / NULLIF(COUNT(DISTINCT s.judge_id), 0) AS pct
    FROM public.scores s
    JOIN public.scoring_criteria cr ON cr.id = s.criterion_id
    WHERE s.round_id = v_round
    GROUP BY s.application_id
  ), voted AS (
    SELECT application_id, count(*) AS cnt FROM public.votes WHERE round_id = v_round GROUP BY application_id
  )
  SELECT a.handle, a.display_name, c.name,
         ROUND(COALESCE(j.pct, 0), 2),
         COALESCE(v.cnt, 0),
         ROUND(
           COALESCE(j.pct, 0) * (v_comp.judge_weight / 100.0)
           + (COALESCE(v.cnt, 0) / v_max_votes * 100) * (v_comp.public_weight / 100.0)
         , 2)
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  LEFT JOIN judged j ON j.application_id = a.id
  LEFT JOIN voted v ON v.application_id = a.id
  WHERE a.competition_id = v_comp.id
  ORDER BY 6 DESC NULLS LAST;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.round_leaderboard(TEXT, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.round_leaderboard(TEXT, TEXT) TO authenticated;
