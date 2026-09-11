-- Public entry tracking: every application gets a shareable reference code, and
-- a signed-out visitor can look up its stage with the code plus their email.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS reference_code text;

CREATE OR REPLACE FUNCTION public.generate_application_reference()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := 'ZGT-';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.applications WHERE reference_code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

-- Backfilling an additive column must not trip the entry-lock guard trigger.
ALTER TABLE public.applications DISABLE TRIGGER USER;

UPDATE public.applications
SET reference_code = public.generate_application_reference()
WHERE reference_code IS NULL;

ALTER TABLE public.applications ENABLE TRIGGER USER;

ALTER TABLE public.applications
  ALTER COLUMN reference_code SET DEFAULT public.generate_application_reference();

CREATE UNIQUE INDEX IF NOT EXISTS applications_reference_code_key
  ON public.applications (reference_code)
  WHERE reference_code IS NOT NULL;

-- Public, credential-free status lookup. Requires BOTH the reference code and
-- the email used on the entry, and returns only stage information.
CREATE OR REPLACE FUNCTION public.track_application(_reference_code text, _email text)
RETURNS TABLE (
  reference_code text,
  display_name text,
  handle text,
  competition_name text,
  category_name text,
  round_name text,
  status text,
  progress_state text,
  submission_state text,
  submitted_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.reference_code,
    a.display_name,
    a.handle,
    c.name,
    cat.name,
    r.name,
    a.status,
    a.progress_state,
    a.submission_state,
    a.submitted_at,
    a.updated_at
  FROM public.applications a
  JOIN public.competitions c ON c.id = a.competition_id
  JOIN public.categories cat ON cat.id = a.category_id
  LEFT JOIN public.competition_rounds r ON r.id = a.current_round_id
  WHERE a.reference_code = upper(btrim(coalesce(_reference_code, '')))
    AND lower(a.email) = lower(btrim(coalesce(_email, '')))
    AND length(btrim(coalesce(_reference_code, ''))) >= 8
    AND length(btrim(coalesce(_email, ''))) >= 5
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.track_application(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_application(text, text) TO anon, authenticated;
