// Global error capture.
//
// Two modes:
//  - Server (module import side-effect): captures unhandled process errors
//    so src/server.ts can surface them when h3 swallows an SSR throw.
//  - Browser (installErrorCapture()): persists window errors / unhandled
//    promise rejections / console.error into public.system_logs so they
//    appear in the Logs → Errors tab.

// ---------- Shared: last-captured error (used by src/server.ts) ----------
let lastCapturedError: unknown = null;

export function consumeLastCapturedError(): unknown {
  const e = lastCapturedError;
  lastCapturedError = null;
  return e;
}

function rememberError(err: unknown) {
  lastCapturedError = err;
}

// ---------- Server-side install (runs at import time) ----------
if (typeof process !== "undefined" && typeof (globalThis as any).window === "undefined") {
  try {
    // Node / worker process-style hooks (only bind if available)
    const p: any = process;
    if (typeof p.on === "function") {
      p.on("uncaughtException", (err: unknown) => rememberError(err));
      p.on("unhandledRejection", (reason: unknown) => rememberError(reason));
    }
  } catch {
    // ignore — best-effort
  }
}

// ---------- Browser-side install (opt-in from root component) ----------
let browserInstalled = false;
const recent = new Map<string, number>();

function readLocalUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const userId = parsed?.user?.id || parsed?.currentSession?.user?.id || parsed?.session?.user?.id;
      if (typeof userId === "string" && userId) return userId;
    }
  } catch {
    return null;
  }
  return null;
}

async function pushToDb(level: "error" | "critical", source: string, message: string, meta: Record<string, any>) {
  try {
    const key = `${source}::${message}`.slice(0, 300);
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < 10_000) return;
    recent.set(key, now);
    if (recent.size > 200) recent.clear();

    const { $dbCreate } = await import("@/lib/mysql-api");
    await $dbCreate({
      data: {
        table: "system_logs",
        body: {
          level,
          source,
          message: String(message).slice(0, 2000),
          meta: JSON.stringify({
            ...meta,
            url: typeof window !== "undefined" ? window.location.href : "",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            at: new Date().toISOString(),
          }),
          created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        },
      },
    });
  } catch {
    // never let logger throw
  }
}

export function installErrorCapture() {
  if (browserInstalled || typeof window === "undefined") return;
  browserInstalled = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    const msg = e.message || (e.error && e.error.message) || "Unknown error";
    rememberError(e.error ?? new Error(msg));
    pushToDb("error", "window.error", msg, {
      filename: e.filename, lineno: e.lineno, colno: e.colno,
      stack: e.error?.stack?.slice(0, 2000),
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    const msg = (r && (r.message || r.error_description || r.error)) || String(r);
    rememberError(r);
    pushToDb("error", "unhandledrejection", msg, { stack: r?.stack?.slice(0, 2000) });
  });

  const orig = console.error.bind(console);
  console.error = (...args: any[]) => {
    try {
      const msg = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "object" ? JSON.stringify(a) : String(a)))
        .join(" ");
      if (msg && !/DevTools|React DevTools|Download the React/i.test(msg)) {
        pushToDb("error", "console.error", msg.slice(0, 1000), {});
      }
    } catch {}
    orig(...args);
  };
}
