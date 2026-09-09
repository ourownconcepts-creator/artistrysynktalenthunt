-- Remove blanket PUBLIC execute; grant only the roles that actually call each RPC.
REVOKE ALL ON FUNCTION public.cast_vote(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_vote(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(text) TO authenticated;

REVOKE ALL ON FUNCTION public.public_contestants(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_contestants(text) TO anon, authenticated;
