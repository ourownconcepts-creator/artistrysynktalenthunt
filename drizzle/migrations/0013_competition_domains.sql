-- Extensible competition domains for the shared competition engine.
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'CREATIVE';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'TALENT_HUNT';
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS participant_type text NOT NULL DEFAULT 'INDIVIDUAL';

ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_domain_check;
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_type_check;
ALTER TABLE public.competitions DROP CONSTRAINT IF EXISTS competitions_participant_type_check;

ALTER TABLE public.competitions ADD CONSTRAINT competitions_domain_check CHECK (domain IN ('CREATIVE', 'SPORT'));
ALTER TABLE public.competitions ADD CONSTRAINT competitions_type_check CHECK (type IN ('TALENT_HUNT', 'TOURNAMENT', 'CHALLENGE', 'TRIAL'));
ALTER TABLE public.competitions ADD CONSTRAINT competitions_participant_type_check CHECK (participant_type IN ('INDIVIDUAL', 'TEAM'));

CREATE INDEX IF NOT EXISTS competitions_domain_type_idx ON public.competitions (domain, type, status);
