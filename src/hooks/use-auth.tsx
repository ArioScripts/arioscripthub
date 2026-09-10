import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_banned: boolean;
  ban_reason: string | null;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useProfile(user: User | null) {
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_banned, ban_reason")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
  });
}

export function useRoles(user: User | null) {
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as string);
    },
  });
}

export function useAuth() {
  const { session, user, loading } = useSession();
  const profile = useProfile(user);
  const roles = useRoles(user);
  const roleList = roles.data ?? [];

  return {
    session,
    user,
    loading,
    profile: profile.data ?? null,
    profileLoading: profile.isLoading,
    roles: roleList,
    isAdmin: roleList.includes("admin"),
    isModerator: roleList.includes("moderator") || roleList.includes("admin"),
    isBanned: profile.data?.is_banned ?? false,
  };
}
