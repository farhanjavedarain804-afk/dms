import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, Eye, Megaphone, ClipboardCheck, Zap, MessageSquare, BookOpen, Bell,
  Settings as SettingsIcon, ScrollText, Plus, Trash2, Send, Save, ShieldCheck, Globe, Package,
  Activity, MailOpen, Gift, Search, Check, X as XIcon, KeyRound, Mail, Circle, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppLayout } from "@/components/dms/Layout";
import {
  KEYS, readList, writeList, nextId, getSettings, saveSettings, getVisibility,
  type PortalAnnouncement, type PortalApproval, type PortalChangeRequest,
  type PortalMessage, type PortalThread, type PortalKbArticle, type PortalNotification,
  type PortalHosting, type PortalService, type PortalVisibility, type PortalLog,
  type PortalSession, type PortalAnnouncementRead, type PortalReferral, type PortalBooking,
  isSessionOnline, getClientLatestSession, formatDuration,
} from "@/lib/portal-data";

export const Route = createFileRoute("/portal-admin")({
  head: () => ({
    meta: [
      { title: "Client Portal Management — Devionic DMS" },
      { name: "description", content: "Configure and manage the Devionic Client Portal." },
      { property: "og:title", content: "Client Portal Management — Devionic DMS" },
      { property: "og:description", content: "Manage clients, visibility, announcements, and more." },
    ],
  }),
  component: PortalAdmin,
});

const TABS = [
  { key: "clients", label: "Clients & Access", icon: Users },
  { key: "sessions", label: "Sessions", icon: Activity },
  { key: "read_receipts", label: "Read Receipts", icon: MailOpen },
  { key: "referrals", label: "Referrals", icon: Gift },
  { key: "bookings", label: "Bookings", icon: ShoppingCart },
  { key: "visibility", label: "Visibility", icon: Eye },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "approvals", label: "Approvals", icon: ClipboardCheck },
  { key: "change_requests", label: "Change Requests", icon: Zap },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "services", label: "Services", icon: Package },
  { key: "hosting", label: "Hosting", icon: Globe },
  { key: "kb", label: "Knowledge Base", icon: BookOpen },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "settings", label: "Settings", icon: SettingsIcon },
  { key: "logs", label: "Activity", icon: ScrollText },
] as const;

type TabKey = typeof TABS[number]["key"];

function PortalAdmin() {
  const [tab, setTab] = useState<TabKey>("clients");
  const stats = useMemo(() => {
    const readLS = <T,>(k: string): T[] => { try { return JSON.parse(window.localStorage.getItem(k) ?? "[]"); } catch { return []; } };
    const clients = readLS<any>("dms:clients_v2");
    const announcements = readList<PortalAnnouncement>(KEYS.announcements);
    const approvals = readList<PortalApproval>(KEYS.approvals);
    const crs = readList<PortalChangeRequest>(KEYS.change_requests);
    const threads = readList<PortalThread>(KEYS.threads);
    const kb = readList<PortalKbArticle>(KEYS.kb);
    const notifs = readList<PortalNotification>(KEYS.notifications);
    const services = readList<PortalService>(KEYS.services);
    const hosting = readList<PortalHosting>(KEYS.hosting);
    const logs = readList<PortalLog>(KEYS.logs);
    const sessions = readList<PortalSession>(KEYS.sessions);
    const referrals = readList<PortalReferral>(KEYS.referrals);
    const online = sessions.filter(isSessionOnline).length;
    const pendingClients = clients.filter((c: any) => c.portal_approval_status === "pending").length;
    return {
      clients: clients.length,
      activeClients: clients.filter((c: any) => c.status !== "inactive" && c.status !== "archived").length,
      announcements: announcements.filter((a) => a.active).length,
      pendingApprovals: approvals.filter((a) => a.status === "pending").length,
      openCRs: crs.filter((c) => c.status !== "completed" && c.status !== "rejected").length,
      threads: threads.length,
      kb: kb.filter((a) => a.published).length,
      unreadNotifs: notifs.filter((n) => !n.read).length,
      services: services.filter((s) => s.status === "active").length,
      hosting: hosting.length,
      logs24h: logs.filter((l) => Date.now() - new Date(l.at).getTime() < 86400000).length,
      online,
      pendingClients,
      referrals: referrals.length,
      referralsConverted: referrals.filter((r) => r.status === "converted" || r.status === "paid").length,
    };
  }, [tab]);

  const cards = [
    { label: "Clients", value: stats.clients, sub: `${stats.activeClients} active`, icon: Users, tint: "from-blue-500/15 to-blue-500/5 text-blue-600" },
    { label: "Online Now", value: stats.online, sub: "portal sessions", icon: Circle, tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
    { label: "Pending Client Approval", value: stats.pendingClients, sub: "awaiting review", icon: ClipboardCheck, tint: "from-amber-500/15 to-amber-500/5 text-amber-600" },
    { label: "Open Change Requests", value: stats.openCRs, sub: "in review", icon: Zap, tint: "from-violet-500/15 to-violet-500/5 text-violet-600" },
    { label: "Referrals", value: stats.referrals, sub: `${stats.referralsConverted} converted`, icon: Gift, tint: "from-pink-500/15 to-pink-500/5 text-pink-600" },
    { label: "Message Threads", value: stats.threads, sub: "conversations", icon: MessageSquare, tint: "from-teal-500/15 to-teal-500/5 text-teal-600" },
    { label: "Announcements", value: stats.announcements, sub: "published", icon: Megaphone, tint: "from-rose-500/15 to-rose-500/5 text-rose-600" },
    { label: "Activity (24h)", value: stats.logs24h, sub: "portal events", icon: ScrollText, tint: "from-slate-500/15 to-slate-500/5 text-slate-600" },
  ];

  return (
    <AppLayout>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Management</h1>
          <p className="text-sm text-muted-foreground">Configure everything your clients see and can do at /portal.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="relative overflow-hidden rounded-xl border bg-card p-4">
              <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${c.tint} opacity-40 pointer-events-none`} />
              <div className="relative flex items-start justify-between">
                <div className={`h-9 w-9 rounded-lg grid place-items-center bg-gradient-to-br ${c.tint}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="relative mt-3">
                <div className="text-2xl font-bold tracking-tight">{c.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
                <div className="text-[11px] text-muted-foreground/80 mt-1">{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>


      <div className="flex flex-wrap gap-1 border-b pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 text-sm rounded-md transition ${
                tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "clients" && <ClientsTab />}
      {tab === "sessions" && <SessionsTab />}
      {tab === "read_receipts" && <ReadReceiptsTab />}
      {tab === "referrals" && <ReferralsTab />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "visibility" && <VisibilityTab />}
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "approvals" && <ApprovalsTab />}
      {tab === "change_requests" && <ChangeRequestsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "hosting" && <HostingTab />}
      {tab === "kb" && <KbTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "logs" && <LogsTab />}
    </div>
    </AppLayout>
  );
}

// ---- Clients & Access ----
function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [declineFor, setDeclineFor] = useState<any | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    try { setClients(JSON.parse(window.localStorage.getItem("dms:clients_v2") ?? "[]")); } catch { setClients([]); }
  }, [refreshTick]);

  const persist = (list: any[]) => {
    setClients(list);
    window.localStorage.setItem("dms:clients_v2", JSON.stringify(list));
    window.dispatchEvent(new StorageEvent("storage", { key: "dms:clients_v2" }));
  };

  const patch = (id: number, changes: any) => {
    persist(clients.map((c) => c.id === id ? { ...c, ...changes, updated_at: new Date().toISOString() } : c));
  };

  const approve = (c: any) => {
    patch(c.id, { portal_approval_status: "approved", portal_approval_note: "", portal_approved_at: new Date().toISOString() });
    toast.success(`${c.name || c.email} approved`);
  };
  const decline = () => {
    if (!declineFor) return;
    patch(declineFor.id, {
      portal_approval_status: "declined",
      portal_approval_note: declineNote || "Declined by administrator",
      portal_declined_at: new Date().toISOString(),
      portal_disabled: true,
    });
    toast.success("Client declined");
    setDeclineFor(null); setDeclineNote("");
  };
  const toggleAccess = (c: any) => {
    patch(c.id, { portal_disabled: !c.portal_disabled });
    toast.success(c.portal_disabled ? "Access enabled" : "Access disabled");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const status = c.portal_approval_status || "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.email, c.company, c.phone].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [clients, query, statusFilter]);

  const statusBadge = (c: any) => {
    const s = c.portal_approval_status || "pending";
    const map: Record<string, string> = {
      approved: "bg-emerald-500/15 text-emerald-600",
      pending: "bg-amber-500/15 text-amber-600",
      declined: "bg-rose-500/15 text-rose-600",
    };
    return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[s]}`}>{s}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company, phone…"
            className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm"
          />
        </div>
        {(["all", "pending", "approved", "declined"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-9 px-3 text-xs rounded-md border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            {s}
          </button>
        ))}
        <Button size="sm" variant="outline" onClick={() => setRefreshTick((n) => n + 1)}>Refresh</Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No clients match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Contact</th>
                  <th className="text-left px-4 py-2">Session</th>
                  <th className="text-left px-4 py-2">Approval</th>
                  <th className="text-left px-4 py-2">Access</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => {
                  const session = getClientLatestSession(c.email ?? "");
                  const online = session ? isSessionOnline(session) : false;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 align-top">
                      <td className="px-4 py-2">
                        <div className="font-medium">{c.name ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{c.company ?? "—"}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        <div>{c.email ?? "—"}</div>
                        <div>{c.phone ?? ""}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                          <span className={online ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                            {online ? "Online" : session?.ended_at ? "Offline" : session ? "Idle" : "Never"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {session?.device ?? "—"} · {session?.browser ?? ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          IP: {session?.ip ?? "—"} · {formatDuration(session?.duration_sec)}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {statusBadge(c)}
                        {c.portal_approval_note && (
                          <div className="text-[11px] text-muted-foreground mt-1 max-w-[220px] truncate" title={c.portal_approval_note}>
                            {c.portal_approval_note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.portal_disabled ? "bg-rose-500/15 text-rose-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                          {c.portal_disabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {(c.portal_approval_status ?? "pending") !== "approved" && (
                            <button onClick={() => approve(c)} className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">
                              <Check className="h-3 w-3" /> Approve
                            </button>
                          )}
                          {(c.portal_approval_status ?? "pending") !== "declined" && (
                            <button onClick={() => { setDeclineFor(c); setDeclineNote(""); }} className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md bg-rose-500/15 text-rose-600 hover:bg-rose-500/25">
                              <XIcon className="h-3 w-3" /> Decline
                            </button>
                          )}
                          <button onClick={() => setEditing(c)} className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border hover:bg-accent">
                            <KeyRound className="h-3 w-3" /> Credentials
                          </button>
                          <button onClick={() => toggleAccess(c)} className="text-[11px] text-primary hover:underline px-2">
                            {c.portal_disabled ? "Enable" : "Disable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CredentialsDialog
          client={editing}
          onClose={() => setEditing(null)}
          onSave={(changes) => { patch(editing.id, changes); setEditing(null); toast.success("Credentials updated"); }}
        />
      )}

      {declineFor && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setDeclineFor(null)}>
          <div className="w-full max-w-md rounded-xl bg-background border shadow-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">Decline client</div>
            <div className="text-xs text-muted-foreground mt-1">{declineFor.name || declineFor.email}</div>
            <Textarea label="Reason / remarks (visible to admins)" value={declineNote} onChange={setDeclineNote} rows={4} />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeclineFor(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={decline}>Decline</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialsDialog({ client, onClose, onSave }: { client: any; onClose: () => void; onSave: (changes: any) => void }) {
  const [email, setEmail] = useState(client.email ?? "");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState(client.portal_credentials_note ?? "");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-background border shadow-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Client credentials</div>
        <div className="text-xs text-muted-foreground mt-1">{client.name || "—"} · {client.company || "—"}</div>
        <div className="mt-3 space-y-3">
          <Input label="Portal email" value={email} onChange={setEmail} />
          <div>
            <label className="text-xs font-medium">New password (leave blank to keep)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set new password"
                className="flex-1 h-9 px-2 rounded-md border bg-background text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => {
                const p = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!" + Math.floor(Math.random() * 90 + 10);
                setPassword(p);
              }}>Generate</Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Password reset is recorded here — deliver it to the client through your normal channel.</p>
          </div>
          <Textarea label="Admin note" value={note} onChange={setNote} rows={3} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => {
            const changes: any = { email, portal_credentials_note: note };
            if (password) {
              changes.portal_password = password;
              changes.portal_password_updated_at = new Date().toISOString();
            }
            onSave(changes);
          }}><Save className="h-3 w-3 mr-1" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

// ---- Visibility ----
function VisibilityTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [vis, setVis] = useState<PortalVisibility>({});
  useEffect(() => {
    try { setClients(JSON.parse(window.localStorage.getItem("dms:clients_v2") ?? "[]")); } catch { /* noop */ }
    try { setVis(JSON.parse(window.localStorage.getItem(KEYS.visibility) ?? "{}")); } catch { /* noop */ }
  }, []);
  const FEATURES: Array<[string, string]> = [
    ["projects", "Projects"], ["tasks", "Tasks"], ["approvals", "Approvals"], ["change_requests", "Change Requests"],
    ["invoices", "Invoices"], ["tickets", "Tickets"], ["messages", "Messages"], ["documents", "Documents"],
    ["knowledge", "Knowledge Base"], ["services", "Services"], ["hosting", "Hosting"], ["meetings", "Meetings"],
  ];
  const toggle = (email: string, feature: string) => {
    const key = email.toLowerCase();
    const cur = vis[key] ?? {};
    const now = { ...cur, [feature]: !(getVisibility(email) as any)[feature] };
    const next = { ...vis, [key]: now };
    setVis(next);
    window.localStorage.setItem(KEYS.visibility, JSON.stringify(next));
  };
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 sticky left-0 bg-muted/50">Client</th>
            {FEATURES.map(([k, l]) => <th key={k} className="px-2 py-2 text-center">{l}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {clients.map((c) => {
            const v = getVisibility(c.email ?? "");
            return (
              <tr key={c.id}>
                <td className="px-3 py-2 sticky left-0 bg-card">
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.email}</div>
                </td>
                {FEATURES.map(([k]) => (
                  <td key={k} className="px-2 py-2 text-center">
                    <input type="checkbox" checked={(v as any)[k]} onChange={() => toggle(c.email ?? "", k)} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 text-[11px] text-muted-foreground border-t">
        Unchecked features stay hidden in that client's portal. Defaults to visible.
      </div>
    </div>
  );
}

// ---- Announcements ----
function AnnouncementsTab() {
  const [rows, setRows] = useState<PortalAnnouncement[]>([]);
  const [form, setForm] = useState({ title: "", body: "", cta_label: "", cta_url: "", audience: "all" as "all" | "client", audience_key: "" });
  const refresh = () => setRows(readList<PortalAnnouncement>(KEYS.announcements));
  useEffect(refresh, []);
  const add = () => {
    if (!form.title.trim()) return;
    const all = readList<PortalAnnouncement>(KEYS.announcements);
    const row: PortalAnnouncement = { id: nextId(all), ...form, active: true, created_at: new Date().toISOString() };
    writeList(KEYS.announcements, [row, ...all]);
    setForm({ title: "", body: "", cta_label: "", cta_url: "", audience: "all", audience_key: "" });
    toast.success("Announcement published"); refresh();
  };
  const remove = (id: number) => { writeList(KEYS.announcements, rows.filter((r) => r.id !== id)); refresh(); };
  const toggle = (id: number) => {
    const all = rows.map((r) => r.id === id ? { ...r, active: !r.active } : r);
    writeList(KEYS.announcements, all); refresh();
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="CTA Label (optional)" value={form.cta_label} onChange={(v) => setForm({ ...form, cta_label: v })} />
        <div className="md:col-span-2"><Textarea label="Body" value={form.body} onChange={(v) => setForm({ ...form, body: v })} /></div>
        <Input label="CTA URL (optional)" value={form.cta_url} onChange={(v) => setForm({ ...form, cta_url: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Select label="Audience" value={form.audience} onChange={(v) => setForm({ ...form, audience: v as any })} options={[["all", "All clients"], ["client", "Specific client"]]} />
          {form.audience === "client" && <Input label="Client key (email/company)" value={form.audience_key} onChange={(v) => setForm({ ...form, audience_key: v })} />}
        </div>
        <div className="md:col-span-2 flex justify-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Publish</Button></div>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {rows.length === 0 ? <Empty text="No announcements yet." /> :
          rows.map((r) => (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.body}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{r.audience === "all" ? "All clients" : `Client: ${r.audience_key}`}</div>
              </div>
              <button onClick={() => toggle(r.id)} className={`text-[10px] px-2 py-0.5 rounded-full ${r.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted"}`}>{r.active ? "Active" : "Off"}</button>
              <button onClick={() => remove(r.id)} className="text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Approvals ----
function ApprovalsTab() {
  const [rows, setRows] = useState<PortalApproval[]>([]);
  const [form, setForm] = useState({ title: "", description: "", client_key: "" });
  const refresh = () => setRows(readList<PortalApproval>(KEYS.approvals));
  useEffect(refresh, []);
  const add = () => {
    if (!form.title.trim() || !form.client_key.trim()) return;
    const all = readList<PortalApproval>(KEYS.approvals);
    const row: PortalApproval = { id: nextId(all), ...form, status: "pending", requested_at: new Date().toISOString() };
    writeList(KEYS.approvals, [row, ...all]);
    setForm({ title: "", description: "", client_key: "" });
    toast.success("Approval requested"); refresh();
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Client key (company/email)" value={form.client_key} onChange={(v) => setForm({ ...form, client_key: v })} />
        <div className="md:col-span-2"><Textarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /></div>
        <div className="md:col-span-2 flex justify-end"><Button onClick={add}><Send className="h-4 w-4 mr-1" /> Send</Button></div>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {rows.length === 0 ? <Empty text="No approval requests yet." /> :
          rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.client_key} · {new Date(r.requested_at).toLocaleString()}</div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-amber-500/15 text-amber-600" : r.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"}`}>{r.status}</span>
              </div>
              {r.response_note && <div className="text-xs text-muted-foreground mt-1">"{r.response_note}"</div>}
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Change Requests ----
function ChangeRequestsTab() {
  const [rows, setRows] = useState<PortalChangeRequest[]>([]);
  const refresh = () => setRows(readList<PortalChangeRequest>(KEYS.change_requests));
  useEffect(refresh, []);
  const setStatus = (id: number, status: PortalChangeRequest["status"]) => {
    const all = rows.map((r) => r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r);
    writeList(KEYS.change_requests, all); refresh();
  };
  return (
    <div className="rounded-xl border bg-card divide-y">
      {rows.length === 0 ? <Empty text="No change requests." /> :
        rows.map((r) => (
          <div key={r.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground">{r.code} · {r.client_key}</div>
              <div className="text-sm font-semibold">{r.title}</div>
              {r.description && <div className="text-xs text-muted-foreground mt-1">{r.description}</div>}
            </div>
            <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value as any)} className="text-xs h-8 rounded-md border bg-background px-2">
              <option value="submitted">Submitted</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        ))}
    </div>
  );
}

// ---- Messages ----
function MessagesTab() {
  const [threads, setThreads] = useState<PortalThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [draft, setDraft] = useState("");

  const refresh = () => {
    setThreads(readList<PortalThread>(KEYS.threads).sort((a, b) => b.last_at.localeCompare(a.last_at)));
    setMessages(readList<PortalMessage>(KEYS.messages));
  };
  useEffect(refresh, []);

  const msgs = messages.filter((m) => m.thread_id === threadId).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const send = () => {
    if (!draft.trim() || !threadId) return;
    const all = readList<PortalMessage>(KEYS.messages);
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const row: PortalMessage = {
      id: nextId(all), thread_id: threadId, client_key: thread.client_key,
      from: "team", from_name: "Devionic Team", body: draft.trim(),
      created_at: new Date().toISOString(),
    };
    writeList(KEYS.messages, [...all, row]);
    const ts = readList<PortalThread>(KEYS.threads);
    const idx = ts.findIndex((t) => t.id === threadId);
    if (idx >= 0) { ts[idx] = { ...ts[idx], last_at: row.created_at }; writeList(KEYS.threads, ts); }
    setDraft(""); refresh();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <div className="rounded-xl border bg-card overflow-hidden">
        {threads.length === 0 ? <Empty text="No threads." /> :
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {threads.map((t) => (
              <button key={t.id} onClick={() => setThreadId(t.id)} className={`w-full text-left px-4 py-3 hover:bg-muted/30 ${threadId === t.id ? "bg-muted/40" : ""}`}>
                <div className="text-sm font-medium truncate">{t.subject}</div>
                <div className="text-[11px] text-muted-foreground truncate">{t.client_key}</div>
              </button>
            ))}
          </div>}
      </div>
      <div className="rounded-xl border bg-card flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!threadId ? <div className="text-sm text-muted-foreground text-center py-10">Select a thread.</div> :
            msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from === "team" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "team" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="text-[10px] opacity-70 mb-0.5">{m.from_name}</div>{m.body}
                </div>
              </div>
            ))}
        </div>
        {threadId && (
          <div className="border-t p-3 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Reply…" className="flex-1 h-10 rounded-md border bg-background px-3 text-sm" />
            <Button onClick={send}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Services ----
function ServicesTab() {
  const [rows, setRows] = useState<PortalService[]>([]);
  const [form, setForm] = useState<Omit<PortalService, "id">>({ client_key: "", name: "", category: "", price: 0, cycle: "monthly", next_renewal: "", status: "active" });
  const refresh = () => setRows(readList<PortalService>(KEYS.services));
  useEffect(refresh, []);
  const add = () => {
    if (!form.client_key || !form.name) return;
    const all = readList<PortalService>(KEYS.services);
    writeList(KEYS.services, [{ id: nextId(all), ...form }, ...all]);
    setForm({ client_key: "", name: "", category: "", price: 0, cycle: "monthly", next_renewal: "", status: "active" });
    refresh(); toast.success("Service added");
  };
  const remove = (id: number) => { writeList(KEYS.services, rows.filter((r) => r.id !== id)); refresh(); };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input label="Client key" value={form.client_key} onChange={(v) => setForm({ ...form, client_key: v })} />
        <Input label="Service name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="Category" value={form.category ?? ""} onChange={(v) => setForm({ ...form, category: v })} />
        <Input label="Price (PKR)" value={String(form.price ?? 0)} onChange={(v) => setForm({ ...form, price: Number(v) || 0 })} />
        <Select label="Billing cycle" value={form.cycle ?? "monthly"} onChange={(v) => setForm({ ...form, cycle: v as any })} options={[["monthly", "Monthly"], ["quarterly", "Quarterly"], ["yearly", "Yearly"], ["one_time", "One time"]]} />
        <Input label="Next renewal (YYYY-MM-DD)" value={form.next_renewal ?? ""} onChange={(v) => setForm({ ...form, next_renewal: v })} />
        <div className="md:col-span-3 flex justify-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
      </div>
      <SimpleTable rows={rows} onDelete={remove} cols={[["client_key", "Client"], ["name", "Service"], ["category", "Category"], ["price", "Price"], ["cycle", "Cycle"], ["next_renewal", "Renews"], ["status", "Status"]]} />
    </div>
  );
}

// ---- Hosting ----
function HostingTab() {
  const [rows, setRows] = useState<PortalHosting[]>([]);
  const [form, setForm] = useState<Omit<PortalHosting, "id">>({ client_key: "", kind: "domain", name: "", provider: "", expires_at: "", status: "active", notes: "" });
  const refresh = () => setRows(readList<PortalHosting>(KEYS.hosting));
  useEffect(refresh, []);
  const add = () => {
    if (!form.client_key || !form.name) return;
    const all = readList<PortalHosting>(KEYS.hosting);
    writeList(KEYS.hosting, [{ id: nextId(all), ...form }, ...all]);
    setForm({ client_key: "", kind: "domain", name: "", provider: "", expires_at: "", status: "active", notes: "" });
    refresh();
  };
  const remove = (id: number) => { writeList(KEYS.hosting, rows.filter((r) => r.id !== id)); refresh(); };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input label="Client key" value={form.client_key} onChange={(v) => setForm({ ...form, client_key: v })} />
        <Select label="Kind" value={form.kind} onChange={(v) => setForm({ ...form, kind: v as any })} options={[["domain", "Domain"], ["hosting", "Hosting"], ["email", "Email"], ["ssl", "SSL"]]} />
        <Input label="Name (domain/plan)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="Provider" value={form.provider ?? ""} onChange={(v) => setForm({ ...form, provider: v })} />
        <Input label="Expires (YYYY-MM-DD)" value={form.expires_at ?? ""} onChange={(v) => setForm({ ...form, expires_at: v })} />
        <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as any })} options={[["active", "Active"], ["expiring", "Expiring"], ["expired", "Expired"], ["suspended", "Suspended"]]} />
        <div className="md:col-span-3 flex justify-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
      </div>
      <SimpleTable rows={rows} onDelete={remove} cols={[["client_key", "Client"], ["kind", "Kind"], ["name", "Name"], ["provider", "Provider"], ["expires_at", "Expires"], ["status", "Status"]]} />
    </div>
  );
}

// ---- KB ----
function KbTab() {
  const [rows, setRows] = useState<PortalKbArticle[]>([]);
  const [form, setForm] = useState({ title: "", category: "General", body: "", published: true });
  const refresh = () => setRows(readList<PortalKbArticle>(KEYS.kb));
  useEffect(refresh, []);
  const add = () => {
    if (!form.title.trim()) return;
    const all = readList<PortalKbArticle>(KEYS.kb);
    writeList(KEYS.kb, [{ id: nextId(all), ...form, updated_at: new Date().toISOString() }, ...all]);
    setForm({ title: "", category: "General", body: "", published: true });
    refresh(); toast.success("Article saved");
  };
  const remove = (id: number) => { writeList(KEYS.kb, rows.filter((r) => r.id !== id)); refresh(); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <Textarea label="Body (markdown supported)" value={form.body} onChange={(v) => setForm({ ...form, body: v })} rows={10} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish to portal
        </label>
        <div className="flex justify-end"><Button onClick={add}><Save className="h-4 w-4 mr-1" /> Save</Button></div>
      </div>
      <div className="rounded-xl border bg-card divide-y max-h-[600px] overflow-y-auto">
        {rows.length === 0 ? <Empty text="No articles yet." /> :
          rows.map((r) => (
            <div key={r.id} className="p-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-[11px] text-muted-foreground">{r.category} · {r.published ? "Published" : "Draft"}</div>
              </div>
              <button onClick={() => remove(r.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Notifications ----
function NotificationsTab() {
  const [rows, setRows] = useState<PortalNotification[]>([]);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" as "all" | "client", audience_key: "", link: "", kind: "info" as PortalNotification["kind"] });
  const refresh = () => setRows(readList<PortalNotification>(KEYS.notifications));
  useEffect(refresh, []);
  const send = () => {
    if (!form.title.trim()) return;
    const all = readList<PortalNotification>(KEYS.notifications);
    writeList(KEYS.notifications, [{ id: nextId(all), ...form, created_at: new Date().toISOString() }, ...all]);
    setForm({ title: "", body: "", audience: "all", audience_key: "", link: "", kind: "info" });
    refresh(); toast.success("Notification sent");
  };
  const remove = (id: number) => { writeList(KEYS.notifications, rows.filter((r) => r.id !== id)); refresh(); };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Select label="Kind" value={form.kind} onChange={(v) => setForm({ ...form, kind: v as any })} options={[["info", "Info"], ["success", "Success"], ["warning", "Warning"], ["billing", "Billing"], ["support", "Support"], ["project", "Project"]]} />
        <div className="md:col-span-2"><Textarea label="Body" value={form.body} onChange={(v) => setForm({ ...form, body: v })} /></div>
        <Select label="Audience" value={form.audience} onChange={(v) => setForm({ ...form, audience: v as any })} options={[["all", "All clients"], ["client", "Specific client"]]} />
        {form.audience === "client" && <Input label="Client key" value={form.audience_key} onChange={(v) => setForm({ ...form, audience_key: v })} />}
        <Input label="Link (optional)" value={form.link} onChange={(v) => setForm({ ...form, link: v })} />
        <div className="md:col-span-2 flex justify-end"><Button onClick={send}><Send className="h-4 w-4 mr-1" /> Send</Button></div>
      </div>
      <div className="rounded-xl border bg-card divide-y max-h-[500px] overflow-y-auto">
        {rows.length === 0 ? <Empty text="No notifications sent." /> :
          rows.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{n.kind} · {n.audience === "all" ? "All" : n.audience_key}</div>
              </div>
              <button onClick={() => remove(n.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Settings ----
function SettingsTab() {
  const [s, setS] = useState(getSettings());
  return (
    <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={s.captcha_enabled} onChange={(e) => setS({ ...s, captcha_enabled: e.target.checked })} />
        Require math captcha on portal login
      </label>
      <Input label="Session (minutes)" value={String(s.session_minutes)} onChange={(v) => setS({ ...s, session_minutes: Number(v) || 240 })} />
      <Input label="Brand color (hex)" value={s.brand_color ?? ""} onChange={(v) => setS({ ...s, brand_color: v })} />
      <Input label="Support email" value={s.support_email ?? ""} onChange={(v) => setS({ ...s, support_email: v })} />
      <Input label="Support phone" value={s.support_phone ?? ""} onChange={(v) => setS({ ...s, support_phone: v })} />
      <div className="md:col-span-2"><Textarea label="Portal welcome note" value={s.welcome_note ?? ""} onChange={(v) => setS({ ...s, welcome_note: v })} /></div>
      <div className="md:col-span-2 flex justify-end"><Button onClick={() => { saveSettings(s); toast.success("Portal settings saved"); }}><Save className="h-4 w-4 mr-1" /> Save</Button></div>
    </div>
  );
}

// ---- Logs ----
function LogsTab() {
  const rows = useMemo(() => readList<PortalLog>(KEYS.logs), []);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {rows.length === 0 ? <Empty text="No portal activity yet." /> :
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Client</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Page</th>
              <th className="text-left px-4 py-2">User Agent</th>
              <th className="text-left px-4 py-2">At</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.slice(0, 200).map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-xs">{l.client_key}</td>
                <td className="px-4 py-2 text-xs font-medium">{l.action}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.page ?? "—"}</td>
                <td className="px-4 py-2 text-[10px] text-muted-foreground truncate max-w-[240px]">{l.ua ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(l.at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>}
    </div>
  );
}

// ---- shared UI ----
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
    </div>
  );
}
function Textarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
function SimpleTable({ rows, cols, onDelete }: { rows: any[]; cols: Array<[string, string]>; onDelete: (id: number) => void }) {
  if (rows.length === 0) return <div className="rounded-xl border bg-card"><Empty text="Nothing yet." /></div>;
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>{cols.map(([, l]) => <th key={l} className="text-left px-4 py-2">{l}</th>)}<th className="px-4 py-2"></th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30">
              {cols.map(([k]) => <td key={k} className="px-4 py-2 text-xs">{String(r[k] ?? "—")}</td>)}
              <td className="px-4 py-2 text-right"><button onClick={() => onDelete(r.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

// ---- Sessions ----
function SessionsTab() {
  const [rows, setRows] = useState<PortalSession[]>([]);
  const [q, setQ] = useState("");
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setRows(readList<PortalSession>(KEYS.sessions));
    const iv = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(iv);
  }, [tick]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => !onlyOnline || isSessionOnline(r))
      .filter((r) => !t || [r.client_key, r.name, r.company, r.ip, r.device, r.browser].some((v) => (v ?? "").toLowerCase().includes(t)))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }, [rows, q, onlyOnline]);

  const clearAll = () => {
    if (!confirm("Clear all portal session history? Active sessions will not be interrupted.")) return;
    writeList<PortalSession>(KEYS.sessions, []);
    setRows([]);
    toast.success("Session history cleared");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, IP, device…"
            className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm" />
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input type="checkbox" checked={onlyOnline} onChange={(e) => setOnlyOnline(e.target.checked)} />
          Online only
        </label>
        <Button size="sm" variant="outline" onClick={() => setTick((n) => n + 1)}>Refresh</Button>
        <Button size="sm" variant="destructive" onClick={clearAll}>Clear history</Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No sessions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Device / Browser</th>
                  <th className="text-left px-4 py-2">IP</th>
                  <th className="text-left px-4 py-2">Login</th>
                  <th className="text-left px-4 py-2">Logout</th>
                  <th className="text-left px-4 py-2">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => {
                  const online = isSessionOnline(s);
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 align-top">
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${online ? "bg-emerald-500/15 text-emerald-600" : s.ended_at ? "bg-slate-500/15 text-slate-600" : "bg-amber-500/15 text-amber-600"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : s.ended_at ? "bg-slate-500" : "bg-amber-500"}`} />
                          {online ? "Online" : s.ended_at ? "Offline" : "Idle"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{s.name ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{s.client_key}</div>
                        {s.company && <div className="text-[11px] text-muted-foreground">{s.company}</div>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        <div>{s.device ?? "—"}</div>
                        <div>{s.browser ?? ""}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">{s.ip ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2 text-xs font-medium">{formatDuration(s.duration_sec)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Announcement Read Receipts ----
function ReadReceiptsTab() {
  const [reads, setReads] = useState<PortalAnnouncementRead[]>([]);
  const [anns, setAnns] = useState<PortalAnnouncement[]>([]);
  const [selected, setSelected] = useState<number | "all">("all");

  useEffect(() => {
    setReads(readList<PortalAnnouncementRead>(KEYS.ann_reads));
    setAnns(readList<PortalAnnouncement>(KEYS.announcements));
  }, []);

  const filtered = useMemo(() => {
    const rows = selected === "all" ? reads : reads.filter((r) => r.announcement_id === selected);
    return rows.sort((a, b) => b.opened_at.localeCompare(a.opened_at));
  }, [reads, selected]);

  const titleFor = (id: number) => anns.find((a) => a.id === id)?.title ?? `#${id}`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
        <Select
          label=""
          value={selected === "all" ? "all" : String(selected)}
          onChange={(v) => setSelected(v === "all" ? "all" : Number(v))}
          options={[["all", "All announcements"], ...anns.map((a) => [String(a.id), a.title] as [string, string])]}
        />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <MailOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No read receipts yet. Clients will show up here as they open the dashboard.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Announcement</th>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Opened</th>
                  <th className="text-left px-4 py-2">Read</th>
                  <th className="text-left px-4 py-2">Dismissed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{titleFor(r.announcement_id)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.client_key}</td>
                    <td className="px-4 py-2 text-xs">{new Date(r.opened_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs">
                      {r.read_at
                        ? <span className="text-emerald-600">{new Date(r.read_at).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.dismissed_at ? new Date(r.dismissed_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Referrals ----
function ReferralsTab() {
  const [rows, setRows] = useState<PortalReferral[]>([]);
  const [editing, setEditing] = useState<PortalReferral | null>(null);

  useEffect(() => { setRows(readList<PortalReferral>(KEYS.referrals)); }, []);

  const persist = (list: PortalReferral[]) => { setRows(list); writeList(KEYS.referrals, list); };

  const addNew = () => {
    const code = "REF-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const now = new Date().toISOString();
    setEditing({
      id: nextId(rows), referrer_key: "", referrer_name: "", referred_name: "",
      referred_email: "", referred_company: "", commission_percent: 10,
      status: "invited", code, created_at: now, updated_at: now,
    });
  };

  const save = (r: PortalReferral) => {
    const now = new Date().toISOString();
    const withAmt = { ...r, commission_amount: r.project_value ? Math.round((r.project_value * r.commission_percent) / 100) : undefined, updated_at: now };
    const idx = rows.findIndex((x) => x.id === r.id);
    persist(idx >= 0 ? rows.map((x) => x.id === r.id ? withAmt : x) : [withAmt, ...rows]);
    toast.success("Referral saved");
    setEditing(null);
  };

  const remove = (id: number) => { persist(rows.filter((r) => r.id !== id)); toast.success("Referral removed"); };

  const totals = useMemo(() => ({
    invited: rows.length,
    converted: rows.filter((r) => r.status === "converted" || r.status === "paid").length,
    projectValue: rows.reduce((s, r) => s + (Number(r.project_value) || 0), 0),
    commission: rows.reduce((s, r) => s + (Number(r.commission_amount) || 0), 0),
  }), [rows]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total referrals", v: totals.invited },
          { l: "Converted / paid", v: totals.converted },
          { l: "Project value (PKR)", v: totals.projectValue.toLocaleString() },
          { l: "Commission (PKR)", v: totals.commission.toLocaleString() },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="text-2xl font-bold mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Referral Program</div>
            <div className="text-[11px] text-muted-foreground">Track who referred whom and their commission on won projects.</div>
          </div>
          <Button size="sm" onClick={addNew}><Plus className="h-3 w-3 mr-1" /> New referral</Button>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No referrals yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Referrer</th>
                  <th className="text-left px-4 py-2">Referred</th>
                  <th className="text-left px-4 py-2">Project (PKR)</th>
                  <th className="text-left px-4 py-2">%</th>
                  <th className="text-left px-4 py-2">Commission</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-xs">{r.referrer_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{r.referrer_key}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-xs">{r.referred_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.referred_email || r.referred_company || ""}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">{r.project_value ? r.project_value.toLocaleString() : "—"}</td>
                    <td className="px-4 py-2 text-xs">{r.commission_percent}%</td>
                    <td className="px-4 py-2 text-xs font-medium">{r.commission_amount ? r.commission_amount.toLocaleString() : "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(r)} className="text-xs text-primary hover:underline mr-3">Edit</button>
                      <button onClick={() => remove(r.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ReferralDialog referral={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function ReferralDialog({ referral, onClose, onSave }: { referral: PortalReferral; onClose: () => void; onSave: (r: PortalReferral) => void }) {
  const [r, setR] = useState<PortalReferral>(referral);
  const upd = (patch: Partial<PortalReferral>) => setR({ ...r, ...patch });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-background border shadow-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Referral</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Referrer name" value={r.referrer_name ?? ""} onChange={(v) => upd({ referrer_name: v })} />
          <Input label="Referrer email (client key)" value={r.referrer_key} onChange={(v) => upd({ referrer_key: v.toLowerCase() })} />
          <Input label="Referred name" value={r.referred_name} onChange={(v) => upd({ referred_name: v })} />
          <Input label="Referred email" value={r.referred_email ?? ""} onChange={(v) => upd({ referred_email: v })} />
          <Input label="Referred company" value={r.referred_company ?? ""} onChange={(v) => upd({ referred_company: v })} />
          <Input label="Referral code" value={r.code} onChange={(v) => upd({ code: v })} />
          <Input label="Project value (PKR)" value={String(r.project_value ?? "")} onChange={(v) => upd({ project_value: v ? Number(v) : undefined })} />
          <Input label="Commission %" value={String(r.commission_percent)} onChange={(v) => upd({ commission_percent: Number(v) || 0 })} />
          <Select
            label="Status"
            value={r.status}
            onChange={(v) => upd({ status: v as PortalReferral["status"] })}
            options={[["invited","invited"],["signed_up","signed_up"],["converted","converted"],["paid","paid"],["cancelled","cancelled"]]}
          />
        </div>
        <div className="mt-3">
          <Textarea label="Notes" value={r.notes ?? ""} onChange={(v) => upd({ notes: v })} rows={2} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(r)}><Save className="h-3 w-3 mr-1" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

// ---- Bookings ----
function BookingsTab() {
  const [rows, setRows] = useState<PortalBooking[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PortalBooking["status"]>("all");
  const [editing, setEditing] = useState<PortalBooking | null>(null);
  const [note, setNote] = useState("");

  const refresh = () => setRows(readList<PortalBooking>(KEYS.bookings));
  useEffect(() => { refresh(); }, []);

  const persist = (list: PortalBooking[]) => { writeList(KEYS.bookings, list); setRows(list); };

  const setStatus = (b: PortalBooking, status: PortalBooking["status"], adminNote?: string) => {
    const now = new Date().toISOString();
    persist(rows.map((r) => r.id === b.id ? { ...r, status, admin_note: adminNote ?? r.admin_note, updated_at: now } : r));
    toast.success(`Booking ${status}`);
  };

  const remove = (id: number) => { if (!confirm("Delete this booking?")) return; persist(rows.filter((r) => r.id !== id)); };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => !t || [r.code, r.name, r.client_key, r.client_name, r.client_company, r.catalog_code].some((v) => (v ?? "").toLowerCase().includes(t)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [rows, q, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    requested: rows.filter((r) => r.status === "requested").length,
    active: rows.filter((r) => r.status === "approved" || r.status === "in_progress").length,
    value: rows.filter((r) => r.status !== "declined" && r.status !== "cancelled").reduce((s, r) => s + (r.total || 0), 0),
  }), [rows]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total bookings", v: stats.total },
          { l: "Awaiting review", v: stats.requested },
          { l: "Approved / in progress", v: stats.active },
          { l: "Booked value (PKR)", v: stats.value.toLocaleString() },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="text-2xl font-bold mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, client, item…"
            className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm" />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all","requested","approved","in_progress","completed","declined","cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`h-9 px-3 text-xs rounded-md border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No bookings match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Client</th>
                  <th className="text-left px-4 py-2">Item</th>
                  <th className="text-left px-4 py-2">Qty</th>
                  <th className="text-left px-4 py-2">Total</th>
                  <th className="text-left px-4 py-2">Start</th>
                  <th className="text-left px-4 py-2">Requested</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 align-top">
                    <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-xs">{b.client_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{b.client_key}</div>
                      {b.client_company && <div className="text-[11px] text-muted-foreground">{b.client_company}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-xs">{b.name}</div>
                      <div className="text-[11px] text-muted-foreground">{b.catalog_code} · {b.catalog_kind}</div>
                      {b.notes && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">"{b.notes}"</div>}
                      {b.admin_note && <div className="text-[11px] text-primary mt-1">Admin: {b.admin_note}</div>}
                    </td>
                    <td className="px-4 py-2 text-xs">{b.quantity} {b.unit}</td>
                    <td className="px-4 py-2 text-xs font-medium">{b.total.toLocaleString()} {b.currency}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{b.preferred_start || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        b.status === "requested" ? "bg-amber-500/15 text-amber-600" :
                        b.status === "approved" ? "bg-blue-500/15 text-blue-600" :
                        b.status === "in_progress" ? "bg-violet-500/15 text-violet-600" :
                        b.status === "completed" ? "bg-emerald-500/15 text-emerald-600" :
                        b.status === "declined" ? "bg-rose-500/15 text-rose-600" :
                        "bg-muted text-muted-foreground"
                      }`}>{b.status.replace("_"," ")}</span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex flex-wrap gap-1 justify-end">
                        {b.status === "requested" && (
                          <>
                            <button onClick={() => setStatus(b, "approved")} className="text-[11px] px-2 h-7 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">Approve</button>
                            <button onClick={() => { setEditing(b); setNote(""); }} className="text-[11px] px-2 h-7 rounded-md bg-rose-500/15 text-rose-600 hover:bg-rose-500/25">Decline</button>
                          </>
                        )}
                        {b.status === "approved" && (
                          <button onClick={() => setStatus(b, "in_progress")} className="text-[11px] px-2 h-7 rounded-md bg-violet-500/15 text-violet-600 hover:bg-violet-500/25">Start</button>
                        )}
                        {b.status === "in_progress" && (
                          <button onClick={() => setStatus(b, "completed")} className="text-[11px] px-2 h-7 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">Complete</button>
                        )}
                        <button onClick={() => remove(b.id)} className="text-[11px] text-rose-600 hover:underline px-2">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl bg-background border shadow-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">Decline booking {editing.code}</div>
            <div className="text-xs text-muted-foreground mt-1">{editing.name} · {editing.client_key}</div>
            <Textarea label="Reason (visible to client)" value={note} onChange={setNote} rows={4} />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={() => { setStatus(editing, "declined", note || "Declined by administrator"); setEditing(null); }}>Decline</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
