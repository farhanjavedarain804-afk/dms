import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { $signIn, $signOut, $getSession } from "@/lib/mysql-api";
import { recordLogin, recordLogout, startHeartbeat, stopHeartbeat } from "@/lib/activity";

const SESSION_TOKEN_KEY = "dms_session_token";

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

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    $getSession({ data: { token } })
      .then((session) => {
        if (session?.user) {
          setUser({
            id: String(session.user.id),
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
          });
          startHeartbeat();
        } else {
          setStoredToken(null);
        }
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await $signIn({ data: { email, password } });
    if (!session?.user) throw new Error("Login failed");
    setStoredToken(session.token);
    setUser({
      id: String(session.user.id),
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    });
    await recordLogin(email);
    startHeartbeat();
  }, []);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    await recordLogout();
    stopHeartbeat();
    if (token) {
      await $signOut({ data: { token } }).catch(() => {});
    }
    setStoredToken(null);
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
