-- application_badges: don't link badges to private applications
DROP POLICY IF EXISTS "application badges read" ON public.application_badges;

CREATE POLICY "application badges public read" ON public.application_badges
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_badges.application_id
      AND a.is_public
      AND a.status IN ('APPROVED','UNDER_REVIEW')
  )
);

CREATE POLICY "application badges owner read" ON public.application_badges
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_badges.application_id AND a.user_id = auth.uid()
  )
);

-- announcements: contestant-only announcements must not be readable by every signed-in user
DROP POLICY IF EXISTS "announcements member read" ON public.announcements;

CREATE POLICY "announcements member read" ON public.announcements
FOR SELECT TO authenticated
USING (
  audience = 'PUBLIC'
  OR public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.applications a WHERE a.user_id = auth.uid())
);

-- round_results: public view shows progression, not eliminations
DROP POLICY IF EXISTS "results public read" ON public.round_results;

CREATE POLICY "results public read" ON public.round_results
FOR SELECT TO anon, authenticated
USING (
  outcome = 'ADVANCED'
  AND EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = round_results.application_id
      AND a.is_public
      AND a.status IN ('APPROVED','UNDER_REVIEW')
  )
);