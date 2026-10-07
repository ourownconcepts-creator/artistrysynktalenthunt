ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS secondary_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('UNVERIFIED','IDENTITY_VERIFIED','TALENT_VERIFIED'));

CREATE INDEX IF NOT EXISTS profiles_directory_idx ON public.profiles (is_public, verification_status, primary_discipline);
CREATE INDEX IF NOT EXISTS profiles_directory_location_idx ON public.profiles (location);
CREATE INDEX IF NOT EXISTS profiles_featured_until_idx ON public.profiles (featured_until) WHERE featured_until IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique_idx ON public.profiles (lower(handle)) WHERE handle IS NOT NULL;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'CREATIVE',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'TALENT_HUNT',
  ADD COLUMN IF NOT EXISTS participant_type text NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_domain_check;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_domain_check CHECK (domain IN ('CREATIVE','SPORT'));
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_type_check;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_type_check CHECK (type IN ('TALENT_HUNT','TOURNAMENT','CHALLENGE','TRIAL'));
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_participant_type_check;
ALTER TABLE public.competitions ADD CONSTRAINT competitions_participant_type_check CHECK (participant_type IN ('INDIVIDUAL','TEAM'));

CREATE OR REPLACE FUNCTION public.profiles_guard_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.handle IS NOT NULL THEN
    NEW.handle := nullif(left(trim(both '-' from regexp_replace(lower(NEW.handle), '[^a-z0-9]+', '-', 'g')), 40), '');
  END IF;
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.artistrysynk_identity_ref := NULL;
      NEW.artistrysynk_provider := 'unlinked';
      NEW.verification_status := 'UNVERIFIED';
      NEW.featured_until := NULL;
    ELSE
      NEW.id := OLD.id;
      NEW.artistrysynk_identity_ref := OLD.artistrysynk_identity_ref;
      NEW.artistrysynk_provider := OLD.artistrysynk_provider;
      NEW.verification_status := OLD.verification_status;
      NEW.featured_until := OLD.featured_until;
    END IF;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON COLUMN public.profiles.artistrysynk_identity_ref IS 'DEPRECATED: identity linking removed; profiles are the ArtistrySynk talent identity';
COMMENT ON COLUMN public.profiles.artistrysynk_provider IS 'DEPRECATED: identity linking removed';
COMMENT ON TABLE public.artistrysynk_links IS 'DEPRECATED: identity linking removed in Talent Directory V1.1';
COMMENT ON TABLE public.artistrysynk_link_intents IS 'DEPRECATED: identity linking removed in Talent Directory V1.1';

CREATE OR REPLACE FUNCTION public.talent_directory(
  _q text DEFAULT NULL, _discipline text DEFAULT NULL, _location text DEFAULT NULL,
  _verification text DEFAULT NULL, _featured boolean DEFAULT NULL,
  _limit integer DEFAULT 24, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, handle text, display_name text, avatar_url text, bio text, location text,
  primary_discipline text, secondary_skills text[], verification_status text,
  featured_until timestamptz, is_featured boolean, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.handle, p.display_name, p.avatar_url, left(p.bio, 280), p.location,
    p.primary_discipline, p.secondary_skills, p.verification_status, p.featured_until,
    (p.featured_until IS NOT NULL AND p.featured_until > now()) AS is_featured,
    count(*) OVER () AS total_count
  FROM public.profiles p
  WHERE p.is_public AND p.handle IS NOT NULL
    AND (_q IS NULL OR _q = '' OR p.display_name ILIKE '%'||_q||'%' OR p.handle ILIKE '%'||_q||'%'
      OR p.primary_discipline ILIKE '%'||_q||'%' OR p.location ILIKE '%'||_q||'%'
      OR EXISTS (SELECT 1 FROM unnest(p.secondary_skills) s WHERE s ILIKE '%'||_q||'%'))
    AND (_discipline IS NULL OR _discipline = '' OR p.primary_discipline ILIKE _discipline
      OR EXISTS (SELECT 1 FROM unnest(p.secondary_skills) s WHERE s ILIKE _discipline))
    AND (_location IS NULL OR _location = '' OR p.location ILIKE '%'||_location||'%')
    AND (_verification IS NULL OR _verification = '' OR p.verification_status = _verification)
    AND (_featured IS NOT TRUE OR (p.featured_until IS NOT NULL AND p.featured_until > now()))
  ORDER BY (p.featured_until IS NOT NULL AND p.featured_until > now()) DESC,
    (p.verification_status <> 'UNVERIFIED') DESC, p.updated_at DESC
  LIMIT least(greatest(coalesce(_limit, 24), 1), 60) OFFSET greatest(coalesce(_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION public.talent_disciplines()
RETURNS TABLE(name text, talent_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT d.name, count(p.id) FROM (
    SELECT DISTINCT c.name FROM public.categories c WHERE c.is_active
    UNION SELECT DISTINCT p2.primary_discipline FROM public.profiles p2
      WHERE p2.is_public AND p2.handle IS NOT NULL AND p2.primary_discipline <> ''
  ) d
  LEFT JOIN public.profiles p ON p.is_public AND p.handle IS NOT NULL AND p.primary_discipline = d.name
  GROUP BY d.name ORDER BY count(p.id) DESC, d.name
$$;

CREATE OR REPLACE FUNCTION public.talent_profile(_handle text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'profile', jsonb_build_object('id', p.id, 'handle', p.handle, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'bio', p.bio, 'location', p.location,
      'primary_discipline', p.primary_discipline, 'secondary_skills', p.secondary_skills,
      'portfolio_url', p.portfolio_url, 'website_url', p.website_url,
      'instagram_url', p.instagram_url, 'youtube_url', p.youtube_url,
      'verification_status', p.verification_status, 'featured_until', p.featured_until,
      'is_featured', (p.featured_until IS NOT NULL AND p.featured_until > now()),
      'is_public', p.is_public, 'created_at', p.created_at),
    'competitions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('application_handle', a.handle,
        'competition_name', c.name, 'competition_slug', c.slug, 'category_name', cat.name,
        'status', a.status, 'progress_state', a.progress_state, 'round_name', r.name,
        'participated_at', coalesce(a.submitted_at, a.created_at)) ORDER BY coalesce(a.submitted_at, a.created_at) DESC)
      FROM public.applications a
      JOIN public.competitions c ON c.id = a.competition_id
      LEFT JOIN public.categories cat ON cat.id = a.category_id
      LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
      WHERE a.user_id = p.id AND a.is_public
        AND a.status NOT IN ('DRAFT','REJECTED','WITHDRAWN','DISQUALIFIED')), '[]'::jsonb),
    'achievements', coalesce((
      SELECT jsonb_agg(jsonb_build_object('slug', b.slug, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'awarded_at', ab.awarded_at, 'competition_name', c.name) ORDER BY ab.awarded_at DESC)
      FROM public.application_badges ab
      JOIN public.badges b ON b.id = ab.badge_id
      JOIN public.applications a ON a.id = ab.application_id
      JOIN public.competitions c ON c.id = a.competition_id
      WHERE a.user_id = p.id AND a.is_public
        AND a.status NOT IN ('DRAFT','REJECTED','WITHDRAWN','DISQUALIFIED')), '[]'::jsonb))
  FROM public.profiles p
  WHERE p.is_public AND p.handle IS NOT NULL AND lower(p.handle) = lower(_handle)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.talent_directory(text, text, text, text, boolean, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.talent_disciplines() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.talent_profile(text) TO anon, authenticated;

DROP POLICY IF EXISTS "avatar read" ON storage.objects;
CREATE POLICY "avatar read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatar own insert" ON storage.objects;
CREATE POLICY "avatar own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatar own update" ON storage.objects;
CREATE POLICY "avatar own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatar own delete" ON storage.objects;
CREATE POLICY "avatar own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);