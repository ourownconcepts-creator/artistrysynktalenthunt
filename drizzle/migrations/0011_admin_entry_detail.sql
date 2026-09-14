CREATE OR REPLACE FUNCTION public.admin_entry_detail(_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_SIGNED_IN');
  END IF;

  IF NOT (public.is_staff(_uid) OR public.has_role(_uid, 'JUDGE')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'FORBIDDEN');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'entry', jsonb_build_object(
      'id', a.id,
      'reference_code', a.reference_code,
      'display_name', a.display_name,
      'handle', a.handle,
      'category_name', c.name,
      'group_name', cg.name,
      'competition_name', comp.name,
      'round_name', COALESCE(r.name, ''),
      'status', a.status,
      'progress_state', a.progress_state,
      'submission_state', a.submission_state,
      'media_is_public', a.media_is_public,
      'is_public', a.is_public,
      'review_decision', a.review_decision,
      'review_reason', a.review_reason,
      'reviewed_at', a.reviewed_at,
      'state_reason', a.state_reason,
      'location', a.location,
      'bio', a.bio,
      'experience', a.experience,
      'audition_url', a.audition_url,
      'audition_notes', a.audition_notes,
      'submission_answers', a.submission_answers,
      'created_at', a.created_at,
      'submitted_at', a.submitted_at,
      'updated_at', a.updated_at
    ),
    'profile', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
      'display_name', p.display_name,
      'handle', p.handle,
      'bio', p.bio,
      'location', p.location,
      'primary_discipline', p.primary_discipline,
      'avatar_url', p.avatar_url,
      'is_public', p.is_public
    ) END,
    'artistrysynk', CASE WHEN l.id IS NULL THEN
        jsonb_build_object('status', 'NOT_CONNECTED')
      ELSE jsonb_build_object(
        'status', l.status,
        'external_subject', l.external_subject,
        'identity_id', l.identity_id,
        'scopes', l.scopes,
        'linked_at', l.linked_at,
        'snapshot_at', l.snapshot_at,
        'profile_snapshot', l.profile_snapshot
      ) END,
    'criteria', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'sort_order', x->>'name')
      FROM (
        SELECT jsonb_build_object(
          'id', sc.id,
          'name', sc.name,
          'max_score', sc.max_score,
          'weight', sc.weight,
          'sort_order', sc.sort_order,
          'average', ROUND(AVG(s.value), 2),
          'judges_scored', COUNT(s.id)
        ) AS x
        FROM public.scoring_criteria sc
        LEFT JOIN public.scores s
          ON s.criterion_id = sc.id AND s.application_id = a.id
        WHERE sc.competition_id = a.competition_id AND sc.is_active
        GROUP BY sc.id, sc.name, sc.max_score, sc.weight, sc.sort_order
      ) q
    ), '[]'::jsonb),
    'scores', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'criterion_name', sc2.name,
        'value', s2.value,
        'max_score', sc2.max_score,
        'comment', s2.comment,
        'round_name', COALESCE(r2.name, ''),
        'updated_at', s2.updated_at
      ) ORDER BY s2.updated_at DESC)
      FROM public.scores s2
      JOIN public.scoring_criteria sc2 ON sc2.id = s2.criterion_id
      LEFT JOIN public.competition_rounds r2 ON r2.id = s2.round_id
      WHERE s2.application_id = a.id
    ), '[]'::jsonb),
    'judges_scored', (
      SELECT COUNT(DISTINCT s3.judge_id) FROM public.scores s3 WHERE s3.application_id = a.id
    ),
    'valid_votes', (
      SELECT COUNT(*) FROM public.votes v
      WHERE v.application_id = a.id AND v.voided_at IS NULL
    ),
    'results', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'round_name', r3.name,
        'outcome', rr.outcome,
        'decided_at', rr.decided_at
      ) ORDER BY r3.sequence)
      FROM public.round_results rr
      JOIN public.competition_rounds r3 ON r3.id = rr.round_id
      WHERE rr.application_id = a.id
    ), '[]'::jsonb)
  )
  INTO _result
  FROM public.applications a
  JOIN public.categories c ON c.id = a.category_id
  JOIN public.category_groups cg ON cg.id = c.group_id
  JOIN public.competitions comp ON comp.id = a.competition_id
  LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  LEFT JOIN public.artistrysynk_links l ON l.user_id = a.user_id AND l.status = 'CONNECTED'
  WHERE a.id = _application_id;

  IF _result IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_entry_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_entry_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_entry_detail(uuid) TO service_role;