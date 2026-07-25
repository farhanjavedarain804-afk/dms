// Client-side activity + login tracking utilities.
import { supabase } from "@/integrations/supabase/client";

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

const LOGIN_LOG_KEY = "current_login_log_id";

export async function recordLogin(email: string) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const ua = navigator.userAgent;
    const parsed = parseUA(ua);
    const ip = await getIP();
    const geo = ip ? await getGeo(ip) : {};
    const { data, error } = await supabase
      .from("user_login_logs" as any)
      .insert({
        auth_user_id: user.id,
        username: meta.username ?? null,
        full_name: meta.name ?? null,
        email,
        ip_address: ip,
        user_agent: ua,
        ...parsed,
        ...geo,
        status: "success",
      })
      .select()
      .single();
    if (!error && data) {
      localStorage.setItem(LOGIN_LOG_KEY, String((data as any).id));
    }
    // Ensure app_users row + last_seen
    await supabase.from("app_users" as any).update({
      last_seen_at: new Date().toISOString(),
    }).eq("auth_user_id", user.id);
  } catch (e) {
    console.warn("recordLogin failed", e);
  }
}

export async function recordLogout() {
  try {
    const id = localStorage.getItem(LOGIN_LOG_KEY);
    if (!id) return;
    const { data: row } = await supabase
      .from("user_login_logs" as any)
      .select("login_at")
      .eq("id", Number(id))
      .single();
    const login_at = (row as any)?.login_at;
    const durSec = login_at
      ? Math.max(0, Math.floor((Date.now() - new Date(login_at).getTime()) / 1000))
      : null;
    await supabase.from("user_login_logs" as any).update({
      logout_at: new Date().toISOString(),
      duration_seconds: durSec,
    }).eq("id", Number(id));
    localStorage.removeItem(LOGIN_LOG_KEY);
  } catch {}
}

export async function logActivity(action: string, module?: string, description?: string, meta?: any) {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    const um = user.user_metadata ?? {};
    await supabase.from("user_activity_logs" as any).insert({
      auth_user_id: user.id,
      username: um.username ?? null,
      full_name: um.name ?? null,
      action,
      module,
      description,
      meta: meta ?? null,
      user_agent: navigator.userAgent,
    });
  } catch {}
}

// Heartbeat — updates last_seen_at every 30s and bumps online seconds.
let heartbeatTimer: number | null = null;
export function startHeartbeat() {
  if (heartbeatTimer) return;
  const tick = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    await supabase.from("app_users" as any).update({
      last_seen_at: new Date().toISOString(),
    }).eq("auth_user_id", user.id);
    // Add 30s to total_online_seconds via RPC-less update
    const { data: row } = await supabase
      .from("app_users" as any)
      .select("total_online_seconds")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (row) {
      await supabase.from("app_users" as any).update({
        total_online_seconds: ((row as any).total_online_seconds ?? 0) + 30,
      }).eq("auth_user_id", user.id);
    }
  };
  tick();
  heartbeatTimer = window.setInterval(tick, 30_000);
}
export function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
