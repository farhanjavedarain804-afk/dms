import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Receipt,
  LifeBuoy,
  FileText,
  CalendarDays,
  ArrowRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Plus,
  Upload,
  CreditCard,
  Video,
  Bell,
  Rocket,
  X,
} from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { fmtPKR } from "@/lib/pk";
import { KEYS, readList, type PortalAnnouncement, type PortalNotification, markAnnouncementOpened, markAnnouncementRead, markAnnouncementDismissed } from "@/lib/portal-data";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Devionic Client Portal" },
      { name: "description", content: "Your account overview: active projects, tickets, invoices, meetings and more." },
      { property: "og:title", content: "Client Dashboard — Devionic Portal" },
      { property: "og:description", content: "Your account overview with Devionic." },
    ],
  }),
  component: PortalDashboard,
});

function readLocal<T = any>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(`dms:${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function matches(a?: string, b?: string) {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
}

function PortalDashboard() {
  const ident = usePortalIdentity();
  const clientKey = (ident.company || ident.name || ident.email).toLowerCase();
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<number | null>(null);
  const [data, setData] = useState({
    invoices: [] as any[], tickets: [] as any[], projects: [] as any[],
    docs: [] as any[], meetings: [] as any[], transactions: [] as any[],
  });

  useEffect(() => {
    const invoices = readLocal<any>("invoices").filter((i) => matches(i.client, ident.company) || matches(i.client, ident.name));
    const tickets = readLocal<any>("support_v2").filter((t) => (t.requester_email ?? "").toLowerCase() === ident.email.toLowerCase());
    const projects = readLocal<any>("projects").filter((p) => matches(p.client, ident.company) || matches(p.client, ident.name));
    const docs = readLocal<any>("generated_docs").filter((d) => matches(d.subject, ident.company) || matches(d.subject, ident.name));
    const meetings = readLocal<any>("meetings").filter((m) => matches(m.client, ident.company) || matches(m.client, ident.name));
    const transactions = readLocal<any>("transactions").filter((t) => matches(t.client, ident.company) || matches(t.client, ident.name));
    setData({ invoices, tickets, projects, docs, meetings, transactions });
  }, [ident.company, ident.name, ident.email]);

  const announcement = useMemo(() => {
    const all = readList<PortalAnnouncement>(KEYS.announcements)
      .filter((a) => a.active && (a.audience === "all" || (a.audience_key ?? "").toLowerCase().includes(clientKey)))
      .filter((a) => !a.expires_at || new Date(a.expires_at) > new Date());
    return all[0] ?? null;
  }, [clientKey]);

  const notifications = useMemo(
    () => readList<PortalNotification>(KEYS.notifications)
      .filter((n) => n.audience === "all" || (n.audience_key ?? "").toLowerCase().includes(clientKey))
      .slice(0, 5),
    [clientKey],
  );

  const stats = useMemo(() => {
    const unpaid = data.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
    const paid = data.invoices.filter((i) => i.status === "paid");
    const overdue = data.invoices.filter((i) => i.status === "overdue");
    const openTickets = data.tickets.filter((t) => t.status !== "closed" && t.status !== "resolved");
    const inProgressTickets = data.tickets.filter((t) => t.status === "in_progress");
    const resolvedTickets = data.tickets.filter((t) => t.status === "resolved" || t.status === "closed");
    const activeProjects = data.projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
    const inProgressProjects = data.projects.filter((p) => p.status === "in_progress");
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const completedThisYear = data.projects.filter((p) => p.status === "completed" && (!p.updated_at || new Date(p.updated_at) >= yearStart));
    const weekLater = new Date(Date.now() + 7 * 86400000);
    const upcomingMeetings = data.meetings.filter((m) => m.date && new Date(m.date) > new Date() && new Date(m.date) < weekLater);
    const paidAmt = paid.reduce((s, i) => s + (Number(i.amount_paid ?? i.total ?? 0) || 0), 0);
    const unpaidAmt = unpaid.reduce((s, i) => s + (Number(i.balance_due ?? i.total ?? 0) || 0), 0);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const thisMonthPaid = data.transactions.filter((t) => new Date(t.date ?? t.created_at ?? 0) >= monthStart).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const lastMonthPaid = data.transactions.filter((t) => {
      const d = new Date(t.date ?? t.created_at ?? 0);
      return d >= prevMonth && d < monthStart;
    }).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return {
      activeProjects: activeProjects.length,
      inProgressProjects: inProgressProjects.length,
      completedThisYear: completedThisYear.length,
      totalProjects: data.projects.length,
      unpaid: unpaid.length,
      unpaidAmt,
      paidAmt,
      overdue: overdue.length,
      openTickets: openTickets.length,
      inProgressTickets: inProgressTickets.length,
      resolvedTickets: resolvedTickets.length,
      upcomingMeetings: upcomingMeetings.length,
      thisMonthPaid, lastMonthPaid,
      projectBreakdown: {
        completed: data.projects.filter((p) => p.status === "completed").length,
        in_progress: data.projects.filter((p) => p.status === "in_progress").length,
        on_hold: data.projects.filter((p) => p.status === "on_hold").length,
        planning: data.projects.filter((p) => p.status === "planning" || !p.status).length,
      },
    };
  }, [data]);

  const kpiCards = [
    { label: "Active Projects", value: stats.activeProjects, sub: `${stats.inProgressProjects} in progress`, icon: FolderKanban, tint: "bg-blue-500/15 text-blue-600" },
    { label: "Completed Projects", value: stats.completedThisYear, sub: "This Year", icon: CheckCircle2, tint: "bg-emerald-500/15 text-emerald-600" },
    { label: "Open Tickets", value: stats.openTickets, sub: stats.openTickets > 0 ? `${stats.openTickets} Urgent` : "All clear", icon: LifeBuoy, tint: "bg-rose-500/15 text-rose-600", warn: stats.openTickets > 0 },
    { label: "Pending Invoices", value: stats.unpaid, sub: fmtPKR(stats.unpaidAmt), icon: Receipt, tint: "bg-amber-500/15 text-amber-600" },
    { label: "Upcoming Meetings", value: stats.upcomingMeetings, sub: "This Week", icon: CalendarDays, tint: "bg-indigo-500/15 text-indigo-600" },
  ];

  const recentProjects = data.projects.slice(0, 4);
  const upcomingMeeting = data.meetings
    .filter((m) => m.date && new Date(m.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Client Portal</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Welcome back, {(ident.name || ident.email || "").split(" ")[0] || "Client"}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Here's a calm overview of your projects, tickets and payments today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/portal/tickets" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border bg-background hover:bg-accent text-xs font-medium transition">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Link>
          <Link to="/portal/meetings" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 shadow-sm shadow-primary/20 transition">
            <CalendarDays className="h-3.5 w-3.5" /> Book Meeting
          </Link>
        </div>
      </div>

      {announcement && dismissedAnnouncement !== announcement.id && (
        <AnnouncementBanner
          announcement={announcement}
          clientKey={clientKey}
          onDismiss={() => { markAnnouncementDismissed(announcement.id, clientKey); setDismissedAnnouncement(announcement.id); }}
        />
      )}

      {/* KPI cards — editorial */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((c, idx) => {
          const Icon = c.icon;
          const isHero = idx === 0;
          return (
            <div
              key={c.label}
              className={`group relative rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                isHero
                  ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20"
                  : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{c.label}</div>
                <div className={`h-7 w-7 rounded-lg grid place-items-center ${c.tint}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight mt-3">{c.value}</div>
              <div className={`text-[11px] mt-1 ${c.warn ? "text-rose-600" : "text-muted-foreground"}`}>{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Middle grid: Projects table + Progress donut + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr_1fr] gap-4">
        {/* Projects Overview */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <div className="text-sm font-semibold">Projects Overview</div>
              <div className="text-[11px] text-muted-foreground">Latest activity across your account</div>
            </div>
            <Link to="/portal/projects" className="text-xs text-primary hover:underline font-medium">View All →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <EmptyRow icon={FolderKanban} text="No projects yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground bg-muted/30">
                    <th className="px-5 py-2.5">Project</th>
                    <th className="px-5 py-2.5 hidden sm:table-cell">Progress</th>
                    <th className="px-5 py-2.5 text-right">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                            <FolderKanban className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{p.name ?? "Untitled project"}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{p.code ?? p.department ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2 w-40">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, p.progress ?? 0)}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{p.progress ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                        {p.deadline ? (
                          <span className="text-rose-600 font-medium">Due {p.deadline}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Project Progress donut */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Project Progress</div>
              <div className="text-[11px] text-muted-foreground">Portfolio breakdown</div>
            </div>
          </div>
          <ProgressDonut breakdown={stats.projectBreakdown} />
          <div className="mt-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 flex items-center gap-2 text-[11px] text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" /> Keep it up — you're doing great.
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-[11px] text-muted-foreground">Latest updates</div>
            </div>
            <Link to="/portal/notifications" className="text-xs text-primary hover:underline font-medium">View All</Link>
          </div>
          {notifications.length === 0 ? (
            <EmptyRow icon={Bell} text="You're all caught up." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n, i) => (
                <div key={n.id} className="px-5 py-3 flex gap-3 hover:bg-muted/30 transition-colors">
                  <div className={`h-2 w-2 mt-1.5 rounded-full shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/25"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.body && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground/80 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1.1fr] gap-4">
        <SummaryCard title="Invoices Summary" href="/portal/invoices" icon={Receipt} tint="bg-blue-500/15 text-blue-600" total={fmtPKR(data.invoices.reduce((s, i) => s + (Number(i.total) || 0), 0))} totalLabel="Total Invoices"
          stats={[
            { label: "Pending", value: stats.unpaid, className: "" },
            { label: "Overdue", value: stats.overdue, className: "text-rose-600" },
            { label: "Paid", value: data.invoices.filter((i) => i.status === "paid").length, className: "" },
          ]}
        />
        <SummaryCard title="Tickets Summary" href="/portal/tickets" icon={LifeBuoy} tint="bg-rose-500/15 text-rose-600" total={String(data.tickets.length)} totalLabel="Total Tickets"
          stats={[
            { label: "Open", value: stats.openTickets, className: "" },
            { label: "In Progress", value: stats.inProgressTickets, className: "" },
            { label: "Resolved", value: stats.resolvedTickets, className: "text-emerald-600" },
          ]}
        />
        <SummaryCard title="Payments Overview" href="/portal/payments" icon={CreditCard} tint="bg-emerald-500/15 text-emerald-600" total={fmtPKR(stats.paidAmt)} totalLabel="Total Paid"
          stats={[
            { label: "This Month", value: fmtPKR(stats.thisMonthPaid), className: "" },
            { label: "Last Month", value: fmtPKR(stats.lastMonthPaid), className: "" },
          ]}
        />
        {/* Quick Actions */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Quick Actions</div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickBtn to="/portal/tickets" icon={Plus} label="Create Ticket" tint="text-rose-600 bg-rose-500/10" />
            <QuickBtn to="/portal/meetings" icon={CalendarDays} label="Book Meeting" tint="text-indigo-600 bg-indigo-500/10" />
            <QuickBtn to="/portal/documents" icon={Upload} label="Upload File" tint="text-blue-600 bg-blue-500/10" />
            <QuickBtn to="/portal/payments" icon={CreditCard} label="Make Payment" tint="text-emerald-600 bg-emerald-500/10" />
          </div>
        </div>
      </div>

      {/* Bottom row: Recent Activity + Upcoming Meeting hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <div className="text-sm font-semibold">Recent Activity</div>
              <div className="text-[11px] text-muted-foreground">Timeline across tickets, docs and invoices</div>
            </div>
            <Link to="/portal/notifications" className="text-xs text-primary hover:underline font-medium">View All</Link>
          </div>
          <RecentActivity data={data} />
        </div>

        {!upcomingMeeting ? (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-sm font-semibold">Upcoming Meeting</div>
              <Link to="/portal/meetings" className="text-xs text-primary hover:underline font-medium">View Calendar</Link>
            </div>
            <EmptyRow icon={CalendarDays} text="No upcoming meetings." />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-6 shadow-lg shadow-primary/20">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  Upcoming Meeting
                </span>
                <Link to="/portal/meetings" className="text-[11px] font-medium opacity-80 hover:opacity-100">
                  View Calendar →
                </Link>
              </div>
              <div className="text-lg font-bold leading-tight truncate">{upcomingMeeting.title ?? "Project Meeting"}</div>
              <div className="text-xs opacity-80 mt-1 truncate">{upcomingMeeting.project ?? upcomingMeeting.client ?? "Devionic Team"}</div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/10 backdrop-blur-sm px-3 py-2">
                  <div className="text-[10px] opacity-70 uppercase tracking-wider">Date</div>
                  <div className="font-semibold mt-0.5 flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> {upcomingMeeting.date ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-white/10 backdrop-blur-sm px-3 py-2">
                  <div className="text-[10px] opacity-70 uppercase tracking-wider">Time</div>
                  <div className="font-semibold mt-0.5 flex items-center gap-1.5"><Clock className="h-3 w-3" /> {upcomingMeeting.time ?? upcomingMeeting.start_time ?? "—"}</div>
                </div>
              </div>

              {upcomingMeeting.link ? (
                <a href={upcomingMeeting.link} target="_blank" rel="noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-primary h-10 text-sm font-semibold hover:bg-white/95 transition shadow-sm">
                  <Video className="h-4 w-4" /> Join Meeting
                </a>
              ) : (
                <div className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/15 text-primary-foreground h-10 text-xs font-medium backdrop-blur-sm">
                  Scheduled — link will appear soon
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <QuickTicketForm ident={ident} onCreated={() => {
        const tickets = readLocal<any>("support_v2").filter((t) => (t.requester_email ?? "").toLowerCase() === ident.email.toLowerCase());
        setData((d) => ({ ...d, tickets }));
      }} />
    </div>
  );
}

function QuickTicketForm({ ident, onCreated }: { ident: { name: string; email: string; company?: string }; onCreated: () => void }) {
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", category: "software" });
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setBusy(true);
    try {
      const raw = window.localStorage.getItem("dms:support_v2");
      const all = raw ? JSON.parse(raw) : [];
      const id = all.length ? Math.max(...all.map((r: any) => r.id)) + 1 : 1;
      const ticket_no = `TKT-${String(id).padStart(5, "0")}`;
      const row = {
        id, ticket_no,
        subject: form.subject.trim(),
        description: form.description.trim(),
        type: "request",
        category: form.category,
        requester: ident.name || ident.email,
        requester_email: ident.email,
        priority: form.priority,
        status: "open",
        channel: "portal",
        created: new Date().toISOString(),
        status_history: [{ at: new Date().toISOString(), title: "Ticket opened via portal", status: "open", updated_by: ident.name || ident.email }],
      };
      window.localStorage.setItem("dms:support_v2", JSON.stringify([row, ...all]));
      window.dispatchEvent(new StorageEvent("storage", { key: "dms:support_v2" }));
      setForm({ subject: "", description: "", priority: "medium", category: "software" });
      onCreated();
      import("sonner").then((m) => m.toast.success(`Ticket ${ticket_no} submitted`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-rose-500/15 text-rose-600 grid place-items-center">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Open a Support Ticket</div>
          <div className="text-xs text-muted-foreground">Our team will respond as soon as possible.</div>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Describe the issue</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="software">Software</option><option value="hardware">Hardware</option><option value="network">Network</option><option value="access">Access</option><option value="billing">Billing</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Link to="/portal/tickets" className="inline-flex items-center h-9 px-3 rounded-md border bg-background hover:bg-accent text-xs font-medium">View all tickets</Link>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60">
            <Plus className="h-3.5 w-3.5" /> Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}


function ProgressDonut({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0) || 1;
  const seg = [
    { key: "completed", label: "Completed", color: "#10b981" },
    { key: "in_progress", label: "In Progress", color: "#3b82f6" },
    { key: "on_hold", label: "On Hold", color: "#f59e0b" },
    { key: "planning", label: "Not Started", color: "#e5e7eb" },
  ];
  const r = 42, C = 2 * Math.PI * r;
  let offset = 0;
  const donePct = Math.round((breakdown.completed / total) * 100);
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
        {seg.map((s) => {
          const val = breakdown[s.key] || 0;
          const len = (val / total) * C;
          const el = (
            <circle key={s.key} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
        <text x="60" y="55" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 60 60)" className="fill-foreground text-[10px]">Total</text>
        <text x="60" y="70" textAnchor="middle" dominantBaseline="middle" transform="rotate(90 60 60)" className="fill-foreground text-[18px] font-bold">{donePct}%</text>
      </svg>
      <div className="flex-1 space-y-1.5 text-xs">
        {seg.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-medium">{Math.round(((breakdown[s.key] || 0) / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, href, icon: Icon, tint, total, totalLabel, stats }: any) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <Link to={href} className="text-xs text-primary hover:underline">View All</Link>
      </div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold">{total}</div>
          <div className="text-[11px] text-muted-foreground">{totalLabel}</div>
        </div>
        <div className={`h-9 w-9 rounded-lg grid place-items-center ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t">
        {stats.map((s: any, i: number) => (
          <div key={i}>
            <div className={`text-lg font-semibold ${s.className}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickBtn({ to, icon: Icon, label, tint }: any) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg border bg-background hover:bg-accent px-3 py-2.5 transition">
      <div className={`h-7 w-7 rounded-md grid place-items-center ${tint}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function EmptyRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}

function RecentActivity({ data }: { data: any }) {
  const items: Array<{ id: string; icon: any; tint: string; title: string; sub?: string; at: string }> = [];
  for (const t of data.tickets.slice(0, 3)) items.push({
    id: `t${t.id}`, icon: LifeBuoy, tint: "bg-rose-500/15 text-rose-600",
    title: `Ticket ${t.ticket_no ?? `#${t.id}`} — ${t.subject ?? ""}`, sub: t.status,
    at: t.created ?? new Date().toISOString(),
  });
  for (const d of data.docs.slice(0, 3)) items.push({
    id: `d${d.id}`, icon: FileText, tint: "bg-emerald-500/15 text-emerald-600",
    title: `Document: ${d.subject ?? d.title ?? "New file"}`, sub: d.category,
    at: d.created_at ?? new Date().toISOString(),
  });
  for (const i of data.invoices.slice(0, 3)) items.push({
    id: `i${i.id}`, icon: Receipt, tint: "bg-blue-500/15 text-blue-600",
    title: `Invoice ${i.invoice_no ?? `#${i.id}`}`, sub: i.status,
    at: i.issue_date ?? new Date().toISOString(),
  });
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const top = items.slice(0, 6);
  if (top.length === 0) return <EmptyRow icon={Sparkles} text="No recent activity." />;
  return (
    <div className="divide-y">
      {top.map((a) => {
        const Icon = a.icon;
        return (
          <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
            <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${a.tint}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{a.title}</div>
              {a.sub && <div className="text-[11px] text-muted-foreground">{a.sub}</div>}
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap"><ArrowRight className="inline h-3 w-3 opacity-40" /></div>
          </div>
        );
      })}
    </div>
  );
}

function AnnouncementBanner({
  announcement, clientKey, onDismiss,
}: { announcement: PortalAnnouncement; clientKey: string; onDismiss: () => void }) {
  useEffect(() => { markAnnouncementOpened(announcement.id, clientKey); }, [announcement.id, clientKey]);
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-md hover:bg-accent"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="min-w-0 pr-4">
          <div className="text-sm font-semibold text-primary">{announcement.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{announcement.body}</div>
          <div className="mt-2 flex items-center gap-3">
            {announcement.cta_label && announcement.cta_url && (
              <a
                href={announcement.cta_url}
                onClick={() => markAnnouncementRead(announcement.id, clientKey)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {announcement.cta_label} →
              </a>
            )}
            <button
              onClick={() => markAnnouncementRead(announcement.id, clientKey)}
              className="text-[11px] text-muted-foreground hover:text-primary"
            >
              Mark as read
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
