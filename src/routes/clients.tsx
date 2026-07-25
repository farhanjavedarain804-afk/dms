import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserRoundCog, Trophy, TrendingUp, Wallet, Users, Percent, CalendarClock,
  AlertCircle, Mail, Phone, MessageCircle, LayoutGrid, Table as TableIcon, Star,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { localCrud } from "@/lib/local-store";
import { PK_CITIES, PK_PROVINCES, PK_TAX_STATUS, fmtPKR } from "@/lib/pk";

type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

type Client = {
  id: number;
  name: string;
  designation?: string;
  company: string;
  industry?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  city?: string;
  province?: string;
  address?: string;
  ntn?: string;
  strn?: string;
  cnic?: string;
  tax_status?: string;
  stage: Stage;
  priority?: "low" | "medium" | "high";
  rating?: number;
  probability?: number;
  source?: string;
  assigned_to?: string;
  value: number;
  currency: string;
  payment_terms?: string;
  expected_close?: string;
  last_contact?: string;
  next_followup?: string;
  tags?: string;
  notes?: string;
};

const STAGES: { value: Stage; label: string; color: string }[] = [
  { value: "lead",        label: "Lead",           color: "oklch(0.72 0.13 250)" },
  { value: "qualified",   label: "Qualified",      color: "oklch(0.72 0.15 210)" },
  { value: "proposal",    label: "Proposal Sent",  color: "oklch(0.72 0.16 90)"  },
  { value: "negotiation", label: "Negotiation",    color: "oklch(0.72 0.18 55)"  },
  { value: "won",         label: "Closed — Won",   color: "oklch(0.68 0.18 155)" },
  { value: "lost",        label: "Closed — Lost",  color: "oklch(0.65 0.18 25)"  },
];

const stageMeta = (s: string) => STAGES.find((x) => x.value === s) ?? STAGES[0];

const api = localCrud<Client>("clients_v2", [
  { name: "Ali Raza", designation: "CTO", company: "Nexus Fintech", industry: "Fintech", email: "ali@nexus.pk", phone: "+92 300 1234567", whatsapp: "+92 300 1234567", website: "nexus.pk", city: "Karachi", province: "sindh", address: "Plot 24, Shahrah-e-Faisal", ntn: "1234567-8", strn: "17-77-9999-001-19", cnic: "42101-1234567-1", tax_status: "filer", stage: "proposal", priority: "high", rating: 4, probability: 60, source: "Referral", assigned_to: "Umer Khan", value: 850000, currency: "PKR", payment_terms: "50% advance, 50% on delivery", expected_close: "2026-08-15", last_contact: "2026-07-10", next_followup: "2026-07-20", tags: "mobile-banking, priority", notes: "Interested in mobile banking module." },
  { name: "Sara Ahmed", designation: "CEO", company: "Zeta Retail", industry: "Retail", email: "sara@zeta.com", phone: "+92 321 9876543", whatsapp: "+92 321 9876543", website: "zeta.com.pk", city: "Lahore", province: "punjab", ntn: "9876543-2", tax_status: "filer", stage: "won", priority: "medium", rating: 5, probability: 100, source: "Website", assigned_to: "Ayesha Malik", value: 1200000, currency: "PKR", payment_terms: "Net 30", expected_close: "2026-06-30", last_contact: "2026-07-05", tags: "pos, retail" },
  { name: "Bilal Khan", designation: "Founder", company: "Kaghan Foods", industry: "F&B", email: "bilal@kaghanfoods.pk", phone: "+92 333 4567890", whatsapp: "+92 333 4567890", city: "Islamabad", province: "islamabad", tax_status: "non_filer", stage: "qualified", priority: "medium", rating: 3, probability: 30, source: "LinkedIn", assigned_to: "Umer Khan", value: 450000, currency: "PKR", expected_close: "2026-09-01", last_contact: "2026-07-12", next_followup: "2026-07-19", tags: "inventory" },
  { name: "Hassan Iqbal", designation: "COO", company: "Orbit Logistics", industry: "Logistics", email: "hassan@orbit.pk", phone: "+92 345 1122334", city: "Faisalabad", province: "punjab", tax_status: "filer", stage: "negotiation", priority: "high", rating: 4, probability: 75, source: "Referral", assigned_to: "Ayesha Malik", value: 1750000, currency: "PKR", payment_terms: "Milestones", expected_close: "2026-08-01", last_contact: "2026-07-14", next_followup: "2026-07-18", tags: "erp, tracking" },
  { name: "Farah Zaidi", designation: "Head of IT", company: "Meridian Textiles", industry: "Textile", email: "farah@meridian.com.pk", phone: "+92 300 7778899", city: "Karachi", province: "sindh", tax_status: "filer", stage: "lead", priority: "low", rating: 2, probability: 10, source: "Facebook Ads", assigned_to: "Umer Khan", value: 300000, currency: "PKR", last_contact: "2026-07-08", next_followup: "2026-07-25", tags: "hr, payroll" },
]);

// ---------- helpers / renderers ----------
function StageBadge({ value }: { value: string }) {
  const m = stageMeta(value);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        background: `color-mix(in oklab, ${m.color} 14%, transparent)`,
        color: m.color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    low: "oklch(0.72 0.13 250)",
    medium: "oklch(0.72 0.16 90)",
    high: "oklch(0.65 0.18 25)",
  };
  const c = map[value] ?? "oklch(0.6 0 0)";
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize"
      style={{ background: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
      {value}
    </span>
  );
}

function RatingStars({ value }: { value?: number }) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}

function TaxBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, string> = {
    filer: "oklch(0.68 0.18 155)",
    non_filer: "oklch(0.65 0.18 25)",
    exempt: "oklch(0.6 0 0)",
  };
  const label = PK_TAX_STATUS.find((t) => t.value === value)?.label ?? value;
  const c = map[value] ?? "oklch(0.6 0 0)";
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
      {label}
    </span>
  );
}

const fields: FieldDef<Client>[] = [
  // Contact
  { name: "name", label: "Contact name", required: true, section: "Contact",
    render: (v, r) => (
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
          {String(v ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{v}</div>
          <div className="text-xs text-muted-foreground truncate">{r.designation || r.company}</div>
        </div>
      </div>
    ) },
  { name: "designation", label: "Designation", placeholder: "CEO, CFO, Manager…", section: "Contact", hideInTable: true },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact", hideInTable: true },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+92 3XX XXXXXXX", section: "Contact", hideInTable: true },
  { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+92 3XX XXXXXXX", section: "Contact", hideInTable: true },
  { name: "cnic", label: "CNIC", placeholder: "XXXXX-XXXXXXX-X", section: "Contact", hideInTable: true },

  // Company
  { name: "company", label: "Company", required: true, section: "Company",
    render: (v, r) => (
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{v}</div>
        <div className="text-xs text-muted-foreground truncate">{[r.industry, r.city].filter(Boolean).join(" • ")}</div>
      </div>
    ) },
  { name: "industry", label: "Industry", placeholder: "Fintech, Retail, Manufacturing…", section: "Company", hideInTable: true },
  { name: "website", label: "Website", section: "Company", hideInTable: true },
  { name: "city", label: "City", type: "select", options: PK_CITIES, section: "Company", hideInTable: true },
  { name: "province", label: "Province", type: "select", options: PK_PROVINCES, section: "Company", hideInTable: true },
  { name: "address", label: "Address", type: "textarea", section: "Company", hideInTable: true },

  // Tax & Compliance
  { name: "ntn", label: "NTN", placeholder: "e.g. 1234567-8", section: "Tax & Compliance", hideInTable: true },
  { name: "strn", label: "STRN (Sales Tax)", placeholder: "e.g. 17-77-9999-001-19", section: "Tax & Compliance", hideInTable: true },
  { name: "tax_status", label: "FBR Filer Status", type: "select", options: PK_TAX_STATUS, section: "Tax & Compliance",
    render: (v) => <TaxBadge value={v} /> },

  // Sales Pipeline
  { name: "stage", label: "Stage", type: "select", required: true, section: "Sales Pipeline",
    options: STAGES.map((s) => ({ value: s.value, label: s.label })),
    render: (v) => <StageBadge value={v} /> },
  { name: "priority", label: "Priority", type: "select", section: "Sales Pipeline",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    render: (v) => <PriorityBadge value={v} /> },
  { name: "rating", label: "Lead rating (1-5)", type: "number", section: "Sales Pipeline",
    render: (v) => <RatingStars value={v} /> },
  { name: "probability", label: "Win probability (%)", type: "number", section: "Sales Pipeline", hideInTable: true,
    render: (v) => v == null || v === "" ? "—" : `${v}%` },
  { name: "source", label: "Lead source", placeholder: "Referral, Website, LinkedIn, Facebook Ads…", section: "Sales Pipeline", hideInTable: true },
  { name: "assigned_to", label: "Assigned to", placeholder: "Sales owner", section: "Sales Pipeline", hideInTable: true },
  { name: "value", label: "Deal value", type: "number", required: true, section: "Sales Pipeline",
    render: (v) => <span className="font-semibold tabular-nums">{fmtPKR(v)}</span> },
  { name: "currency", label: "Currency", type: "select", section: "Sales Pipeline", hideInTable: true, options: [
    { value: "PKR", label: "PKR — Pakistani Rupee" },
    { value: "USD", label: "USD — US Dollar" },
    { value: "AED", label: "AED — UAE Dirham" },
    { value: "SAR", label: "SAR — Saudi Riyal" },
    { value: "GBP", label: "GBP — Pound Sterling" },
  ] },
  { name: "payment_terms", label: "Payment terms", placeholder: "50% advance, Net 30, milestones…", section: "Sales Pipeline", fullWidth: true, hideInTable: true },
  { name: "expected_close", label: "Expected close date", type: "date", section: "Sales Pipeline", hideInTable: true },
  { name: "last_contact", label: "Last contact date", type: "date", section: "Sales Pipeline", hideInTable: true },
  { name: "next_followup", label: "Next follow-up", type: "date", section: "Sales Pipeline",
    render: (v) => {
      if (!v) return <span className="text-muted-foreground">—</span>;
      const d = new Date(v);
      const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
      const cls = days < 0 ? "text-destructive font-medium" : days <= 2 ? "text-amber-600 font-medium" : "";
      return <span className={cls}>{d.toLocaleDateString()}</span>;
    } },
  { name: "tags", label: "Tags", placeholder: "comma separated", section: "Sales Pipeline", hideInTable: true },
  { name: "notes", label: "Notes", type: "textarea", section: "Sales Pipeline", fullWidth: true, hideInTable: true },
];

// ---------- Pipeline Kanban ----------
function Pipeline({ rows }: { rows: Client[] }) {
  return (
    <div className="rounded-2xl border bg-card p-4 overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {STAGES.map((s) => {
          const cards = rows.filter((r) => r.stage === s.value);
          const total = cards.reduce((a, c) => a + Number(c.value ?? 0), 0);
          return (
            <div key={s.value} className="w-72 shrink-0 rounded-xl bg-muted/40 border">
              <div className="flex items-center justify-between px-3 py-2.5 border-b"
                style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12,
                         background: `color-mix(in oklab, ${s.color} 10%, transparent)` }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">({cards.length})</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{fmtPKR(total)}</span>
              </div>
              <div className="p-2 space-y-2 min-h-24 max-h-[520px] overflow-y-auto">
                {cards.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6">No deals</div>
                )}
                {cards.map((c) => (
                  <div key={c.id} className="rounded-lg bg-background border p-2.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.company}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.name}{c.designation ? ` · ${c.designation}` : ""}</div>
                      </div>
                      <PriorityBadge value={c.priority} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums">{fmtPKR(c.value)}</span>
                      <RatingStars value={c.rating} />
                    </div>
                    {(c.assigned_to || c.next_followup) && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate">{c.assigned_to || ""}</span>
                        {c.next_followup && <span>⏰ {new Date(c.next_followup).toLocaleDateString()}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Page ----------
function ClientsPage() {
  const q = useQuery({ queryKey: ["clients_v2"], queryFn: api.list });
  const rows = q.data ?? [];

  const [view, setView] = useState<"table" | "pipeline">("table");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [taxFilter, setTaxFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = useMemo(() => rows.filter((r) => {
    if (stageFilter !== "all" && r.stage !== stageFilter) return false;
    if (taxFilter !== "all" && r.tax_status !== taxFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    return true;
  }), [rows, stageFilter, taxFilter, priorityFilter]);

  const won = rows.filter((r) => r.stage === "won");
  const lost = rows.filter((r) => r.stage === "lost");
  const inPipeline = rows.filter((r) => !["won", "lost"].includes(r.stage));
  const pipelineValue = inPipeline.reduce((s, r) => s + Number(r.value ?? 0), 0);
  const wonValue = won.reduce((s, r) => s + Number(r.value ?? 0), 0);
  const closed = won.length + lost.length;
  const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const avgDeal = won.length > 0 ? Math.round(wonValue / won.length) : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const followupsDue = rows.filter((r) => {
    if (!r.next_followup) return false;
    const d = new Date(r.next_followup);
    return d <= in7;
  }).length;
  const overdueFollowups = rows.filter((r) => {
    if (!r.next_followup) return false;
    return new Date(r.next_followup) < today && !["won", "lost"].includes(r.stage);
  }).length;

  const openLink = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  return (
    <AppLayout>
      <PageHeader
        title="Clients & CRM"
        description="Leads, contacts, and Pakistan sales pipeline — NTN/STRN, FBR filer, PKR."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "clients",
              moduleLabel: "Clients & CRM",
              title: "Clients & CRM Report",
              subtitle: `${rows.length} client(s) · Win rate ${winRate}%`,
              meta: [
                { label: "Pipeline", value: fmtPKR(pipelineValue) },
                { label: "Won", value: fmtPKR(wonValue) },
                { label: "Avg Deal", value: fmtPKR(avgDeal) },
                { label: "Follow-ups (7d)", value: String(followupsDue) },
              ],
              sections: [
                {
                  title: "All Clients",
                  columns: [
                    { key: "name", label: "Name" },
                    { key: "company", label: "Company" },
                    { key: "stage", label: "Stage" },
                    { key: "priority", label: "Priority" },
                    { key: "value", label: "Deal Value", format: (v) => fmtPKR(v ?? 0) },
                    { key: "assigned_to", label: "Owner" },
                    { key: "city", label: "City" },
                    { key: "ntn", label: "NTN" },
                    { key: "tax_status", label: "FBR" },
                    { key: "next_followup", label: "Next Follow-up" },
                  ],
                  rows,
                },
              ],
            })}
          />
        }
      />

      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Clients",    value: rows.length,         hint: "All accounts",              icon: Users },
        { label: "Active Pipeline",  value: inPipeline.length,   hint: fmtPKR(pipelineValue),       icon: TrendingUp },
        { label: "Deals Won",        value: won.length,          hint: fmtPKR(wonValue),            icon: Trophy },
        { label: "Win Rate",         value: `${winRate}%`,       hint: `${won.length}/${closed} closed`, icon: Percent },
        { label: "Avg Deal (Won)",   value: fmtPKR(avgDeal),     hint: "Average won value",         icon: Wallet },
        { label: "Follow-ups (7d)",  value: followupsDue,        hint: "Due this week",             icon: CalendarClock },
        { label: "Overdue",          value: overdueFollowups,    hint: "Missed follow-ups",         icon: AlertCircle },
        { label: "Accounts Managed", value: new Set(rows.map((r) => r.assigned_to).filter(Boolean)).size,
          hint: "Unique owners",     icon: UserRoundCog },
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
          <Button size="sm" variant={view === "table" ? "default" : "ghost"} onClick={() => setView("table")}>
            <TableIcon className="h-4 w-4 mr-1" /> Table
          </Button>
          <Button size="sm" variant={view === "pipeline" ? "default" : "ghost"} onClick={() => setView("pipeline")}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Pipeline
          </Button>
        </div>
      </div>

      {view === "pipeline" ? (
        <Pipeline rows={filtered} />
      ) : (
        <CrudTable<Client>
          title="Client"
          fields={fields}
          api={api}
          queryKey="clients_v2"
          searchable={["name", "company", "email", "stage", "city", "ntn", "cnic", "assigned_to", "tags", "industry"]}
          defaults={{ stage: "lead", priority: "medium", value: 0, currency: "PKR", tax_status: "non_filer", probability: 20, rating: 3 }}
          filter={(r) => {
            if (stageFilter !== "all" && r.stage !== stageFilter) return false;
            if (taxFilter !== "all" && r.tax_status !== taxFilter) return false;
            if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
            return true;
          }}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">All stages</option>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={taxFilter} onChange={(e) => setTaxFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">All FBR status</option>
                {PK_TAX_STATUS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          }
          rowActions={(row) => (
            <>
              {row.email && (
                <Button size="sm" variant="ghost" title={`Email ${row.email}`}
                  onClick={() => openLink(`mailto:${row.email}`)}>
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              {row.phone && (
                <Button size="sm" variant="ghost" title={`Call ${row.phone}`}
                  onClick={() => openLink(`tel:${row.phone}`)}>
                  <Phone className="h-4 w-4" />
                </Button>
              )}
              {row.whatsapp && (
                <Button size="sm" variant="ghost" title={`WhatsApp ${row.whatsapp}`}
                  onClick={() => openLink(`https://wa.me/${row.whatsapp!.replace(/[^\d]/g, "")}`)}>
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                </Button>
              )}
            </>
          )}
        />
      )}
      <ModuleReportsCard module="clients" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients & CRM — Devionic DMS" }] }),
  component: ClientsPage,
});
