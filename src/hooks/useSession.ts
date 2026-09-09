import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyRoles } from "@/lib/live-data";

/** Current browser session. Never a security boundary — the server decides. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, ready };
}

export function useMyRoles() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["my-roles", user?.id ?? "anon"],
    queryFn: fetchMyRoles,
    enabled: Boolean(user),
  });
}
