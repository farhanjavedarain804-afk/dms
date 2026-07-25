// Shared data layer for the Client Portal + DMS-side management module.
// Everything is stored in localStorage under `dms:portal_*` keys so it lives
// alongside the existing local-first modules and stays reactive across tabs.

export type PortalAnnouncement = {
  id: number;
  title: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  audience: "all" | "client";
  audience_key?: string; // company or email when audience==='client'
  active: boolean;
  created_at: string;
  expires_at?: string;
};

export type PortalApproval = {
  id: number;
  title: string;
  description?: string;
  client_key: string; // company/name/email
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  responded_at?: string;
  response_note?: string;
  created_by?: string;
};

export type PortalChangeRequest = {
  id: number;
  code: string;
  title: string;
  description: string;
  client_key: string;
  project?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "submitted" | "in_review" | "approved" | "rejected" | "completed";
  created_at: string;
  updated_at: string;
};

export type PortalMessage = {
  id: number;
  thread_id: string;
  client_key: string;
  from: "client" | "team";
  from_name: string;
  body: string;
  created_at: string;
};

export type PortalThread = {
  id: string;
  client_key: string;
  subject: string;
  last_at: string;
  unread_client?: number;
  unread_team?: number;
};

export type PortalKbArticle = {
  id: number;
  title: string;
  category: string;
  body: string;
  published: boolean;
  updated_at: string;
};

export type PortalNotification = {
  id: number;
  title: string;
  body?: string;
  audience: "all" | "client";
  audience_key?: string;
  link?: string;
  kind: "info" | "success" | "warning" | "billing" | "support" | "project";
  read?: boolean;
  created_at: string;
};

export type PortalHosting = {
  id: number;
  client_key: string;
  kind: "hosting" | "domain" | "email" | "ssl";
  name: string;
  provider?: string;
  expires_at?: string;
  status: "active" | "expiring" | "expired" | "suspended";
  notes?: string;
};

export type PortalService = {
  id: number;
  client_key: string;
  name: string;
  category?: string;
  price?: number;
  cycle?: "monthly" | "quarterly" | "yearly" | "one_time";
  next_renewal?: string;
  status: "active" | "paused" | "cancelled";
};

export type PortalVisibility = Record<
  string,
  {
    projects?: boolean;
    invoices?: boolean;
    tickets?: boolean;
    documents?: boolean;
    meetings?: boolean;
    tasks?: boolean;
    approvals?: boolean;
    change_requests?: boolean;
    services?: boolean;
    hosting?: boolean;
    knowledge?: boolean;
    messages?: boolean;
  }
>;

export type PortalSettings = {
  captcha_enabled: boolean;
  session_minutes: number;
  brand_color?: string;
  welcome_note?: string;
  support_email?: string;
  support_phone?: string;
};

export type PortalLog = {
  id: number;
  client_key: string;
  action: string;
  page?: string;
  ip?: string;
  ua?: string;
  at: string;
};

export const KEYS = {
  announcements: "dms:portal_announcements",
  approvals: "dms:portal_approvals",
  change_requests: "dms:portal_change_requests",
  messages: "dms:portal_messages",
  threads: "dms:portal_threads",
  kb: "dms:portal_kb",
  notifications: "dms:portal_notifications",
  hosting: "dms:portal_hosting",
  services: "dms:portal_services",
  visibility: "dms:portal_visibility",
  settings: "dms:portal_settings",
  logs: "dms:portal_logs",
  sessions: "dms:portal_sessions",
  ann_reads: "dms:portal_ann_reads",
  referrals: "dms:portal_referrals",
  bookings: "dms:portal_bookings",
} as const;

export type PortalBooking = {
  id: number;
  code: string;                       // BK-XXXXX
  client_key: string;                 // email lowercased
  client_name?: string;
  client_company?: string;
  catalog_id: number;
  catalog_code: string;
  catalog_kind: "service" | "product" | "subscription" | "package";
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  currency: string;
  billing_cycle?: string;
  preferred_start?: string;
  notes?: string;
  status: "requested" | "approved" | "in_progress" | "completed" | "declined" | "cancelled";
  admin_note?: string;
  created_at: string;
  updated_at: string;
};

export type PortalSession = {
  id: number;
  client_key: string;   // email lowercased
  name?: string;
  company?: string;
  device?: string;      // parsed platform / device summary
  browser?: string;
  ua?: string;
  ip?: string;
  started_at: string;
  last_seen_at: string; // heartbeat — used to compute online + duration
  ended_at?: string;
  duration_sec?: number;
};

export type PortalAnnouncementRead = {
  id: number;
  announcement_id: number;
  client_key: string;
  opened_at: string;        // first time the banner/card was displayed
  read_at?: string;         // when user explicitly acknowledged / opened detail
  dismissed_at?: string;
};

export type PortalReferral = {
  id: number;
  referrer_key: string;      // client email who referred
  referrer_name?: string;
  referred_name: string;     // referred contact/company
  referred_email?: string;
  referred_company?: string;
  project_value?: number;    // PKR value of resulting project (if any)
  commission_percent: number;
  commission_amount?: number;
  status: "invited" | "signed_up" | "converted" | "paid" | "cancelled";
  code: string;              // referral code shared
  notes?: string;
  created_at: string;
  updated_at: string;
};

export function readList<T>(key: string): T[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
export function writeList<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}
export function nextId(rows: { id: number }[]) {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

export function getSettings(): PortalSettings {
  try {
    const raw = window.localStorage.getItem(KEYS.settings);
    if (raw) return JSON.parse(raw) as PortalSettings;
  } catch { /* noop */ }
  return { captcha_enabled: true, session_minutes: 240 };
}
export function saveSettings(s: PortalSettings) {
  window.localStorage.setItem(KEYS.settings, JSON.stringify(s));
  window.dispatchEvent(new StorageEvent("storage", { key: KEYS.settings }));
}

export function getVisibility(clientKey: string) {
  const all = (() => {
    try { return JSON.parse(window.localStorage.getItem(KEYS.visibility) ?? "{}") as PortalVisibility; }
    catch { return {}; }
  })();
  const v = all[clientKey.toLowerCase()] ?? {};
  // default everything on
  return {
    projects: v.projects ?? true,
    invoices: v.invoices ?? true,
    tickets: v.tickets ?? true,
    documents: v.documents ?? true,
    meetings: v.meetings ?? true,
    tasks: v.tasks ?? true,
    approvals: v.approvals ?? true,
    change_requests: v.change_requests ?? true,
    services: v.services ?? true,
    hosting: v.hosting ?? true,
    knowledge: v.knowledge ?? true,
    messages: v.messages ?? true,
  };
}

export function matchesClient(rowKey: string | undefined, ident: { company?: string; name?: string; email?: string }) {
  const val = (rowKey ?? "").toLowerCase();
  if (!val) return false;
  return (
    (ident.company && val.includes(ident.company.toLowerCase())) ||
    (ident.name && val.includes(ident.name.toLowerCase())) ||
    (ident.email && val.includes(ident.email.toLowerCase()))
  ) as boolean;
}

export function logPortal(action: string, clientKey: string, page?: string) {
  try {
    const rows = readList<PortalLog>(KEYS.logs);
    const row: PortalLog = {
      id: nextId(rows),
      client_key: clientKey,
      action,
      page,
      at: new Date().toISOString(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };
    writeList(KEYS.logs, [row, ...rows].slice(0, 1000));
  } catch { /* noop */ }
}

/* ------------------------------------------------------------- */
/*  Session tracking (client portal)                              */
/* ------------------------------------------------------------- */

const SESSION_ID_KEY = "dms:portal_active_session_id";
export const ONLINE_WINDOW_MS = 90_000; // heartbeat within 90s => online

function detectDevice(): { device: string; browser: string } {
  if (typeof navigator === "undefined") return { device: "Unknown", browser: "Unknown" };
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const platform = (navigator as any).platform || "";
  const device = isTablet ? "Tablet" : isMobile ? "Mobile" : `Desktop (${platform || "PC"})`;
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return { device, browser };
}

async function fetchIp(): Promise<string | undefined> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!res.ok) return undefined;
    const j = await res.json();
    return j.ip;
  } catch { return undefined; }
}

export async function startPortalSession(ident: { email: string; name?: string; company?: string }) {
  if (typeof window === "undefined" || !ident.email) return;
  const key = ident.email.toLowerCase();
  const all = readList<PortalSession>(KEYS.sessions);
  const { device, browser } = detectDevice();
  const ip = await fetchIp();
  const now = new Date().toISOString();
  const row: PortalSession = {
    id: nextId(all),
    client_key: key,
    name: ident.name,
    company: ident.company,
    device, browser, ip,
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    started_at: now,
    last_seen_at: now,
  };
  writeList(KEYS.sessions, [row, ...all].slice(0, 2000));
  window.sessionStorage.setItem(SESSION_ID_KEY, String(row.id));
  logPortal("login", key);
}

export function heartbeatPortalSession() {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!raw) return;
  const id = Number(raw);
  const all = readList<PortalSession>(KEYS.sessions);
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const now = new Date().toISOString();
  const started = new Date(all[idx].started_at).getTime();
  all[idx] = {
    ...all[idx],
    last_seen_at: now,
    duration_sec: Math.round((Date.now() - started) / 1000),
  };
  writeList(KEYS.sessions, all);
}

export function endPortalSession() {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!raw) return;
  const id = Number(raw);
  const all = readList<PortalSession>(KEYS.sessions);
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const now = new Date().toISOString();
    const started = new Date(all[idx].started_at).getTime();
    all[idx] = {
      ...all[idx],
      ended_at: now,
      last_seen_at: now,
      duration_sec: Math.round((Date.now() - started) / 1000),
    };
    writeList(KEYS.sessions, all);
    logPortal("logout", all[idx].client_key);
  }
  window.sessionStorage.removeItem(SESSION_ID_KEY);
}

export function isSessionOnline(s: PortalSession): boolean {
  if (s.ended_at) return false;
  return Date.now() - new Date(s.last_seen_at).getTime() < ONLINE_WINDOW_MS;
}

export function getClientLatestSession(clientKey: string): PortalSession | undefined {
  const k = clientKey.toLowerCase();
  return readList<PortalSession>(KEYS.sessions)
    .filter((s) => s.client_key === k)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
}

export function formatDuration(sec?: number): string {
  if (!sec || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ------------------------------------------------------------- */
/*  Announcement read receipts                                    */
/* ------------------------------------------------------------- */

export function markAnnouncementOpened(announcementId: number, clientKey: string) {
  const key = clientKey.toLowerCase();
  const all = readList<PortalAnnouncementRead>(KEYS.ann_reads);
  const existing = all.find((r) => r.announcement_id === announcementId && r.client_key === key);
  if (existing) return;
  const row: PortalAnnouncementRead = {
    id: nextId(all),
    announcement_id: announcementId,
    client_key: key,
    opened_at: new Date().toISOString(),
  };
  writeList(KEYS.ann_reads, [row, ...all]);
}

export function markAnnouncementRead(announcementId: number, clientKey: string) {
  const key = clientKey.toLowerCase();
  const all = readList<PortalAnnouncementRead>(KEYS.ann_reads);
  const idx = all.findIndex((r) => r.announcement_id === announcementId && r.client_key === key);
  const now = new Date().toISOString();
  if (idx >= 0) {
    if (all[idx].read_at) return;
    all[idx] = { ...all[idx], read_at: now };
    writeList(KEYS.ann_reads, all);
  } else {
    const row: PortalAnnouncementRead = {
      id: nextId(all),
      announcement_id: announcementId,
      client_key: key,
      opened_at: now, read_at: now,
    };
    writeList(KEYS.ann_reads, [row, ...all]);
  }
}

export function markAnnouncementDismissed(announcementId: number, clientKey: string) {
  const key = clientKey.toLowerCase();
  const all = readList<PortalAnnouncementRead>(KEYS.ann_reads);
  const idx = all.findIndex((r) => r.announcement_id === announcementId && r.client_key === key);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...all[idx], dismissed_at: now };
    writeList(KEYS.ann_reads, all);
  } else {
    writeList(KEYS.ann_reads, [{
      id: nextId(all), announcement_id: announcementId, client_key: key,
      opened_at: now, dismissed_at: now,
    }, ...all]);
  }
}
