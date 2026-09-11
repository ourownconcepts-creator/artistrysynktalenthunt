-- Allow an administrator to step back from IN_PROGRESS to REGISTRATION_CLOSED,
-- which makes reopening registration possible (audited like every other change).
CREATE OR REPLACE FUNCTION public.competition_status_allows(_from text, _to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _from = _to THEN true
    WHEN _from = 'DRAFT' THEN _to IN ('REGISTRATION_OPEN','ARCHIVED')
    WHEN _from = 'REGISTRATION_OPEN' THEN _to IN ('REGISTRATION_CLOSED','IN_PROGRESS','ARCHIVED')
    WHEN _from = 'REGISTRATION_CLOSED' THEN _to IN ('REGISTRATION_OPEN','IN_PROGRESS','ARCHIVED')
    WHEN _from = 'IN_PROGRESS' THEN _to IN ('REGISTRATION_CLOSED','VOTING_OPEN','COMPLETED','ARCHIVED')
    WHEN _from = 'VOTING_OPEN' THEN _to IN ('IN_PROGRESS','COMPLETED','ARCHIVED')
    WHEN _from = 'COMPLETED' THEN _to IN ('ARCHIVED')
    WHEN _from = 'ARCHIVED' THEN false
    ELSE _to IN ('DRAFT','REGISTRATION_OPEN','REGISTRATION_CLOSED','IN_PROGRESS','VOTING_OPEN','COMPLETED','ARCHIVED')
  END;
$function$;
