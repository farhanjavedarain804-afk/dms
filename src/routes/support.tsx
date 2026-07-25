import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, CircleDot, Loader, CheckCircle2, AlertTriangle, Timer, Star,
  Wrench, Cpu, Wifi, Lock, Mail as MailIcon, DollarSign, Users2, Building2, HelpCircle,
  PenSquare, History, CalendarPlus, Search, UserPlus, Briefcase, User as UserIcon,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { PK_CITIES } from "@/lib/pk";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resources } from "@/lib/api";
import { toast } from "sonner";

type CrmLite = { id: number; name: string; company?: string; email?: string; phone?: string; whatsapp?: string; city?: string };
const crmApi = localCrud<CrmLite>("clients_v2");


type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type Category = "hardware" | "software" | "network" | "access" | "email" | "billing" | "hr" | "facilities" | "other";
type TType = "incident" | "request" | "change" | "question";

type Ticket = {
  id: number;
  ticket_no: string;
  subject: string;
  description?: string;
  type?: TType;
  category?: Category;
  requester: string;
  requester_email?: string;
  requester_phone?: string;
  requester_city?: string;
  assignee?: string;
  department?: string;
  priority: Priority;
  status: Status;
  channel?: "email" | "whatsapp" | "phone" | "portal" | "walk_in";
  sla_due?: string;
  first_response_at?: string;
  created: string;
  resolved_on?: string;
  resolution?: string;
  satisfaction?: number; // 1-5
  tags?: string;
  status_history?: { at: string; title: string; description?: string; updated_by?: string; status?: Status }[];
};


const PRI_META: Record<Priority, { label: string; tint: string }> = {
  low:    { label: "Low",    tint: "oklch(0.72 0.1 250)" },
  medium: { label: "Medium", tint: "oklch(0.72 0.14 200)" },
  high:   { label: "High",   tint: "oklch(0.7 0.17 55)"  },
  urgent: { label: "Urgent", tint: "oklch(0.62 0.22 25)"  },
};

const STATUS_META: Record<Status, { label: string; tint: string; icon: any }> = {
  open:        { label: "Open",             tint: "oklch(0.65 0.2 25)",  icon: CircleDot },
  in_progress: { label: "In Progress",      tint: "oklch(0.72 0.18 55)", icon: Loader },
  waiting:     { label: "Waiting on User",  tint: "oklch(0.72 0.14 200)",icon: Timer },
  resolved:    { label: "Resolved",         tint: "oklch(0.68 0.18 155)",icon: CheckCircle2 },
  closed:      { label: "Closed",           tint: "oklch(0.6 0.02 250)", icon: CheckCircle2 },
};

const CAT_META: Record<Category, { label: string; icon: any }> = {
  hardware:   { label: "Hardware",         icon: Cpu },
  software:   { label: "Software",         icon: Wrench },
  network:    { label: "Network",          icon: Wifi },
  access:     { label: "Access",           icon: Lock },
  email:      { label: "Email",            icon: MailIcon },
  billing:    { label: "Billing",          icon: DollarSign },
  hr:         { label: "HR",               icon: Users2 },
  facilities: { label: "Facilities",       icon: Building2 },
  other:      { label: "Other",            icon: HelpCircle },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const today = new Date();

function nextTicketNo() {
  const y = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `TCK-${y}-${seq}`;
}

const api = localCrud<Ticket>("support_v2", [
  { ticket_no: "TCK-2101", subject: "Cannot access payroll module", description: "Getting 403 on /hr", type: "incident", category: "access", requester: "Ayesha Khan", requester_email: "ayesha@devionic.com", requester_phone: "+92 321 1112233", requester_city: "Karachi", assignee: "IT Helpdesk", department: "IT & Infrastructure", priority: "high",   status: "in_progress", channel: "portal",   sla_due: iso(addDays(today, -1)), first_response_at: iso(addDays(today, -1)), created: iso(addDays(today, -3)), tags: "rbac, urgent" },
  { ticket_no: "TCK-2102", subject: "Request new monitor",           description: "Second monitor for design work", type: "request", category: "hardware", requester: "Bilal Chaudhry", requester_email: "bilal@devionic.com", requester_phone: "+92 333 4445566", requester_city: "Lahore",  assignee: "Admin Ops",   department: "IT & Infrastructure", priority: "low",    status: "open",        channel: "whatsapp", sla_due: iso(addDays(today, 4)), created: iso(addDays(today, -1)), tags: "asset" },
  { ticket_no: "TCK-2103", subject: "PTCL internet slow — Lahore",   description: "Frequent drops after 5pm",       type: "incident",category: "network",  requester: "Sara Ahmed",     requester_email: "sara@devionic.com", requester_phone: "+92 300 7778899", requester_city: "Lahore",  assignee: "IT Helpdesk", department: "IT & Infrastructure", priority: "urgent", status: "open",        channel: "phone",    sla_due: iso(today),           created: iso(today), tags: "isp, ptcl" },
  { ticket_no: "TCK-2104", subject: "Reimburse taxi expense",        description: "Client visit to Nexus HQ",       type: "request", category: "billing",  requester: "Umer Khan",      requester_email: "umer@devionic.com", requester_phone: "+92 345 1122334", requester_city: "Karachi", assignee: "Finance",     department: "Finance",             priority: "medium", status: "waiting",     channel: "email",    sla_due: iso(addDays(today, 2)), first_response_at: iso(addDays(today, -1)), created: iso(addDays(today, -2)) },
  { ticket_no: "TCK-2105", subject: "Provision new laptop for hire", description: "Onboarding: Farah Malik",        type: "request", category: "hardware", requester: "HR",             requester_email: "hr@devionic.com",    requester_phone: "+92 300 5555555", requester_city: "Karachi", assignee: "IT Helpdesk", department: "IT & Infrastructure", priority: "high",   status: "resolved",    channel: "portal",   sla_due: iso(addDays(today, -2)), first_response_at: iso(addDays(today, -5)), created: iso(addDays(today, -6)), resolved_on: iso(addDays(today, -1)), satisfaction: 5, resolution: "Dell Latitude 5540 handed over with WSA image." },
  { ticket_no: "TCK-2106", subject: "Outlook not syncing",           description: "Since morning, on Windows",      type: "incident",category: "email",    requester: "Hassan Iqbal",   requester_email: "hassan@devionic.com",requester_phone: "+92 321 9998877", requester_city: "Islamabad", assignee: "IT Helpdesk", department: "IT & Infrastructure", priority: "medium", status: "closed",      channel: "walk_in",  first_response_at: iso(addDays(today, -8)), created: iso(addDays(today, -9)), resolved_on: iso(addDays(today, -7)), satisfaction: 4, resolution: "Re-added profile, cleared cache." },
]);

const fields: FieldDef<Ticket>[] = [
  { name: "ticket_no", label: "Ticket #", required: true, section: "Ticket" },
  { name: "subject", label: "Subject", required: true, section: "Ticket", fullWidth: true },
  { name: "description", label: "Description", type: "textarea", section: "Ticket", hideInTable: true },
  { name: "type", label: "Type", type: "select", section: "Ticket", options: [
    { value: "incident", label: "Incident" },
    { value: "request",  label: "Service Request" },
    { value: "change",   label: "Change" },
    { value: "question", label: "Question" },
  ] },
  { name: "category", label: "Category", type: "select", section: "Ticket",
    options: (Object.entries(CAT_META) as [Category, typeof CAT_META[Category]][]).map(([v, m]) => ({ value: v, label: m.label })),
    render: (v: Category) => {
      const m = CAT_META[v]; if (!m) return null;
      const Icon = m.icon;
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-muted text-foreground/80">
          <Icon className="h-3 w-3" /> {m.label}
        </span>
      );
    }
  },
  { name: "channel", label: "Channel", type: "select", section: "Ticket", options: [
    { value: "email",    label: "Email" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "phone",    label: "Phone" },
    { value: "portal",   label: "Web Portal" },
    { value: "walk_in",  label: "Walk-in" },
  ] },
  { name: "tags", label: "Tags", placeholder: "comma-separated", section: "Ticket", hideInTable: true },

  { name: "requester", label: "Requester", required: true, section: "Requester" },
  { name: "requester_email", label: "Email", type: "email", section: "Requester", hideInTable: true },
  { name: "requester_phone", label: "Phone / WhatsApp", type: "tel", placeholder: "+92 3XX XXXXXXX", section: "Requester", hideInTable: true },
  { name: "requester_city", label: "City", type: "select", options: PK_CITIES, section: "Requester", hideInTable: true },

  { name: "assignee", label: "Assignee", section: "Assignment" },
  { name: "department", label: "Department", section: "Assignment", hideInTable: true },
  { name: "priority", label: "Priority", type: "select", required: true, section: "Assignment",
    options: (Object.entries(PRI_META) as [Priority, typeof PRI_META[Priority]][]).map(([v, m]) => ({ value: v, label: m.label })),
    render: (v: Priority) => {
      const m = PRI_META[v] ?? PRI_META.medium;
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `color-mix(in oklab, ${m.tint} 14%, transparent)`, color: m.tint }}>
          {m.label}
        </span>
      );
    }
  },
  { name: "status", label: "Status", type: "select", required: true, section: "Assignment",
    options: (Object.entries(STATUS_META) as [Status, typeof STATUS_META[Status]][]).map(([v, m]) => ({ value: v, label: m.label })),
    render: (v: Status) => {
      const m = STATUS_META[v] ?? STATUS_META.open;
      const Icon = m.icon;
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `color-mix(in oklab, ${m.tint} 14%, transparent)`, color: m.tint }}>
          <Icon className="h-3 w-3" /> {m.label}
        </span>
      );
    }
  },

  { name: "sla_due", label: "SLA due", type: "date", section: "Resolution",
    render: (v: string | undefined, row: Ticket) => {
      if (!v) return <span className="text-muted-foreground text-xs">—</span>;
      const done = row.status === "resolved" || row.status === "closed";
      const d = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);
      const tint = done ? "oklch(0.6 0.02 250)" : d < 0 ? "oklch(0.62 0.22 25)" : d <= 1 ? "oklch(0.72 0.17 55)" : "oklch(0.68 0.15 200)";
      const label = done ? v : d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `in ${d}d`;
      return <span className="text-xs font-medium" style={{ color: tint }}>{label}</span>;
    }
  },
  { name: "first_response_at", label: "First response", type: "date", section: "Resolution", hideInTable: true },
  { name: "created", label: "Created", type: "date", required: true, section: "Resolution" },
  { name: "resolved_on", label: "Resolved on", type: "date", section: "Resolution", hideInTable: true },
  { name: "satisfaction", label: "CSAT (1–5)", type: "number", section: "Resolution", hideInTable: true },
  { name: "resolution", label: "Resolution notes", type: "textarea", section: "Resolution", hideInTable: true },
];

type Tab = "all" | Status;
const TAB_ORDER: Tab[] = ["all", "open", "in_progress", "waiting", "resolved", "closed"];

function SupportPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["support_v2"], queryFn: api.list });
  const [tab, setTab] = useState<Tab>("all");
  const rows = q.data ?? [];

  const clientsQ = useQuery({ queryKey: ["clients_v2"], queryFn: crmApi.list });
  const empQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });


  const filteredRows = useMemo(
    () => tab === "all" ? rows : rows.filter((r) => r.status === tab),
    [rows, tab],
  );

  const isOpen = (s: Status) => s === "open" || s === "in_progress" || s === "waiting";
  const isDone = (s: Status) => s === "resolved" || s === "closed";

  const open = rows.filter((r) => r.status === "open").length;
  const inProg = rows.filter((r) => r.status === "in_progress").length;
  const waiting = rows.filter((r) => r.status === "waiting").length;
  const closed = rows.filter((r) => r.status === "closed").length;
  const resolvedOnly = rows.filter((r) => r.status === "resolved").length;
  const resolvedCount = rows.filter((r) => isDone(r.status)).length;
  const urgentOpen = rows.filter((r) => r.priority === "urgent" && isOpen(r.status)).length;

  const now = Date.now();
  const breached = rows.filter((r) => r.sla_due && !isDone(r.status) && new Date(r.sla_due).getTime() < now);
  const dueSoon = rows.filter((r) => {
    if (!r.sla_due || isDone(r.status)) return false;
    const d = Math.ceil((new Date(r.sla_due).getTime() - now) / 86400000);
    return d >= 0 && d <= 1;
  });

  // New this week (created within 7 days)
  const newThisWeek = rows.filter((r) => {
    const d = (now - new Date(r.created).getTime()) / 86400000;
    return d >= 0 && d <= 7;
  }).length;

  // Awaiting first response — open/in_progress with no first_response_at
  const noFirstResponse = rows.filter((r) => isOpen(r.status) && !r.first_response_at).length;

  // Avg resolution (days) — only closed w/ dates
  const resolvedWithTime = rows.filter((r) => isDone(r.status) && r.resolved_on && r.created);
  const avgResolution = resolvedWithTime.length
    ? (resolvedWithTime.reduce((s, r) => s + (new Date(r.resolved_on!).getTime() - new Date(r.created).getTime()), 0)
        / resolvedWithTime.length / 86400000)
    : 0;

  // CSAT
  const csatRows = rows.filter((r) => typeof r.satisfaction === "number" && r.satisfaction! > 0);
  const csatAvg = csatRows.length ? (csatRows.reduce((s, r) => s + (r.satisfaction ?? 0), 0) / csatRows.length) : 0;

  const countByTab = (t: Tab) => t === "all" ? rows.length : rows.filter((r) => r.status === t).length;

  // Status update dialog state
  const [updateFor, setUpdateFor] = useState<Ticket | null>(null);
  const [historyFor, setHistoryFor] = useState<Ticket | null>(null);
  const [uTitle, setUTitle] = useState("");
  const [uDesc, setUDesc] = useState("");
  const [uBy, setUBy] = useState("");
  const [uStatus, setUStatus] = useState<string>("");

  const openUpdate = (row: Ticket) => {
    setUpdateFor(row);
    setUTitle("");
    setUDesc("");
    setUBy("");
    setUStatus(row.status ?? "");
  };

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!updateFor) throw new Error("No ticket");
      if (!uTitle.trim()) throw new Error("Title is required");
      const entry = {
        at: new Date().toISOString(),
        title: uTitle.trim(),
        description: uDesc.trim() || undefined,
        updated_by: uBy.trim() || undefined,
        status: (uStatus || undefined) as Status | undefined,
      };
      const history = [...(updateFor.status_history ?? []), entry];
      const patch: Partial<Ticket> = { status_history: history };
      if (uStatus && uStatus !== updateFor.status) patch.status = uStatus as Status;
      return api.update(updateFor.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_v2"] });
      qc.invalidateQueries({ queryKey: [`support_v2_${tab}`] });
      toast.success("Status update logged");
      setUpdateFor(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppLayout>
      <PageHeader title="Support Tickets" description="Helpdesk with WhatsApp / phone / portal channels, SLA tracking and CSAT." />

      <StatsCards loading={q.isLoading} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" stats={[
        { label: "Total Tickets", value: rows.length, hint: "All time", icon: LifeBuoy },
        { label: "Open",          value: open,   hint: "Awaiting pickup",  icon: CircleDot, tint: "oklch(0.65 0.2 25)" },
        { label: "In Progress",   value: inProg, hint: "Being handled",    icon: Loader,    tint: "oklch(0.72 0.18 55)" },
        { label: "Waiting on User", value: waiting, hint: "Pending customer reply", icon: Timer, tint: "oklch(0.72 0.14 200)" },
        { label: "Resolved",      value: resolvedOnly, hint: "Fix delivered", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Closed",        value: closed, hint: `${rows.length ? Math.round((resolvedCount / rows.length) * 100) : 0}% total closed`, icon: CheckCircle2, tint: "oklch(0.6 0.02 250)" },
      ]} />

      <StatsCards loading={q.isLoading} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" stats={[
        { label: "SLA Breached",  value: breached.length, hint: "Overdue tickets",   icon: AlertTriangle, tint: "oklch(0.62 0.22 25)" },
        { label: "Urgent Open",   value: urgentOpen, hint: "Highest priority", icon: AlertTriangle, tint: "oklch(0.62 0.22 25)" },
        { label: "Awaiting First Response", value: noFirstResponse, hint: "No agent reply yet", icon: Timer, tint: "oklch(0.72 0.17 55)" },
        { label: "New This Week", value: newThisWeek, hint: "Created in last 7 days", icon: CalendarPlus, tint: "oklch(0.68 0.15 200)" },
        { label: "Avg Resolution", value: `${avgResolution.toFixed(1)}d`, hint: "From open → resolved", icon: Timer },
        { label: "CSAT",           value: csatAvg ? `${csatAvg.toFixed(1)} / 5` : "—", hint: `${csatRows.length} responses`, icon: Star, tint: "oklch(0.72 0.16 90)" },
      ]} />

      {(breached.length > 0 || dueSoon.length > 0) && (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" /> SLA attention
              <Badge variant="outline" className="ml-1 text-[10px] border-amber-400 text-amber-800 dark:text-amber-200">
                {breached.length + dueSoon.length}
              </Badge>
            </CardTitle>
            <CardDescription>Breached and near-breach tickets across all queues.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SlaGroup title="Breached" tint="oklch(0.62 0.22 25)" items={breached} />
            <SlaGroup title="Due today / tomorrow" tint="oklch(0.72 0.17 55)" items={dueSoon} />
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TAB_ORDER.map((t) => {
            const label = t === "all" ? "All" : STATUS_META[t].label;
            const Icon = t === "all" ? LifeBuoy : STATUS_META[t].icon;
            return (
              <TabsTrigger key={t} value={t} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
                <Badge variant="outline" className="ml-1 text-[10px]">{countByTab(t)}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <CrudTable<Ticket>
            title="Ticket"
            fields={fields}
            api={{ ...api, list: async () => filteredRows }}
            queryKey={`support_v2_${tab}`}
            searchable={["ticket_no", "subject", "requester", "assignee", "category", "tags", "requester_email"]}
            defaults={{
              status: "open",
              priority: "medium",
              channel: "portal",
              type: "incident",
              ticket_no: nextTicketNo(),
              created: iso(new Date()),
              sla_due: iso(addDays(new Date(), 3)),
            }}
            formHeader={(patch) => (
              <RequesterPicker
                clients={(clientsQ.data ?? []) as CrmLite[]}
                employees={(empQ.data ?? []) as any[]}
                onPick={patch}
              />
            )}
            rowActions={(row) => (
              <>
                <Button size="sm" variant="ghost" title="Update status" onClick={() => openUpdate(row)}>
                  <PenSquare className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" title="Status history" onClick={() => setHistoryFor(row)}>
                  <History className="h-4 w-4" />
                </Button>
              </>
            )}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!updateFor} onOpenChange={(o) => !o && setUpdateFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update status — {updateFor?.ticket_no} {updateFor?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={uTitle} onChange={(e) => setUTitle(e.target.value)} placeholder="e.g. Called requester, awaiting reply" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={uDesc} onChange={(e) => setUDesc(e.target.value)} placeholder="Progress notes, actions taken, next steps…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Change status to</Label>
                <select value={uStatus} onChange={(e) => setUStatus(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">— Keep current —</option>
                  {(Object.entries(STATUS_META) as [Status, typeof STATUS_META[Status]][]).map(([v, m]) => (
                    <option key={v} value={v}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Updated by</Label>
                <Input value={uBy} onChange={(e) => setUBy(e.target.value)} placeholder="Your name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateFor(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Status history — {historyFor?.ticket_no} {historyFor?.subject}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {(historyFor?.status_history ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No status updates yet.</div>
            ) : (
              [...(historyFor?.status_history ?? [])].reverse().map((h, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString()}
                    </div>
                  </div>
                  {h.description && <div className="mt-1 text-sm whitespace-pre-wrap">{h.description}</div>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {h.updated_by && <span>By {h.updated_by}</span>}
                    {h.status && <span>Status → {STATUS_META[h.status]?.label ?? h.status}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


function SlaGroup({ title, tint, items }: { title: string; tint: string; items: Ticket[] }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: tint }}>
        <AlertTriangle className="h-4 w-4" /> {title}
        <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
      </div>
      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">None — all clear.</div>
        ) : items.map((r) => {
          const d = r.sla_due ? Math.ceil((new Date(r.sla_due).getTime() - Date.now()) / 86400000) : 0;
          const meta = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "due today" : `in ${d}d`;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                <span className="font-mono text-[10px] text-muted-foreground mr-1">{r.ticket_no}</span>
                <span className="font-medium">{r.subject}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{r.assignee || "—"} · {meta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequesterPicker({
  clients, employees, onPick,
}: {
  clients: CrmLite[];
  employees: any[];
  onPick: (patch: Record<string, any>) => void;
}) {
  const [mode, setMode] = useState<"customer" | "employee" | "manual">("customer");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>("");

  const source = mode === "customer" ? clients : mode === "employee" ? employees : [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = source.map((r: any) => ({
      id: String(r.id),
      name: r.name ?? "",
      sub: mode === "customer" ? (r.company ?? r.email ?? "") : (r.designation ?? r.department ?? r.email ?? ""),
      row: r,
    }));
    if (!s) return list.slice(0, 50);
    return list.filter((r) => r.name.toLowerCase().includes(s) || r.sub.toLowerCase().includes(s)).slice(0, 50);
  }, [source, q, mode]);

  const applyFrom = (r: any) => {
    if (!r) return;
    onPick({
      requester: r.name ?? "",
      requester_email: r.email ?? "",
      requester_phone: r.whatsapp ?? r.phone ?? "",
      requester_city: r.city ?? "",
      department: mode === "employee" ? (r.department ?? "") : "",
    });
    toast.success(`Auto-filled from ${mode === "customer" ? "customer" : "employee"}`);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Auto-fill requester</div>
        <div className="ml-auto inline-flex rounded-md border bg-background p-0.5 text-xs">
          {([
            { v: "customer", label: "Customer", Icon: Briefcase },
            { v: "employee", label: "Employee", Icon: UserIcon },
            { v: "manual",   label: "Manual",   Icon: PenSquare },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => { setMode(v); setSelected(""); setQ(""); }}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 transition ${
                mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "manual" ? (
        <div className="text-xs text-muted-foreground">
          Fill the Requester section manually below.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${mode === "customer" ? "customers" : "employees"}…`}
              className="h-9 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                const r = source.find((x: any) => String(x.id) === e.target.value);
                applyFrom(r);
              }}
              className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">
                — Select {mode === "customer" ? "customer" : "employee"} ({filtered.length}) —
              </option>
              {filtered.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.sub ? ` — ${r.sub}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}


export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support Tickets — Devionic DMS" }] }),
  component: SupportPage,
});
