
CREATE OR REPLACE FUNCTION public.grant_role_by_email(_email TEXT, _role public.app_role)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID;
  v_comp UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SUCH_USER');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'JUDGE' THEN
    SELECT id INTO v_comp FROM public.competitions WHERE slug = 'season-one';
    IF v_comp IS NOT NULL THEN
      INSERT INTO public.judge_assignments (judge_id, competition_id, category_id)
      VALUES (v_user, v_comp, NULL)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'role.grant', 'user_roles', v_user::text, jsonb_build_object('role', _role));

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_role_by_email(TEXT, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_role_by_email(TEXT, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_team()
RETURNS TABLE (user_id UUID, email TEXT, display_name TEXT, role TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ur.user_id, u.email::text, COALESCE(p.display_name, ''), ur.role::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY ur.role, u.email;
$$;
REVOKE EXECUTE ON FUNCTION public.list_team() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_team() TO authenticated;
