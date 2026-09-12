-- 1. The owner account, protected by definition.
CREATE OR REPLACE FUNCTION public.owner_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 'admin@ziksgottalent.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_owner_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = public.owner_admin_email()
  );
$$;

-- 2. Owner always holds SUPER_ADMIN + ADMIN.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('SUPER_ADMIN'::app_role), ('ADMIN'::app_role)) AS r(role)
WHERE lower(u.email) = public.owner_admin_email()
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Nobody else keeps admin-level roles.
DELETE FROM public.user_roles ur
WHERE ur.role IN ('SUPER_ADMIN'::app_role, 'ADMIN'::app_role)
  AND NOT public.is_owner_admin(ur.user_id);

-- 4. Hard guard: the owner's admin roles can never be removed, and nobody
--    else can ever become SUPER_ADMIN.
CREATE OR REPLACE FUNCTION public.user_roles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    IF OLD.role IN ('SUPER_ADMIN'::app_role, 'ADMIN'::app_role)
       AND public.is_owner_admin(OLD.user_id) THEN
      RAISE EXCEPTION 'The owner administrator account is protected and cannot be changed';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.role = 'SUPER_ADMIN'::app_role AND NOT public.is_owner_admin(NEW.user_id) THEN
      RAISE EXCEPTION 'Only the owner administrator account can hold SUPER_ADMIN';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_roles_guard_trg ON public.user_roles;
CREATE TRIGGER user_roles_guard_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.user_roles_guard();

-- 5. Role grant/revoke: friendly refusals instead of raw errors.
CREATE OR REPLACE FUNCTION public.grant_role_by_email(_email text, _role app_role, _competition_slug text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _uid uuid;
  _competition uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  IF _role = 'SUPER_ADMIN'::app_role THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OWNER_ONLY');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SUCH_USER');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'JUDGE'::app_role THEN
    SELECT id INTO _competition FROM public.competitions
     WHERE _competition_slug IS NOT NULL AND slug = _competition_slug;
    IF _competition IS NULL THEN
      _competition := public.active_competition_id();
    END IF;
    IF _competition IS NOT NULL THEN
      INSERT INTO public.judge_assignments (judge_id, competition_id)
      SELECT _uid, _competition
      WHERE NOT EXISTS (
        SELECT 1 FROM public.judge_assignments ja
        WHERE ja.judge_id = _uid AND ja.competition_id = _competition
          AND ja.category_id IS NULL
      );
    END IF;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'role.grant', 'user_roles', _uid::text,
          jsonb_build_object('role', _role, 'email', _email, 'competition', _competition));

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_role_by_email(_email text, _role app_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_ADMIN');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_email);
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NO_SUCH_USER');
  END IF;

  IF public.is_owner_admin(_uid) AND _role IN ('SUPER_ADMIN'::app_role, 'ADMIN'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'OWNER_PROTECTED');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;

  IF _role = 'JUDGE'::app_role THEN
    DELETE FROM public.judge_assignments WHERE judge_id = _uid;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'role.revoke', 'user_roles', _uid::text,
          jsonb_build_object('role', _role, 'email', _email));

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- 6. Every registered account, visible to administrators only.
CREATE OR REPLACE FUNCTION public.admin_accounts(_search text DEFAULT NULL::text, _limit integer DEFAULT 200)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  handle text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  is_owner boolean,
  roles text[],
  entry_reference text,
  entry_name text,
  entry_category text,
  entry_progress_state text,
  entry_submission_state text,
  artistrysynk_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id,
         u.email::text,
         coalesce(p.display_name, ''),
         p.handle,
         u.created_at,
         u.email_confirmed_at,
         u.last_sign_in_at,
         lower(u.email) = public.owner_admin_email(),
         coalesce((SELECT array_agg(ur.role::text ORDER BY ur.role::text)
                     FROM public.user_roles ur WHERE ur.user_id = u.id), '{}'::text[]),
         a.reference_code,
         a.display_name,
         cat.name,
         a.progress_state,
         a.submission_state,
         coalesce((SELECT l.status FROM public.artistrysynk_links l
                    WHERE l.user_id = u.id ORDER BY l.updated_at DESC LIMIT 1), 'NOT_LINKED')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT ap.* FROM public.applications ap
     WHERE ap.user_id = u.id ORDER BY ap.created_at DESC LIMIT 1
  ) a ON true
  LEFT JOIN public.categories cat ON cat.id = a.category_id
  WHERE public.is_admin(auth.uid())
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR coalesce(p.display_name, '') ILIKE '%' || _search || '%'
         OR coalesce(a.reference_code, '') ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT least(coalesce(_limit, 200), 500);
$$;

REVOKE ALL ON FUNCTION public.admin_accounts(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_accounts(text, integer) TO authenticated;