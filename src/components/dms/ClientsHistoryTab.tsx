
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Users, Trophy, TrendingDown, Wallet, Eye, Mail, Phone, MapPin, Building2, FileText, Briefcase, Receipt } from "lucide-react";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { fmtPKR } from "@/lib/pk";
import { resources, type Project } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
type Client = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  province?: string;
  address?: string;
  industry?: string;
  ntn?: string;
  strn?: string;
  stage: Stage;
  assigned_to?: string;
  source?: string;
  value?: number;
  expected_close?: string;
  last_contact?: string;
  next_followup?: string;
  notes?: string;
  created_at?: string;
};

type InvoiceLite = {
  id: number;
  invoice_no: string;
  client: string;
  invoice_date?: string;
  due_date?: string;
  total?: number;
  amount_paid?: number;
  balance_due?: number;
  status: string;
  payment_method?: string;
  bank?: string;
};

type QuotationLite = {
  id: number;
  quote_no: string;
  quote_date: string;
  valid_until?: string;
  client: string;
  subject?: string;
  total?: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
};

const clientsApi = localCrud<Client>("clients_v2");
const invoicesApi = localCrud<InvoiceLite>("invoices");
const quotationsApi = localCrud<QuotationLite>("quotations");

const STAGE_META: Record<Stage, { label: string; tint: string }> = {
  lead: { label: "Lead", tint: "oklch(0.72 0.13 250)" },
  qualified: { label: "Qualified", tint: "oklch(0.72 0.15 210)" },
  proposal: { label: "Proposal", tint: "oklch(0.72 0.16 90)" },
  negotiation: { label: "Negotiation", tint: "oklch(0.72 0.18 55)" },
  won: { label: "Won", tint: "oklch(0.68 0.18 155)" },
  lost: { label: "Lost", tint: "oklch(0.65 0.18 25)" },
};

const PROJECT_TINT: Record<string, string> = {
  planning: "oklch(0.72 0.13 250)",
  in_progress: "oklch(0.72 0.16 210)",
  on_hold: "oklch(0.72 0.16 55)",
  completed: "oklch(0.68 0.18 155)",
};

const QUOTE_TINT: Record<string, string> = {
  draft: "oklch(0.65 0.02 250)",
  sent: "oklch(0.72 0.15 210)",
  accepted: "oklch(0.68 0.18 155)",
  rejected: "oklch(0.65 0.18 25)",
  expired: "oklch(0.65 0.02 250)",
  converted: "oklch(0.68 0.16 190)",
};

const INV_TINT: Record<string, string> = {
  draft: "oklch(0.65 0.02 250)",
  sent: "oklch(0.72 0.15 210)",
  partially_paid: "oklch(0.72 0.16 90)",
  paid: "oklch(0.68 0.18 155)",
  overdue: "oklch(0.65 0.18 25)",
  cancelled: "oklch(0.65 0.02 250)",
};

type StageFilter = "all" | Stage;

export function ClientsHistoryTab() {
  const clientsQ = useQuery({ queryKey: ["clients_v2"], queryFn: clientsApi.list });
  const invQ = useQuery({ queryKey: ["invoices"], queryFn: invoicesApi.list });
  const quotesQ = useQuery({ queryKey: ["quotations"], queryFn: quotationsApi.list });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StageFilter>("all");
  const [viewing, setViewing] = useState<Client | null>(null);

  const clients = clientsQ.data ?? [];
  const invoices = invQ.data ?? [];
  const quotations = quotesQ.data ?? [];
  const projects = projectsQ.data ?? [];

  const matchClient = (rowClient: string | undefined, c: Client) => {
    const key = (rowClient ?? "").toLowerCase().trim();
    return key && (key === (c.company ?? "").toLowerCase().trim() || key === (c.name ?? "").toLowerCase().trim());
  };

  const rows = useMemo(() => {
    return clients.map((c) => {
      const own = invoices.filter((i) => matchClient(i.client, c));
      const totalInvoiced = own.reduce((s, i) => s + Number(i.total ?? 0), 0);
      const paid = own.filter((i) => i.status === "paid");
      const paidAmt = own.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
      const outstanding = own.reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
      const lastInv = own.map((i) => i.invoice_date ?? "").filter(Boolean).sort().at(-1);
      return {
        ...c,
        invoiceCount: own.length,
        paidCount: paid.length,
        totalInvoiced,
        paidAmt,
        outstanding,
        lastInvoice: lastInv,
      };
    });
  }, [clients, invoices]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.stage !== filter) return false;
      if (!s) return true;
      return [r.name, r.company, r.email, r.industry, r.ntn].some((v) => (v ?? "").toString().toLowerCase().includes(s));
    });
  }, [rows, search, filter]);

  const wonCount = rows.filter((r) => r.stage === "won").length;
  const lostCount = rows.filter((r) => r.stage === "lost").length;
  const totalRevenue = rows.reduce((s, r) => s + r.paidAmt, 0);
  const totalInvoicedAll = rows.reduce((s, r) => s + r.totalInvoiced, 0);
  const totalDue = rows.reduce((s, r) => s + r.outstanding, 0);
  const clientsWithDue = rows.filter((r) => r.outstanding > 0).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdueDue = invoices.reduce((s, i) => s + ((i.balance_due ?? 0) > 0 && i.due_date && i.due_date < today ? Number(i.balance_due ?? 0) : 0), 0);

  const chip = (key: StageFilter, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  // Details for the currently-viewed client
  const detail = useMemo(() => {
    if (!viewing) return null;
    const c = viewing;
    const clientQuotes = quotations.filter((q) => matchClient(q.client, c))
      .sort((a, b) => (b.quote_date ?? "").localeCompare(a.quote_date ?? ""));
    const clientInvoices = invoices.filter((i) => matchClient(i.client, c))
      .sort((a, b) => (b.invoice_date ?? "").localeCompare(a.invoice_date ?? ""));
    const clientProjects = (projects as Project[]).filter((p) => matchClient(p.client, c))
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));

    const wonQ = clientQuotes.filter((q) => q.status === "accepted" || q.status === "converted").length;
    const rejectedQ = clientQuotes.filter((q) => q.status === "rejected" || q.status === "expired").length;
    const activeP = clientProjects.filter((p) => p.status === "in_progress" || p.status === "planning" || p.status === "on_hold").length;
    const completedP = clientProjects.filter((p) => p.status === "completed").length;
    const totalInv = clientInvoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
    const paidAmt = clientInvoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
    const outstanding = clientInvoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = clientInvoices.filter((i) => (i.balance_due ?? 0) > 0 && i.due_date && i.due_date < today);

    return { c, clientQuotes, clientInvoices, clientProjects, wonQ, rejectedQ, activeP, completedP, totalInv, paidAmt, outstanding, overdue };
  }, [viewing, quotations, invoices, projects]);

  return (
    <div className="space-y-6">
      <StatsCards loading={clientsQ.isLoading || invQ.isLoading} stats={[
        { label: "Total Clients", value: rows.length, icon: Users },
        { label: "Won Deals", value: wonCount, icon: Trophy, tint: "oklch(0.68 0.18 155)" },
        { label: "Lost Deals", value: lostCount, icon: TrendingDown, tint: "oklch(0.65 0.18 25)" },
        { label: "Total Invoiced", value: fmtPKR(totalInvoicedAll), hint: "Gross value across all clients", icon: Receipt },
        { label: "Realized Revenue", value: fmtPKR(totalRevenue), hint: "Collected from paid invoices", icon: Wallet, tint: "oklch(0.68 0.18 155)" },
        { label: "Client Due (Outstanding)", value: fmtPKR(totalDue), hint: `${clientsWithDue} client${clientsWithDue === 1 ? "" : "s"} with balance • Overdue: ${fmtPKR(overdueDue)}`, icon: TrendingDown, tint: totalDue > 0 ? "oklch(0.65 0.18 25)" : "oklch(0.68 0.18 155)" },
      ]} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Client Ledger
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {chip("all", "All", rows.length)}
            {chip("won", "Won", wonCount)}
            {chip("negotiation", "Negotiation", rows.filter((r) => r.stage === "negotiation").length)}
            {chip("proposal", "Proposal", rows.filter((r) => r.stage === "proposal").length)}
            {chip("lost", "Lost", lostCount)}
            <Input placeholder="Search client, company, NTN..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last Invoice</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                      {clientsQ.isLoading ? "Loading..." : "No clients to show."}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((r) => {
                  const m = STAGE_META[r.stage] ?? STAGE_META.lead;
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setViewing(r)}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        <div>{r.company}</div>
                        {r.industry && <div className="text-xs text-muted-foreground">{r.industry}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.city ?? "—"}</TableCell>
                      <TableCell>
                        <Badge style={{ background: `color-mix(in oklab, ${m.tint} 14%, transparent)`, color: m.tint, borderColor: "transparent" }}>
                          {m.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.invoiceCount}</TableCell>
                      <TableCell className="text-right font-mono">{fmtPKR(r.totalInvoiced)}</TableCell>
                      <TableCell className="text-right font-mono" style={{ color: "oklch(0.55 0.16 155)" }}>{fmtPKR(r.paidAmt)}</TableCell>
                      <TableCell className="text-right font-mono" style={{ color: r.outstanding > 0 ? "oklch(0.6 0.18 25)" : undefined }}>{fmtPKR(r.outstanding)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.lastInvoice ?? "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> {detail.c.company}
                  <Badge className="ml-2" style={{ background: `color-mix(in oklab, ${STAGE_META[detail.c.stage].tint} 14%, transparent)`, color: STAGE_META[detail.c.stage].tint, borderColor: "transparent" }}>
                    {STAGE_META[detail.c.stage].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Profile summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contact</div>
                  <div><span className="text-muted-foreground">Person:</span> {detail.c.name}</div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {detail.c.email || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {detail.c.phone || "—"}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {[detail.c.address, detail.c.city, detail.c.province].filter(Boolean).join(", ") || "—"}</div>
                </div>
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Business</div>
                  <div><span className="text-muted-foreground">Industry:</span> {detail.c.industry || "—"}</div>
                  <div><span className="text-muted-foreground">NTN:</span> {detail.c.ntn || "—"} &nbsp; <span className="text-muted-foreground">STRN:</span> {detail.c.strn || "—"}</div>
                  <div><span className="text-muted-foreground">Assigned:</span> {detail.c.assigned_to || "—"} &nbsp; <span className="text-muted-foreground">Source:</span> {detail.c.source || "—"}</div>
                  <div><span className="text-muted-foreground">Onboarded:</span> {detail.c.created_at?.slice(0,10) || "—"} &nbsp; <span className="text-muted-foreground">Last Contact:</span> {detail.c.last_contact || "—"}</div>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
                {[
                  { label: "Quotations", value: detail.clientQuotes.length, icon: FileText },
                  { label: "Won / Rejected", value: `${detail.wonQ} / ${detail.rejectedQ}` },
                  { label: "Projects", value: detail.clientProjects.length, icon: Briefcase },
                  { label: "Active / Done", value: `${detail.activeP} / ${detail.completedP}` },
                  { label: "Total Invoiced", value: fmtPKR(detail.totalInv), icon: Receipt },
                  { label: "Outstanding", value: fmtPKR(detail.outstanding), tint: detail.outstanding > 0 ? "oklch(0.6 0.18 25)" : undefined },
                ].map((k, i) => (
                  <div key={i} className="rounded-md border p-2.5">
                    <div className="text-[11px] text-muted-foreground">{k.label}</div>
                    <div className="text-sm font-semibold font-mono" style={{ color: (k as any).tint }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <Tabs defaultValue="quotations" className="mt-2">
                <TabsList>
                  <TabsTrigger value="quotations">Quotations ({detail.clientQuotes.length})</TabsTrigger>
                  <TabsTrigger value="projects">Projects ({detail.clientProjects.length})</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices & Payments ({detail.clientInvoices.length})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="quotations">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Quote #</TableHead><TableHead>Date</TableHead><TableHead>Valid Until</TableHead>
                        <TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {detail.clientQuotes.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No quotations sent yet.</TableCell></TableRow>
                        ) : detail.clientQuotes.map((q) => {
                          const tint = QUOTE_TINT[q.status] ?? QUOTE_TINT.draft;
                          return (
                            <TableRow key={q.id}>
                              <TableCell className="font-mono text-xs">{q.quote_no}</TableCell>
                              <TableCell>{q.quote_date}</TableCell>
                              <TableCell className="text-muted-foreground">{q.valid_until ?? "—"}</TableCell>
                              <TableCell>{q.subject ?? "—"}</TableCell>
                              <TableCell><Badge style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)`, color: tint, borderColor: "transparent" }}>{q.status}</Badge></TableCell>
                              <TableCell className="text-right font-mono">{fmtPKR(q.total ?? 0)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="projects">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Project</TableHead><TableHead>Start</TableHead><TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead><TableHead className="text-right">Progress</TableHead><TableHead className="text-right">Budget</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {detail.clientProjects.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No projects for this client.</TableCell></TableRow>
                        ) : detail.clientProjects.map((p) => {
                          const tint = PROJECT_TINT[p.status] ?? PROJECT_TINT.planning;
                          const today = new Date().toISOString().slice(0, 10);
                          const overdue = p.deadline && p.deadline < today && p.status !== "completed";
                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                <div className="font-medium">{p.name}</div>
                                {p.manager && <div className="text-xs text-muted-foreground">PM: {p.manager}</div>}
                              </TableCell>
                              <TableCell>{p.start_date ?? "—"}</TableCell>
                              <TableCell className={overdue ? "font-medium" : ""} style={{ color: overdue ? "oklch(0.6 0.18 25)" : undefined }}>
                                {p.deadline ?? "—"} {overdue && <span className="text-[10px]">(overdue)</span>}
                              </TableCell>
                              <TableCell><Badge style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)`, color: tint, borderColor: "transparent" }}>{p.status.replace("_"," ")}</Badge></TableCell>
                              <TableCell className="text-right">{p.progress ?? 0}%</TableCell>
                              <TableCell className="text-right font-mono">{p.budget ? fmtPKR(p.budget) : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="invoices">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Invoice #</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {detail.clientInvoices.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">No invoices for this client.</TableCell></TableRow>
                        ) : detail.clientInvoices.map((i) => {
                          const tint = INV_TINT[i.status] ?? INV_TINT.draft;
                          const today = new Date().toISOString().slice(0, 10);
                          const overdue = (i.balance_due ?? 0) > 0 && i.due_date && i.due_date < today;
                          return (
                            <TableRow key={i.id}>
                              <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                              <TableCell>{i.invoice_date ?? "—"}</TableCell>
                              <TableCell className={overdue ? "font-medium" : ""} style={{ color: overdue ? "oklch(0.6 0.18 25)" : undefined }}>
                                {i.due_date ?? "—"} {overdue && <span className="text-[10px]">(overdue)</span>}
                              </TableCell>
                              <TableCell><Badge style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)`, color: tint, borderColor: "transparent" }}>{i.status.replace("_"," ")}</Badge></TableCell>
                              <TableCell className="text-right font-mono">{fmtPKR(i.total ?? 0)}</TableCell>
                              <TableCell className="text-right font-mono" style={{ color: "oklch(0.55 0.16 155)" }}>{fmtPKR(i.amount_paid ?? 0)}</TableCell>
                              <TableCell className="text-right font-mono" style={{ color: (i.balance_due ?? 0) > 0 ? "oklch(0.6 0.18 25)" : undefined }}>{fmtPKR(i.balance_due ?? 0)}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{[i.payment_method, i.bank].filter(Boolean).join(" · ") || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {detail.overdue.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span style={{ color: "oklch(0.6 0.18 25)" }} className="font-medium">{detail.overdue.length} overdue</span> — outstanding {fmtPKR(detail.overdue.reduce((s, i) => s + Number(i.balance_due ?? 0), 0))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  <ClientTimeline
                    events={[
                      ...(detail.c.created_at ? [{ at: detail.c.created_at.slice(0,10), label: "Client onboarded", kind: "client" }] : []),
                      ...detail.clientQuotes.map((q) => ({ at: q.quote_date, label: `Quotation ${q.quote_no} — ${q.status}`, kind: "quote", tint: QUOTE_TINT[q.status] })),
                      ...detail.clientProjects.flatMap((p) => ([
                        p.start_date ? { at: p.start_date, label: `Project started: ${p.name}`, kind: "project", tint: PROJECT_TINT.in_progress } : null,
                        p.deadline ? { at: p.deadline, label: `Project deadline: ${p.name} (${p.status})`, kind: "project", tint: PROJECT_TINT[p.status] ?? PROJECT_TINT.planning } : null,
                      ].filter(Boolean) as any[])),
                      ...detail.clientInvoices.flatMap((i) => ([
                        i.invoice_date ? { at: i.invoice_date, label: `Invoice ${i.invoice_no} issued — ${fmtPKR(i.total ?? 0)}`, kind: "invoice", tint: INV_TINT[i.status] } : null,
                        i.due_date ? { at: i.due_date, label: `Invoice ${i.invoice_no} due — balance ${fmtPKR(i.balance_due ?? 0)}`, kind: "invoice", tint: (i.balance_due ?? 0) > 0 ? "oklch(0.6 0.18 25)" : "oklch(0.55 0.16 155)" } : null,
                      ].filter(Boolean) as any[])),
                    ].filter((e) => e && e.at).sort((a: any, b: any) => (b.at ?? "").localeCompare(a.at ?? ""))}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientTimeline({ events }: { events: { at: string; label: string; kind: string; tint?: string }[] }) {
  if (!events.length) return <div className="text-sm text-muted-foreground py-6 text-center">No activity recorded.</div>;
  return (
    <ol className="relative border-l ml-3 space-y-3 pl-4 py-2">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background" style={{ background: e.tint ?? "oklch(0.65 0.02 250)" }} />
          <div className="text-xs text-muted-foreground">{e.at}</div>
          <div className="text-sm">{e.label}</div>
        </li>
      ))}
    </ol>
  );
}

