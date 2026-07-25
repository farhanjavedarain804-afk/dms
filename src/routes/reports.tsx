import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { resources } from "@/lib/api";
import { localCrud } from "@/lib/local-store";
import {
  Users, FolderKanban, CheckSquare, Clock, TrendingUp, TrendingDown, FileDown,
  FileText, Printer, Wallet, Landmark, Receipt, LifeBuoy, Package, Trophy,
  AlertTriangle, DollarSign, Building2, PieChart as PieIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import type { ReportSection } from "@/lib/report-export";
import { fmtPKR } from "@/lib/pk";
import { toast } from "sonner";

const reportExport = () => import("@/lib/report-export");

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — Devionic DMS" },
      { name: "description", content: "Cross-module business intelligence: revenue, expenses, cashflow, pipeline, tasks, attendance, inventory and support." },
    ],
  }),
  component: ReportsPage,
});

// Palette (matches design tokens)
const PALETTE = {
  primary: "oklch(0.55 0.22 275)",
  accent:  "oklch(0.75 0.16 185)",
  amber:   "oklch(0.75 0.16 75)",
  green:   "oklch(0.68 0.18 155)",
  red:     "oklch(0.62 0.22 25)",
  slate:   "oklch(0.65 0.03 250)",
  violet:  "oklch(0.62 0.2 300)",
};
const COLORS = [PALETTE.primary, PALETTE.accent, PALETTE.amber, PALETTE.green, PALETTE.red, PALETTE.violet, PALETTE.slate];

// --- Local-store views (mirror types loosely, only fields we need) ---
type InvoiceLite = {
  id: number; invoice_no: string; invoice_date: string; due_date?: string;
  client: string; total: number; amount_paid: number; balance_due: number;
  status: string; gst_amount?: number;
};
type Account = { id: number; name: string; kind: "cash" | "bank" | "wallet"; opening_balance: number };
type Txn = {
  id: number; voucher_no: string; date: string; description: string;
  type: "income" | "expense" | "transfer"; category: string; party?: string;
  account_id?: number; to_account_id?: number; amount: number; net_amount: number;
  status: string;
};
type ClientLite = {
  id: number; name: string; company: string; stage: string; value: number;
  probability?: number; assigned_to?: string; expected_close?: string;
};
type Payroll = {
  id: number; employee: string; department?: string; month: string;
  gross: number; deductions: number; net: number; status: string; paid_on?: string;
};
type Ticket = {
  id: number; ticket_no: string; subject: string; requester: string;
  priority: string; status: string; category?: string; created: string;
  sla_due?: string; satisfaction?: number;
};
type Asset = { id: number; name: string; category?: string; value?: number; status?: string; assigned_to?: string };
type Consumable = { id: number; name: string; category?: string; quantity?: number; unit_cost?: number; reorder_level?: number };
type Quotation = { id: number; quote_no: string; quote_date: string; client: string; total: number; status: string };

const invoicesApi = localCrud<InvoiceLite>("invoices");
const accountsApi = localCrud<Account>("finance_accounts_v1");
const txnApi      = localCrud<Txn>("finance_v2");
const clientsApi  = localCrud<ClientLite>("clients_v2");
const payrollApi  = localCrud<Payroll>("hr");
const supportApi  = localCrud<Ticket>("support_v2");
const assetsApi   = localCrud<Asset>("inventory");
const consumApi   = localCrud<Consumable>("inventory_consumables");
const quotesApi   = localCrud<Quotation>("quotations");

type ModuleKey =
  | "employees" | "projects" | "tasks" | "attendance"
  | "invoices" | "finance" | "clients" | "payroll"
  | "support" | "assets" | "quotations";

type RangeKey = "7d" | "30d" | "90d" | "ytd" | "all";
const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

function rangeStart(r: RangeKey): Date {
  const d = new Date();
  if (r === "7d")  return new Date(d.getTime() - 7 * 864e5);
  if (r === "30d") return new Date(d.getTime() - 30 * 864e5);
  if (r === "90d") return new Date(d.getTime() - 90 * 864e5);
  if (r === "ytd") return new Date(d.getFullYear(), 0, 1);
  return new Date(0);
}
const inRange = (dateStr: string | undefined, from: Date) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return !isNaN(t) && t >= from.getTime();
};
const monthKey = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (mk: string) => {
  const [y, m] = mk.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
};

function ReportsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [selected, setSelected] = useState<ModuleKey | "all">("all");
  const from = useMemo(() => rangeStart(range), [range]);

  // ---- Data ----
  const employees   = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const projects    = useQuery({ queryKey: ["projects"],  queryFn: resources.projects.list });
  const tasks       = useQuery({ queryKey: ["tasks"],     queryFn: resources.tasks.list });
  const attendance  = useQuery({ queryKey: ["attendance"],queryFn: resources.attendance.list });
  const invoices    = useQuery({ queryKey: ["invoices"],  queryFn: invoicesApi.list });
  const accounts    = useQuery({ queryKey: ["fin_accts"], queryFn: accountsApi.list });
  const txns        = useQuery({ queryKey: ["fin_txns"],  queryFn: txnApi.list });
  const clients     = useQuery({ queryKey: ["clients_v2"],queryFn: clientsApi.list });
  const payroll     = useQuery({ queryKey: ["hr"],        queryFn: payrollApi.list });
  const tickets     = useQuery({ queryKey: ["support_v2"],queryFn: supportApi.list });
  const assets      = useQuery({ queryKey: ["inventory"], queryFn: assetsApi.list });
  const consum      = useQuery({ queryKey: ["inv_cons"],  queryFn: consumApi.list });
  const quotes      = useQuery({ queryKey: ["quotations"],queryFn: quotesApi.list });

  const emp   = employees.data ?? [];
  const proj  = projects.data ?? [];
  const tsk   = tasks.data ?? [];
  const att   = attendance.data ?? [];
  const inv   = invoices.data ?? [];
  const acct  = accounts.data ?? [];
  const tx    = txns.data ?? [];
  const cli   = clients.data ?? [];
  const pay   = payroll.data ?? [];
  const tick  = tickets.data ?? [];
  const asst  = assets.data ?? [];
  const cons  = consum.data ?? [];
  const quo   = quotes.data ?? [];

  const loading = [employees, projects, tasks, attendance, invoices, accounts, txns, clients, payroll, tickets, assets, consum, quotes].some((q) => q.isLoading);

  // ---- Derived (windowed by range) ----
  const invR = useMemo(() => inv.filter((r) => inRange(r.invoice_date, from)),   [inv, from]);
  const txR  = useMemo(() => tx.filter((r) => inRange(r.date, from)),            [tx, from]);
  const attR = useMemo(() => att.filter((r) => inRange(r.date, from)),           [att, from]);
  const tskR = useMemo(() => tsk,                                                 [tsk]);
  const tickR = useMemo(() => tick.filter((r) => inRange(r.created, from)),      [tick, from]);
  const payR = useMemo(() => pay.filter((r) => inRange(r.month, from)),          [pay, from]);
  const quoR = useMemo(() => quo.filter((r) => inRange(r.quote_date, from)),     [quo, from]);

  // Financials
  const revenue     = txR.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.net_amount || t.amount || 0), 0);
  const expenses    = txR.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.net_amount || t.amount || 0), 0);
  const netProfit   = revenue - expenses;
  const receivables = inv.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const invoiced    = invR.reduce((s, i) => s + Number(i.total || 0), 0);
  const collected   = invR.reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  // Cash: opening + all txn deltas across all time (kept simple)
  const accountDeltas = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of acct) map[a.id] = Number(a.opening_balance || 0);
    for (const t of tx) {
      const amt = Number(t.net_amount || t.amount || 0);
      if (t.type === "income"   && t.account_id) map[t.account_id] = (map[t.account_id] ?? 0) + amt;
      if (t.type === "expense"  && t.account_id) map[t.account_id] = (map[t.account_id] ?? 0) - amt;
      if (t.type === "transfer") {
        if (t.account_id)     map[t.account_id]    = (map[t.account_id]    ?? 0) - amt;
        if (t.to_account_id)  map[t.to_account_id] = (map[t.to_account_id] ?? 0) + amt;
      }
    }
    return map;
  }, [acct, tx]);
  const cashBalance = Object.values(accountDeltas).reduce((s, v) => s + v, 0);

  // Monthly revenue vs expenses (last 6 months of window or ytd)
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { m: string; revenue: number; expenses: number }> = {};
    for (const t of tx) {
      if (!inRange(t.date, from)) continue;
      const mk = monthKey(t.date);
      if (!mk) continue;
      if (!map[mk]) map[mk] = { m: mk, revenue: 0, expenses: 0 };
      const amt = Number(t.net_amount || t.amount || 0);
      if (t.type === "income") map[mk].revenue += amt;
      if (t.type === "expense") map[mk].expenses += amt;
    }
    return Object.values(map)
      .sort((a, b) => a.m.localeCompare(b.m))
      .map((r) => ({ ...r, label: monthLabel(r.m), profit: r.revenue - r.expenses }));
  }, [tx, from]);

  // Pipeline funnel (CRM stages)
  const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
  const pipeline = STAGES.map((s) => ({
    name: s.replace(/^\w/, (c) => c.toUpperCase()),
    count: cli.filter((c) => c.stage === s).length,
    value: cli.filter((c) => c.stage === s).reduce((sum, c) => sum + Number(c.value || 0), 0),
  }));
  const pipelineValue = cli
    .filter((c) => c.stage !== "won" && c.stage !== "lost")
    .reduce((s, c) => s + Number(c.value || 0) * (Number(c.probability || 0) / 100), 0);

  // Expenses by category (windowed)
  const expensesByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of txR) {
      if (t.type !== "expense") continue;
      const key = (t.category || "other").replace(/_/g, " ");
      map[key] = (map[key] ?? 0) + Number(t.net_amount || t.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [txR]);

  // Department headcount
  const deptHeadcount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of emp) map[e.department ?? "Unassigned"] = (map[e.department ?? "Unassigned"] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [emp]);

  // Attendance breakdown & rate
  const attStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attR) map[a.status] = (map[a.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [attR]);
  const attTotal = attR.length;
  const attRate = attTotal ? ((attR.filter((a) => a.status === "present" || a.status === "late").length / attTotal) * 100) : 0;

  // Task stats
  const openTasks   = tsk.filter((t) => t.status !== "done").length;
  const doneTasks   = tsk.filter((t) => t.status === "done").length;
  const overdueTasks = tsk.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < new Date()).length;
  const tskStatus = ["todo", "in_progress", "review", "done"].map((s) => ({ name: s.replace("_", " "), value: tsk.filter((t) => t.status === s).length }));

  // Projects
  const activeProjects   = proj.filter((p) => p.status === "in_progress").length;
  const completedProjects = proj.filter((p) => p.status === "completed").length;
  const projectBudget    = proj.reduce((s, p) => s + Number(p.budget || 0), 0);
  const projStatus       = ["planning", "in_progress", "on_hold", "completed"].map((s) => ({
    name: s.replace("_", " "), value: proj.filter((p) => p.status === s).length,
  }));

  // Support KPIs
  const openTickets = tick.filter((t) => t.status !== "closed" && t.status !== "resolved").length;
  const slaBreached = tick.filter((t) => t.sla_due && new Date(t.sla_due) < new Date() && t.status !== "closed" && t.status !== "resolved").length;
  const csatScores  = tick.filter((t) => typeof t.satisfaction === "number").map((t) => t.satisfaction as number);
  const csat        = csatScores.length ? (csatScores.reduce((s, v) => s + v, 0) / csatScores.length) : 0;
  const tickStatus  = ["open", "in_progress", "waiting", "resolved", "closed"].map((s) => ({
    name: s.replace("_", " "), value: tick.filter((t) => t.status === s).length,
  }));

  // Inventory value
  const assetsValue    = asst.reduce((s, a) => s + Number(a.value || 0), 0);
  const consValue      = cons.reduce((s, c) => s + Number(c.quantity || 0) * Number(c.unit_cost || 0), 0);
  const inventoryValue = assetsValue + consValue;
  const lowStock       = cons.filter((c) => Number(c.quantity || 0) <= Number(c.reorder_level || 0)).length;

  // Top clients by collected revenue (all time)
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; invoiced: number; paid: number; due: number; invoices: number }> = {};
    for (const i of inv) {
      const k = i.client || "Unknown";
      if (!map[k]) map[k] = { name: k, invoiced: 0, paid: 0, due: 0, invoices: 0 };
      map[k].invoiced += Number(i.total || 0);
      map[k].paid     += Number(i.amount_paid || 0);
      map[k].due      += Number(i.balance_due || 0);
      map[k].invoices += 1;
    }
    return Object.values(map).sort((a, b) => b.paid - a.paid).slice(0, 8);
  }, [inv]);

  // Aging receivables buckets
  const aging = useMemo(() => {
    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    const now = Date.now();
    for (const i of inv) {
      const bal = Number(i.balance_due || 0);
      if (bal <= 0) continue;
      const due = i.due_date ? new Date(i.due_date).getTime() : new Date(i.invoice_date).getTime();
      const days = Math.floor((now - due) / 864e5);
      if (days <= 0) buckets.current += bal;
      else if (days <= 30) buckets["1-30"] += bal;
      else if (days <= 60) buckets["31-60"] += bal;
      else if (days <= 90) buckets["61-90"] += bal;
      else buckets["90+"] += bal;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [inv]);

  // Cashflow (net per month)
  const cashflow = monthlyTrend.map((r) => ({ label: r.label, net: r.profit }));

  // ---- Export sections ----
  const money = (v: any) => (v == null || v === "" ? "" : Number(v).toLocaleString());
  const sectionsMap = useMemo<Record<ModuleKey, ReportSection>>(() => ({
    employees: {
      title: "Employees",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "department", label: "Department" },
        { key: "position", label: "Position" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status" },
        { key: "join_date", label: "Join Date" },
        { key: "gross_salary", label: "Gross Salary (PKR)", format: (v) => money(v) },
      ],
      rows: emp,
    },
    projects: {
      title: "Projects",
      columns: [
        { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "client", label: "Client" },
        { key: "manager", label: "Manager" }, { key: "status", label: "Status" },
        { key: "progress", label: "Progress %" }, { key: "start_date", label: "Start" },
        { key: "deadline", label: "Deadline" },
        { key: "budget", label: "Budget (PKR)", format: (v) => money(v) },
      ], rows: proj,
    },
    tasks: {
      title: "Tasks",
      columns: [
        { key: "id", label: "ID" }, { key: "title", label: "Title" },
        { key: "assignee", label: "Assignee" }, { key: "status", label: "Status" },
        { key: "priority", label: "Priority" }, { key: "due_date", label: "Due" },
      ], rows: tsk,
    },
    attendance: {
      title: "Attendance",
      columns: [
        { key: "id", label: "ID" }, { key: "employee_name", label: "Employee" },
        { key: "date", label: "Date" }, { key: "check_in", label: "Check In" },
        { key: "check_out", label: "Check Out" }, { key: "status", label: "Status" },
      ], rows: att,
    },
    invoices: {
      title: "Invoices",
      columns: [
        { key: "invoice_no", label: "Invoice #" }, { key: "invoice_date", label: "Date" },
        { key: "client", label: "Client" }, { key: "status", label: "Status" },
        { key: "total", label: "Total", format: (v) => money(v) },
        { key: "amount_paid", label: "Paid", format: (v) => money(v) },
        { key: "balance_due", label: "Balance Due", format: (v) => money(v) },
      ], rows: inv,
    },
    finance: {
      title: "Finance Transactions",
      columns: [
        { key: "voucher_no", label: "Voucher #" }, { key: "date", label: "Date" },
        { key: "description", label: "Description" }, { key: "type", label: "Type" },
        { key: "category", label: "Category" }, { key: "party", label: "Party" },
        { key: "net_amount", label: "Net (PKR)", format: (v, r) => money(v ?? r.amount) },
        { key: "status", label: "Status" },
      ], rows: tx,
    },
    clients: {
      title: "Clients & Pipeline",
      columns: [
        { key: "name", label: "Contact" }, { key: "company", label: "Company" },
        { key: "stage", label: "Stage" }, { key: "assigned_to", label: "Owner" },
        { key: "value", label: "Deal Value", format: (v) => money(v) },
        { key: "probability", label: "Probability %" },
        { key: "expected_close", label: "Expected Close" },
      ], rows: cli,
    },
    payroll: {
      title: "Payroll",
      columns: [
        { key: "employee", label: "Employee" }, { key: "department", label: "Dept" },
        { key: "month", label: "Month" },
        { key: "gross", label: "Gross", format: (v) => money(v) },
        { key: "deductions", label: "Deductions", format: (v) => money(v) },
        { key: "net", label: "Net", format: (v) => money(v) },
        { key: "status", label: "Status" },
      ], rows: pay,
    },
    support: {
      title: "Support Tickets",
      columns: [
        { key: "ticket_no", label: "Ticket #" }, { key: "subject", label: "Subject" },
        { key: "requester", label: "Requester" }, { key: "priority", label: "Priority" },
        { key: "status", label: "Status" }, { key: "category", label: "Category" },
        { key: "created", label: "Created" }, { key: "sla_due", label: "SLA Due" },
      ], rows: tick,
    },
    assets: {
      title: "Assets & Inventory",
      columns: [
        { key: "name", label: "Item" }, { key: "category", label: "Category" },
        { key: "assigned_to", label: "Assigned To" }, { key: "status", label: "Status" },
        { key: "value", label: "Value (PKR)", format: (v) => money(v) },
      ], rows: asst,
    },
    quotations: {
      title: "Quotations",
      columns: [
        { key: "quote_no", label: "Quote #" }, { key: "quote_date", label: "Date" },
        { key: "client", label: "Client" }, { key: "status", label: "Status" },
        { key: "total", label: "Total", format: (v) => money(v) },
      ], rows: quo,
    },
  }), [emp, proj, tsk, att, inv, tx, cli, pay, tick, asst, quo]);

  const selectedSections = selected === "all" ? Object.values(sectionsMap) : [sectionsMap[selected]];

  const handleExport = async (kind: "pdf" | "csv") => {
    if (loading) return toast.error("Data still loading…");
    const total = selectedSections.reduce((s, x) => s + x.rows.length, 0);
    if (total === 0) return toast.error("No data available to export");
    const stamp = new Date().toISOString().slice(0, 10);
    const base  = selected === "all" ? `devionic-full-report-${stamp}` : `devionic-${selected}-${stamp}`;
    const { downloadCSV, downloadCombinedCSV, downloadPDF } = await reportExport();
    if (kind === "pdf") {
      const title = selected === "all" ? "Devionic — Company Report" : `${sectionsMap[selected].title} Report`;
      downloadPDF(base, title, selectedSections);
    } else if (selected === "all") {
      downloadCombinedCSV(base, selectedSections);
    } else {
      downloadCSV(base, selectedSections[0]);
    }
    toast.success(`${kind.toUpperCase()} exported`);
  };

  // KPIs — 8 items, 4-per-row on lg
  const trendPct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / Math.abs(prev)) * 100;
  // simple prior-period comparison (previous same window)
  const prevFrom = new Date(from.getTime() - (Date.now() - from.getTime()));
  const prevTxns = tx.filter((t) => inRange(t.date, prevFrom) && !inRange(t.date, from));
  const prevRev  = prevTxns.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.net_amount || t.amount || 0), 0);
  const prevExp  = prevTxns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.net_amount || t.amount || 0), 0);
  const revTrend = trendPct(revenue, prevRev);
  const expTrend = trendPct(expenses, prevExp);

  const kpis: {
    label: string; value: string; hint?: string; icon: any; tint: string; trend?: number;
  }[] = [
    { label: "Revenue",       value: fmtPKR(revenue),     icon: TrendingUp,  tint: PALETTE.green,   trend: revTrend,  hint: "Cleared & pending income" },
    { label: "Expenses",      value: fmtPKR(expenses),    icon: TrendingDown,tint: PALETTE.red,     trend: expTrend,  hint: "All outflows in period" },
    { label: "Net Profit",    value: fmtPKR(netProfit),   icon: DollarSign,  tint: PALETTE.primary, hint: `${netProfit >= 0 ? "Surplus" : "Deficit"} for period` },
    { label: "Cash Balance",  value: fmtPKR(cashBalance), icon: Wallet,      tint: PALETTE.accent,  hint: `${acct.length} accounts` },
    { label: "Receivables",   value: fmtPKR(receivables), icon: Receipt,     tint: PALETTE.amber,   hint: "Outstanding on invoices" },
    { label: "Pipeline (wtd)",value: fmtPKR(pipelineValue),icon: Trophy,     tint: PALETTE.violet,  hint: `${cli.length} clients tracked` },
    { label: "Active Projects", value: `${activeProjects}/${proj.length}`, icon: FolderKanban, tint: PALETTE.primary, hint: `${completedProjects} completed` },
    { label: "Open Tickets",   value: `${openTickets}`,   icon: LifeBuoy,    tint: PALETTE.red,     hint: `${slaBreached} SLA breached` },
  ];

  return (
    <AppLayout>
      <PageHeader title="Reports & Analytics" description="Live business intelligence across every Devionic module." />

      {/* Toolbar */}
      <div className="rounded-2xl bg-card border shadow-sm p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</span>
            <div className="flex flex-wrap rounded-lg border bg-background p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`text-xs px-3 py-1.5 rounded-md transition ${range === r.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Export</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All modules</option>
              <option value="employees">Employees</option>
              <option value="projects">Projects</option>
              <option value="tasks">Tasks</option>
              <option value="attendance">Attendance</option>
              <option value="invoices">Invoices</option>
              <option value="finance">Finance</option>
              <option value="clients">Clients & CRM</option>
              <option value="payroll">Payroll</option>
              <option value="support">Support Tickets</option>
              <option value="assets">Assets</option>
              <option value="quotations">Quotations</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={loading}>
              <FileText className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={() => handleExport("pdf")} disabled={loading}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          const up = (k.trend ?? 0) >= 0;
          return (
            <div key={k.label}
              className="group relative overflow-hidden rounded-2xl bg-card border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${k.tint}, transparent)` }} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{k.label}</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground truncate">{loading ? "…" : k.value}</p>
                  {k.hint && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{k.hint}</p>}
                </div>
                <div className="h-10 w-10 shrink-0 rounded-xl grid place-items-center"
                  style={{ background: `color-mix(in oklab, ${k.tint} 14%, transparent)`, color: k.tint }}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {typeof k.trend === "number" && (
                <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(k.trend).toFixed(1)}% vs previous
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 1 — Revenue vs Expenses trend + Cashflow */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Revenue vs Expenses" subtitle="Monthly trend" icon={TrendingUp} className="xl:col-span-2">
          {monthlyTrend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={PALETTE.green} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="ex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={PALETTE.red} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={PALETTE.red} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 255)" />
                <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue"  stroke={PALETTE.green} strokeWidth={2} fill="url(#rv)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke={PALETTE.red}   strokeWidth={2} fill="url(#ex)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Net Cashflow" subtitle="Profit per month" icon={Wallet}>
          {cashflow.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 255)" />
                <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtPKR(Number(v))} />
                <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                  {cashflow.map((r, i) => (
                    <Cell key={i} fill={r.net >= 0 ? PALETTE.green : PALETTE.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2 — Pipeline funnel + Expenses breakdown + Aging */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard title="Sales Pipeline" subtitle="Deals by stage" icon={Trophy}>
          {pipeline.every((p) => p.count === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipeline} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.92 0.01 255)" />
                <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v: any, n) => n === "value" ? fmtPKR(Number(v)) : v} />
                <Bar dataKey="count" fill={PALETTE.violet} radius={[0, 6, 6, 0]} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Expenses by Category" subtitle="Where money went" icon={PieIcon}>
          {expensesByCat.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expensesByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                  {expensesByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtPKR(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Aging Receivables" subtitle="Overdue days bucket" icon={AlertTriangle}>
          {aging.every((a) => a.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={aging}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 255)" />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmtPKR(Number(v))} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {aging.map((a, i) => (
                    <Cell key={i} fill={a.name === "current" ? PALETTE.green : a.name === "90+" ? PALETTE.red : PALETTE.amber} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3 — Projects, Tasks, Tickets, Attendance donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniDonut title="Project Status"    data={projStatus}  icon={FolderKanban} />
        <MiniDonut title="Task Status"       data={tskStatus}   icon={CheckSquare}  extra={`${overdueTasks} overdue`} />
        <MiniDonut title="Ticket Status"     data={tickStatus}  icon={LifeBuoy}     extra={csat ? `CSAT ${csat.toFixed(1)}/5` : undefined} />
        <MiniDonut title="Attendance"        data={attStatus}   icon={Clock}        extra={attTotal ? `${attRate.toFixed(1)}% present` : undefined} />
      </div>

      {/* Row 4 — Department headcount + Top clients */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Department Headcount" subtitle={`${emp.length} employees`} icon={Users}>
          {deptHeadcount.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptHeadcount} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.92 0.01 255)" />
                <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" fontSize={11} axisLine={false} tickLine={false} width={140} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE.primary} radius={[0, 6, 6, 0]} name="People" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="rounded-2xl bg-card border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${PALETTE.accent} 14%, transparent)`, color: PALETTE.accent }}>
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold">Top Clients by Revenue</h3>
                <p className="text-xs text-muted-foreground">Collected & outstanding balances</p>
              </div>
            </div>
          </div>
          {topClients.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-2">Client</th>
                    <th className="py-2 px-2 text-center">Invoices</th>
                    <th className="py-2 px-2 text-right">Invoiced</th>
                    <th className="py-2 px-2 text-right">Paid</th>
                    <th className="py-2 pl-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c) => (
                    <tr key={c.name} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 pr-2 font-medium truncate max-w-[220px]">{c.name}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{c.invoices}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmtPKR(c.invoiced)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-600 font-medium">{fmtPKR(c.paid)}</td>
                      <td className={`py-2 pl-2 text-right tabular-nums font-medium ${c.due > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{fmtPKR(c.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row 5 — Inventory + Snapshot */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${PALETTE.amber} 14%, transparent)`, color: PALETTE.amber }}>
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Inventory Value</h3>
              <p className="text-xs text-muted-foreground">Assets & stock on hand</p>
            </div>
          </div>
          <div className="space-y-3">
            <Row label="Fixed assets"   value={fmtPKR(assetsValue)} accent={PALETTE.primary} />
            <Row label="Consumables"    value={fmtPKR(consValue)}   accent={PALETTE.accent} />
            <div className="border-t pt-3">
              <Row label="Total value"  value={fmtPKR(inventoryValue)} bold />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{asst.length} assets · {cons.length} stock items</span>
              {lowStock > 0 && <span className="inline-flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="h-3 w-3" /> {lowStock} low stock</span>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border shadow-sm p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${PALETTE.primary} 14%, transparent)`, color: PALETTE.primary }}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">Executive Snapshot</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Invoiced (period)"  value={fmtPKR(invoiced)} />
            <Stat label="Collected"          value={fmtPKR(collected)} tint={PALETTE.green} />
            <Stat label="Payroll (period)"   value={fmtPKR(payR.reduce((s, p) => s + Number(p.net || 0), 0))} />
            <Stat label="Quotes sent"        value={`${quoR.length}`} hint={`${quo.filter((q) => q.status === "accepted").length} accepted`} />
            <Stat label="Attendance logs"    value={`${attR.length}`} hint={attTotal ? `${attRate.toFixed(1)}% present` : "—"} />
            <Stat label="Open tasks"         value={`${openTasks}`}   hint={`${overdueTasks} overdue`} tint={overdueTasks ? PALETTE.red : undefined} />
            <Stat label="Won deals"          value={`${cli.filter((c) => c.stage === "won").length}`} tint={PALETTE.green} />
            <Stat label="Total project budget" value={fmtPKR(projectBudget)} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ----- Small subcomponents -----
function ChartCard({ title, subtitle, icon: Icon, children, className }: { title: string; subtitle?: string; icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-card border shadow-sm p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${PALETTE.primary} 12%, transparent)`, color: PALETTE.primary }}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <h3 className="font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function MiniDonut({ title, data, icon: Icon, extra }: { title: string; data: { name: string; value: number }[]; icon: any; extra?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl bg-card border shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${PALETTE.primary} 12%, transparent)`, color: PALETTE.primary }}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {extra && <span className="text-[11px] text-muted-foreground">{extra}</span>}
      </div>
      {total === 0 ? <Empty small /> : (
        <div className="flex items-center gap-3">
          <div className="h-28 w-28 shrink-0 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={52} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div>
                <p className="text-lg font-bold leading-none">{total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">total</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 min-w-0 text-xs">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                <span className="font-semibold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {accent && <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />}
        <span className={`${bold ? "font-semibold" : "text-muted-foreground"} text-sm`}>{label}</span>
      </div>
      <span className={`tabular-nums ${bold ? "font-bold text-lg" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, hint, tint }: { label: string; value: string; hint?: string; tint?: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <p className="mt-1 font-bold tabular-nums truncate" style={tint ? { color: tint } : undefined}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
    </div>
  );
}

function Empty({ small }: { small?: boolean }) {
  return <div className={`${small ? "h-24" : "h-[260px]"} grid place-items-center text-sm text-muted-foreground`}>No data yet.</div>;
}
