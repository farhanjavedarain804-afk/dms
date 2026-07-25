// Client-side activity + login tracking utilities — MySQL backend via server functions.
import { $dbCreate, $dbUpdate, $dbCustomQuery } from "@/lib/mysql-api";

const SESSION_TOKEN_KEY = "dms_session_token";
const LOGIN_LOG_KEY = "current_login_log_id";

function getStoredToken(): string | null {
  try { return localStorage.getItem(SESSION_TOKEN_KEY); } catch { return null; }
}

function parseUA(ua: string) {
  const os =
    /Windows NT 10/.test(ua) ? "Windows 10/11" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "Unknown";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Unknown";
  const device =
    /iPad/.test(ua) ? "Tablet" :
    /Mobi|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";
  return { os, browser, device };
}

async function getIP(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip ?? null;
  } catch {
    return null;
  }
}

async function getGeo(ip: string): Promise<{ city?: string; country?: string }> {
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const j = await r.json();
    return { city: j.city, country: j.country_name };
  } catch {
    return {};
  }
}

export async function recordLogin(email: string) {
  try {
    const ua = navigator.userAgent;
    const parsed = parseUA(ua);
    const ip = await getIP();
    const geo = ip ? await getGeo(ip) : {};
    const row = await $dbCreate({
      data: {
        table: "user_login_logs",
        body: {
          email,
          ip_address: ip,
          user_agent: ua,
          os: parsed.os,
          browser: parsed.browser,
          device: parsed.device,
          city: geo.city ?? null,
          country: geo.country ?? null,
          status: "success",
          login_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        },
      },
    });
    if (row && (row as any).id) {
      localStorage.setItem(LOGIN_LOG_KEY, String((row as any).id));
    }
  } catch (e) {
    console.warn("recordLogin failed", e);
  }
}

export async function recordLogout() {
  try {
    const id = localStorage.getItem(LOGIN_LOG_KEY);
    if (!id) return;
    const rows = await $dbCustomQuery({
      data: {
        table: "user_login_logs",
        columns: "login_at",
        filters: [{ col: "id", op: "eq", val: Number(id) }],
        limit: 1,
      },
    });
    const login_at = (rows as any[])[0]?.login_at;
    const durSec = login_at
      ? Math.max(0, Math.floor((Date.now() - new Date(login_at).getTime()) / 1000))
      : null;
    await $dbUpdate({
      data: {
        table: "user_login_logs",
        id: Number(id),
        body: {
          logout_at: new Date().toISOString().slice(0, 19).replace("T", " "),
          duration_seconds: durSec,
        },
      },
    });
    localStorage.removeItem(LOGIN_LOG_KEY);
  } catch {}
}

export async function logActivity(action: string, module?: string, description?: string, meta?: any) {
  try {
    await $dbCreate({
      data: {
        table: "user_activity_logs",
        body: {
          action,
          module: module ?? null,
          description: description ?? null,
          meta: meta ? JSON.stringify(meta) : null,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        },
      },
    });
  } catch {}
}

// Heartbeat — lightweight ping every 30s
let heartbeatTimer: number | null = null;

export function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = window.setInterval(() => {
    // Minimal activity tracking – avoids frequent DB writes
    // Can be extended with a $dbUpdate for last_seen_at if needed
  }, 30_000);
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
