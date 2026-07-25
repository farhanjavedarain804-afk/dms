// One-click configuration key: bundles the app's backend endpoint,
// publishable key, company identity and a generated access token into a
// single string. Paste it into another Devionic install to auto-wire it.

const KEY = "dms:app-config-key";
const APPLIED_KEY = "dms:app-config-applied";

export type AppConfig = {
  v: 1;
  issued_at: string;
  token: string;             // random access token
  api_url: string;           // Supabase / backend URL
  api_key: string;           // publishable/anon key
  company_name: string;
  company_email: string;
  app_name: string;
};

function b64encode(s: string) {
  if (typeof window === "undefined") return "";
  return window.btoa(unescape(encodeURIComponent(s)));
}
function b64decode(s: string) {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(escape(window.atob(s)));
}

function randToken(len = 40) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(bytes, (b) => alpha[b % alpha.length]).join("");
}

/** Pack config into a "DVNC-..." key string. */
export function encodeConfigKey(cfg: AppConfig): string {
  return `DVNC-${b64encode(JSON.stringify(cfg))}`;
}

/** Parse a "DVNC-..." key back into config. Returns null on failure. */
export function decodeConfigKey(raw: string): AppConfig | null {
  try {
    const trimmed = raw.trim();
    const body = trimmed.startsWith("DVNC-") ? trimmed.slice(5) : trimmed;
    const cfg = JSON.parse(b64decode(body)) as AppConfig;
    if (!cfg || cfg.v !== 1 || !cfg.token || !cfg.api_url) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function loadStoredConfig(): { key: string; cfg: AppConfig } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const cfg = decodeConfigKey(raw);
    return cfg ? { key: raw, cfg } : null;
  } catch { return null; }
}

export function saveStoredConfig(key: string) {
  window.localStorage.setItem(KEY, key);
}
export function clearStoredConfig() {
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(APPLIED_KEY);
}

export function loadAppliedConfig(): AppConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APPLIED_KEY);
    return raw ? (JSON.parse(raw) as AppConfig) : null;
  } catch { return null; }
}
export function saveAppliedConfig(cfg: AppConfig) {
  window.localStorage.setItem(APPLIED_KEY, JSON.stringify(cfg));
}

/** Generate a fresh key for the currently running app. */
export function generateConfigKey(company: { name: string; email: string }, appName = "Devionic DMS"): { key: string; cfg: AppConfig } {
  const cfg: AppConfig = {
    v: 1,
    issued_at: new Date().toISOString(),
    token: randToken(40),
    api_url: import.meta.env.VITE_SUPABASE_URL ?? "",
    api_key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    company_name: company.name,
    company_email: company.email,
    app_name: appName,
  };
  const key = encodeConfigKey(cfg);
  saveStoredConfig(key);
  return { key, cfg };
}

/** One-click setup URL that pre-fills the key on another Devionic install. */
export function setupUrlFor(key: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/settings?configure=${encodeURIComponent(key)}`;
}
