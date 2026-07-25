import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

/** Guards /portal/* routes. Redirects to /portal/login when not signed in. */
export function RequirePortalAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user && pathname !== "/portal/login") {
      navigate({ to: "/portal/login" });
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

/** Assign or fetch a stable client ID (CID-XXXXXX) keyed by email. */
export function ensureClientId(email: string): string {
  if (!email) return "";
  const key = "dms:client_ids";
  try {
    const map = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, string>;
    const k = email.toLowerCase();
    if (map[k]) return map[k];
    // Deterministic 6-char code from email hash
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
    const code = h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    const cid = `CID-${code}`;
    map[k] = cid;
    window.localStorage.setItem(key, JSON.stringify(map));
    return cid;
  } catch {
    return "";
  }
}

/** Return the client company/name identity to filter data with. */
export function usePortalIdentity() {
  const { user } = useAuth();
  const [clientRow, setClientRow] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    try {
      const raw = window.localStorage.getItem("dms:clients_v2");
      if (!raw) return;
      const rows = JSON.parse(raw) as any[];
      const match = rows.find((r) => (r.email ?? "").toLowerCase() === user.email.toLowerCase());
      if (match) setClientRow(match);
    } catch { /* noop */ }
  }, [user?.email]);

  const email = user?.email ?? "";
  return {
    email,
    name: clientRow?.name ?? user?.name ?? "",
    company: clientRow?.company ?? "",
    phone: clientRow?.phone ?? "",
    city: clientRow?.city ?? "",
    clientId: email ? ensureClientId(email) : "",
    client: clientRow,
  };
}


/** Simple arithmetic captcha ("4 + 5 = ?") shared across the portal. */
export function useMathCaptcha() {
  const [seed, setSeed] = useState(0);
  const a = 2 + ((seed * 7 + 3) % 8);       // 2..9
  const b = 1 + ((seed * 13 + 5) % 8);      // 1..8
  const op: "+" | "-" = seed % 2 === 0 ? "+" : "-";
  const answer = op === "+" ? a + b : a - b;
  const question = `${a} ${op} ${b} = ?`;
  const refresh = () => setSeed((s) => s + 1 + Math.floor(Math.random() * 5));
  return { question, answer, refresh };
}
