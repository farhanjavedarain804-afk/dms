import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { recordLogin, recordLogout, startHeartbeat, stopHeartbeat } from "@/lib/activity";


export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: any | null): AuthUser | null {
  if (!u) return null;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? "",
    name: meta.name ?? u.email?.split("@")[0] ?? "User",
    role: meta.role ?? "Member",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(toAuthUser(session?.user ?? null));
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(toAuthUser(data.session?.user ?? null));
      setLoading(false);
      if (data.session?.user) startHeartbeat();
    });
    return () => { sub.subscription.unsubscribe(); stopHeartbeat(); };
  }, []);


  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await recordLogin(email);
    startHeartbeat();
  }, []);

  const logout = useCallback(async () => {
    await recordLogout();
    stopHeartbeat();
    await supabase.auth.signOut();
    setUser(null);
  }, []);


  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [loading, user, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/40">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
}
