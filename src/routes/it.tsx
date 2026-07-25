import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Server, Activity, AlertTriangle, Wallet, ShieldCheck, CalendarClock,
  Database, Cloud, Globe, Wifi, Network, Package, HardDrive,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { PK_CITIES, fmtPKR } from "@/lib/pk";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type ITType = "server" | "network" | "database" | "saas" | "domain" | "isp" | "hosting" | "backup";
type ITStatus = "operational" | "degraded" | "outage" | "maintenance";
type Criticality = "low" | "medium" | "high" | "critical";

type ITAsset = {
  id: number;
  name: string;
  type: ITType;
  environment: "prod" | "staging" | "dev";
  provider?: string;
  isp?: string;
  location?: string;
  ip_address?: string;
  domain_url?: string;
  ssl_expiry?: string;
  owner: string;
  vendor_contact?: string;
  monthly_cost?: number;
  currency?: "PKR" | "USD";
  renewal_date?: string;
  billing_cycle?: "monthly" | "quarterly" | "annually";
  criticality?: Criticality;
  bandwidth?: string;        // e.g. "50 Mbps"
  backup_schedule?: string;  // e.g. "Daily 02:00 PKT"
  credentials_vault?: "1password" | "bitwarden" | "internal_vault" | "none";
  status: ITStatus;
  last_check: string;
  notes?: string;
};

const TYPE_META: Record<ITType, { label: string; icon: any; tint: string }> = {
  server:   { label: "Server / Compute",  icon: Server,   tint: "oklch(0.72 0.14 250)" },
  network:  { label: "Network Device",    icon: Network,  tint: "oklch(0.72 0.13 210)" },
  database: { label: "Database",          icon: Database, tint: "oklch(0.68 0.16 285)" },
  saas:     { label: "SaaS",              icon: Package,  tint: "oklch(0.7 0.15 190)"  },
  domain:   { label: "Domain",            icon: Globe,    tint: "oklch(0.7 0.17 80)"   },
  isp:      { label: "ISP / Link",        icon: Wifi,     tint: "oklch(0.7 0.17 55)"   },
  hosting:  { label: "Hosting / Cloud",   icon: Cloud,    tint: "oklch(0.7 0.15 160)"  },
  backup:   { label: "Backup / Storage",  icon: HardDrive, tint: "oklch(0.65 0.15 30)" },
};

const STATUS_META: Record<ITStatus, { label: string; tint: string }> = {
  operational: { label: "Operational", tint: "oklch(0.68 0.18 155)" },
  degraded:    { label: "Degraded",    tint: "oklch(0.75 0.17 80)"  },
  outage:      { label: "Outage",      tint: "oklch(0.65 0.2 25)"   },
  maintenance: { label: "Maintenance", tint: "oklch(0.7 0.1 250)"   },
};

const CRIT_META: Record<Criticality, string> = {
  low: "oklch(0.72 0.1 250)",
  medium: "oklch(0.72 0.14 200)",
  high: "oklch(0.7 0.17 55)",
  critical: "oklch(0.62 0.22 25)",
};

const api = localCrud<ITAsset>("it_v2", [
  { name: "api.devionic.com",        type: "server",   environment: "prod",    provider: "Cloudflare Workers",   location: "Karachi",   ip_address: "104.21.10.55",  domain_url: "https://api.devionic.com",   ssl_expiry: "2027-03-15", owner: "DevOps", monthly_cost: 15000, currency: "PKR", renewal_date: "2027-01-01", billing_cycle: "annually", criticality: "critical", credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "app.devionic.com",        type: "hosting",  environment: "prod",    provider: "Vercel",               domain_url: "https://app.devionic.com",  ssl_expiry: "2026-09-05", owner: "DevOps", monthly_cost: 5500,  currency: "PKR", renewal_date: "2026-09-01", billing_cycle: "monthly",   criticality: "high",     credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "PostgreSQL Primary",      type: "database", environment: "prod",    provider: "Supabase",             owner: "DevOps", monthly_cost: 8500, currency: "PKR",  renewal_date: "2026-08-01", billing_cycle: "monthly", criticality: "critical", backup_schedule: "Daily 02:00 PKT",  credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "Read Replica (Analytics)",type: "database", environment: "prod",    provider: "Supabase",             owner: "DevOps", monthly_cost: 3500, currency: "PKR",  criticality: "medium",   backup_schedule: "Daily 03:00 PKT",  credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "PTCL Fiber — Karachi HQ", type: "isp",      environment: "prod",    isp: "PTCL",       provider: "PTCL Business",   location: "Karachi",   vendor_contact: "+92 21 111 2000", monthly_cost: 12000, currency: "PKR", bandwidth: "100 Mbps", owner: "IT Admin", criticality: "critical", status: "operational", last_check: "2026-07-14" },
  { name: "Nayatel — Islamabad",     type: "isp",      environment: "prod",    isp: "Nayatel",    provider: "Nayatel",         location: "Islamabad", monthly_cost: 9500,  currency: "PKR", bandwidth: "50 Mbps",  owner: "IT Admin", criticality: "high",    status: "operational", last_check: "2026-07-14" },
  { name: "StormFiber — Lahore",     type: "isp",      environment: "prod",    isp: "StormFiber", provider: "StormFiber",      location: "Lahore",    monthly_cost: 6500,  currency: "PKR", bandwidth: "30 Mbps",  owner: "IT Admin", criticality: "medium",  status: "degraded",    last_check: "2026-07-13", notes: "Intermittent packet loss reported evenings." },
  { name: "devionic.com (domain)",   type: "domain",   environment: "prod",    provider: "PKNIC",           domain_url: "devionic.com",   renewal_date: "2026-08-20", billing_cycle: "annually", owner: "DevOps", monthly_cost: 250, currency: "PKR", criticality: "critical", status: "operational", last_check: "2026-07-14" },
  { name: "Google Workspace",        type: "saas",     environment: "prod",    provider: "Google",          owner: "IT Admin", monthly_cost: 24000, currency: "PKR", billing_cycle: "monthly", renewal_date: "2026-08-01", criticality: "critical", credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "GitHub Team",             type: "saas",     environment: "prod",    provider: "GitHub",          owner: "DevOps",   monthly_cost: 12500, currency: "PKR", billing_cycle: "monthly", renewal_date: "2026-08-05", criticality: "high",     credentials_vault: "1password", status: "operational", last_check: "2026-07-14" },
  { name: "Sentry Error Monitoring", type: "saas",     environment: "prod",    provider: "Sentry",          owner: "DevOps",   monthly_cost: 7800,  currency: "PKR", billing_cycle: "monthly", criticality: "medium", status: "operational", last_check: "2026-07-14" },
  { name: "Off-site Backup (S3)",    type: "backup",   environment: "prod",    provider: "AWS S3 (ap-south-1)", owner: "DevOps", monthly_cost: 4200, currency: "PKR", backup_schedule: "Nightly + Weekly full", criticality: "critical", status: "operational", last_check: "2026-07-14" },
  { name: "MikroTik CCR — HQ Router",type: "network",  environment: "prod",    provider: "MikroTik", location: "Karachi", ip_address: "192.168.1.1", owner: "IT Admin", criticality: "high", status: "operational", last_check: "2026-07-14" },
]);

const fields: FieldDef<ITAsset>[] = [
  { name: "name", label: "Resource name", required: true, section: "Resource" },
  { name: "type", label: "Type", type: "select", required: true, section: "Resource",
    options: (Object.entries(TYPE_META) as [ITType, typeof TYPE_META[ITType]][]).map(([v, m]) => ({ value: v, label: m.label })),
    render: (v: ITType) => {
      const m = TYPE_META[v];
      const Icon = m?.icon ?? Server;
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: `color-mix(in oklab, ${m?.tint} 14%, transparent)`, color: m?.tint }}>
          <Icon className="h-3 w-3" /> {m?.label}
        </span>
      );
    }
  },
  { name: "environment", label: "Environment", type: "select", required: true, section: "Resource", options: [
    { value: "prod", label: "Production" },
    { value: "staging", label: "Staging" },
    { value: "dev", label: "Development" },
  ] },
  { name: "provider", label: "Provider", placeholder: "AWS, Azure, Cloudflare, Supabase…", section: "Resource" },
  { name: "isp", label: "ISP (if applicable)", placeholder: "PTCL, Nayatel, StormFiber, Transworld, Wateen…", section: "Resource" },
  { name: "location", label: "City / DC", type: "select", options: PK_CITIES, section: "Resource" },
  { name: "criticality", label: "Criticality", type: "select", section: "Resource", options: [
    { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" },
  ], render: (v: Criticality) => v ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
      style={{ background: `color-mix(in oklab, ${CRIT_META[v]} 14%, transparent)`, color: CRIT_META[v] }}>{v}</span>
  ) : null },

  { name: "ip_address", label: "IP address", section: "Network" },
  { name: "domain_url", label: "Domain / URL", section: "Network" },
  { name: "ssl_expiry", label: "SSL expiry", type: "date", section: "Network" },
  { name: "bandwidth", label: "Bandwidth / Plan", placeholder: "100 Mbps / 1 vCPU 2GB", section: "Network" },

  { name: "owner", label: "Internal owner", required: true, section: "Ownership & Cost" },
  { name: "vendor_contact", label: "Vendor contact", placeholder: "Name / phone / email", section: "Ownership & Cost" },
  { name: "credentials_vault", label: "Credentials vault", type: "select", section: "Ownership & Cost", options: [
    { value: "none", label: "Not stored" },
    { value: "1password", label: "1Password" },
    { value: "bitwarden", label: "Bitwarden" },
    { value: "internal_vault", label: "Internal vault" },
  ] },
  { name: "monthly_cost", label: "Monthly cost", type: "number", section: "Ownership & Cost",
    render: (v, row) => fmtCost(Number(v ?? 0), row?.currency ?? "PKR") },
  { name: "currency", label: "Currency", type: "select", section: "Ownership & Cost", options: [
    { value: "PKR", label: "PKR" }, { value: "USD", label: "USD" },
  ] },
  { name: "billing_cycle", label: "Billing cycle", type: "select", section: "Ownership & Cost", options: [
    { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "annually", label: "Annually" },
  ] },
  { name: "renewal_date", label: "Renewal date", type: "date", section: "Ownership & Cost" },
  { name: "backup_schedule", label: "Backup schedule", placeholder: "Daily 02:00 PKT", section: "Ownership & Cost" },

  { name: "status", label: "Status", type: "select", required: true, section: "Health",
    options: (Object.entries(STATUS_META) as [ITStatus, typeof STATUS_META[ITStatus]][]).map(([v, m]) => ({ value: v, label: m.label })),
    render: (v: ITStatus) => {
      const m = STATUS_META[v] ?? STATUS_META.operational;
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `color-mix(in oklab, ${m.tint} 14%, transparent)`, color: m.tint }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.tint }} /> {m.label}
        </span>
      );
    }
  },
  { name: "last_check", label: "Last checked", type: "date", required: true, section: "Health" },
  { name: "notes", label: "Notes", type: "textarea", section: "Health", hideInTable: true },
];

function fmtCost(v: number, currency: "PKR" | "USD") {
  if (currency === "USD") return `$${Math.round(v).toLocaleString()}`;
  return fmtPKR(v);
}
function toPKR(v: number, currency: "PKR" | "USD" = "PKR") {
  return currency === "USD" ? v * 280 : v; // rough conversion for KPI totals
}
function daysUntil(d?: string) {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

type Tab = "all" | ITType;

function ITPage() {
  const q = useQuery({ queryKey: ["it_v2"], queryFn: api.list });
  const [tab, setTab] = useState<Tab>("all");
  const rows = q.data ?? [];

  const filteredRows = useMemo(
    () => tab === "all" ? rows : rows.filter((r) => r.type === tab),
    [rows, tab],
  );

  const operational = rows.filter((r) => r.status === "operational").length;
  const issues = rows.filter((r) => r.status === "degraded" || r.status === "outage").length;

  const monthlyPKR = rows.reduce((s, r) => s + toPKR(Number(r.monthly_cost ?? 0), r.currency), 0);
  const annualPKR = rows.reduce((s, r) => {
    const m = toPKR(Number(r.monthly_cost ?? 0), r.currency);
    const mult = r.billing_cycle === "annually" ? 12 : r.billing_cycle === "quarterly" ? 4 : 12;
    // monthly_cost is stored as monthly-equivalent already for our seeds; annualize x12
    return s + m * 12 / (mult === 12 ? 12 : mult);
  }, 0);

  // Alerts
  const sslSoon = rows.filter((r) => {
    const d = daysUntil(r.ssl_expiry);
    return d !== null && d <= 30;
  });
  const renewalsSoon = rows.filter((r) => {
    const d = daysUntil(r.renewal_date);
    return d !== null && d <= 30;
  });
  const critIssues = rows.filter((r) => (r.status === "outage" || r.status === "degraded") && (r.criticality === "critical" || r.criticality === "high"));

  const totalAlerts = sslSoon.length + renewalsSoon.length + critIssues.length;

  const uptimePct = rows.length ? Math.round((operational / rows.length) * 100) : 0;

  const TAB_ORDER: Tab[] = ["all", "server", "database", "hosting", "saas", "isp", "domain", "network", "backup"];
  const countByType = (t: Tab) => t === "all" ? rows.length : rows.filter((r) => r.type === t).length;

  return (
    <AppLayout>
      <PageHeader
        title="IT Infrastructure"
        description="Servers, databases, SaaS, domains, backups and Pakistani ISPs (PTCL, Nayatel, StormFiber, Transworld)."
      />

      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Resources", value: rows.length, hint: "All infrastructure", icon: Server },
        { label: "Operational",      value: operational, hint: `${uptimePct}% healthy`, icon: Activity, tint: "oklch(0.68 0.18 155)" },
        { label: "Active Issues",    value: issues, hint: "Degraded / outage", icon: AlertTriangle, tint: "oklch(0.65 0.2 25)" },
        { label: "Monthly Spend",    value: fmtPKR(monthlyPKR), hint: `≈ ${fmtPKR(annualPKR)} / year`, icon: Wallet },
      ]} />

      {/* Alerts strip */}
      {totalAlerts > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" /> Attention required
              <Badge variant="outline" className="ml-1 text-[10px] border-amber-400 text-amber-800 dark:text-amber-200">{totalAlerts}</Badge>
            </CardTitle>
            <CardDescription>Upcoming renewals, expiring SSL and critical service issues.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AlertGroup icon={ShieldCheck} title="SSL expiring ≤30d" tint="oklch(0.65 0.2 25)"
              items={sslSoon.map((r) => ({ name: r.name, meta: `${daysUntil(r.ssl_expiry)}d · ${r.ssl_expiry}` }))} />
            <AlertGroup icon={CalendarClock} title="Renewals ≤30d" tint="oklch(0.72 0.17 55)"
              items={renewalsSoon.map((r) => ({ name: r.name, meta: `${daysUntil(r.renewal_date)}d · ${fmtCost(Number(r.monthly_cost ?? 0), r.currency ?? "PKR")}` }))} />
            <AlertGroup icon={AlertTriangle} title="Critical/high issues" tint="oklch(0.65 0.2 25)"
              items={critIssues.map((r) => ({ name: r.name, meta: `${r.status} · ${r.criticality}` }))} />
          </CardContent>
        </Card>
      )}

      {/* Type tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TAB_ORDER.map((t) => {
            const Icon = t === "all" ? Server : TYPE_META[t].icon;
            const label = t === "all" ? "All" : TYPE_META[t].label;
            return (
              <TabsTrigger key={t} value={t} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
                <Badge variant="outline" className="ml-1 text-[10px]">{countByType(t)}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <CrudTable<ITAsset>
            title="Resource"
            fields={fields}
            api={{
              ...api,
              list: async () => filteredRows,
            }}
            queryKey={`it_v2_${tab}`}
            searchable={["name", "owner", "type", "provider", "isp", "location", "domain_url", "ip_address"]}
            defaults={{ status: "operational", environment: "prod", type: tab === "all" ? "server" : (tab as ITType), currency: "PKR", billing_cycle: "monthly", criticality: "medium" }}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function AlertGroup({
  icon: Icon, title, tint, items,
}: { icon: any; title: string; tint: string; items: { name: string; meta: string }[] }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: tint }}>
        <Icon className="h-4 w-4" /> {title}
        <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
      </div>
      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">None — all clear.</div>
        ) : items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium truncate">{it.name}</span>
            <span className="text-muted-foreground shrink-0">{it.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/it")({
  head: () => ({ meta: [{ title: "IT Infrastructure — Devionic DMS" }] }),
  component: ITPage,
});
