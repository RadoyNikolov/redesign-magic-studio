import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/** Is the signed-in user an admin, and does the project have an admin at all? */
export function useAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: exists } = await supabase.rpc("admin_exists");
    setAdminExists(exists ?? false);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    void refresh();
  }, [sessionLoading, session?.user?.id, refresh]);

  const claimAdmin = useCallback(async () => {
    const { data, error } = await supabase.rpc("claim_admin");
    if (error) throw error;
    await refresh();
    return !!data;
  }, [refresh]);

  return { session, isAdmin, adminExists, loading: loading || sessionLoading, claimAdmin, refresh };
}
