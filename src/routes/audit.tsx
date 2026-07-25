import { lazy, Suspense, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCards } from "@/components/dms/StatsCards";
import {
  ClipboardCheck, Sparkles, Play, Download, Printer, Eye, Loader2, TrendingUp,
  ListChecks, Trash2,
  UserCog, Wallet, Clock, Users, Receipt, Coins, Percent, ShoppingBag,
  FileSpreadsheet, UserRoundCog, PhoneCall, FolderKanban, CheckSquare,
  LifeBuoy, Package, Boxes, FileText, Scale, Bell, ShieldCheck, Lock,
  Search, LogIn, Activity, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { AUDITS, AUDIT_CATEGORY_LABEL, type AuditDef, type AuditCategory } from "@/lib/audit-catalog";
import { runAuditReport } from "@/lib/audit.functions";
import { buildRequest, callProvider, getProviderDefaultModel } from "@/lib/ai-provider";
import { COMPANY } from "@/lib/company";
import { useAuth } from "@/lib/auth";
// Heavy jsPDF-backed module — lazy-load only when the user actually clicks
// Preview/Print/Download so the initial route paint stays fast.
const loadLetterhead = () => import("@/lib/letterhead-pdf");
import { generatedDocs, type GeneratedDoc } from "@/lib/generated-docs";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";

const AuditReportDialog = lazy(() =>
  import("@/components/dms/AuditReportDialog").then((m) => ({ default: m.AuditReportDialog })),
);

// Read the AI Assistant's active provider config so audits use the same AI
// the user selected as default there.
const AI_CFG_KEY = "devionic.ai.configs";
const AI_ACTIVE_KEY = "devionic.ai.activeProvider";
const PROVIDER_LABELS: Record<string, string> = {
  lovable: "Built-in (Lovable AI)",
  openai: "OpenAI (ChatGPT)",
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
  groq: "Groq",
  mistral: "Mistral",
  perplexity: "Perplexity",
  together: "Together AI",
  custom: "Custom",
};
type ActiveAI = { provider: string; label: string; model: string; apiKey: string; baseUrl?: string; ready: boolean };
function readActiveAI(): ActiveAI {
  if (typeof window === "undefined") {
    return { provider: "lovable", label: PROVIDER_LABELS.lovable, model: "google/gemini-3.1-flash-lite", apiKey: "", ready: true };
  }
  const active = (localStorage.getItem(AI_ACTIVE_KEY) || "lovable").toLowerCase();
  let cfg: any = {};
  try { cfg = JSON.parse(localStorage.getItem(AI_CFG_KEY) || "{}"); } catch { /* noop */ }
  const c = cfg[active] || {};
  if (active === "lovable") {
    return { provider: "lovable", label: PROVIDER_LABELS.lovable, model: c.model || "google/gemini-3.1-flash-lite", apiKey: "", ready: true };
  }
  return {
    provider: active,
    label: PROVIDER_LABELS[active] || active,
    model: c.model || "",
    apiKey: c.apiKey || "",
    baseUrl: c.baseUrl,
    ready: !!c.apiKey,
  };
}

const ICONS: Record<string, any> = {
  UserCog, Wallet, Clock, Users, Receipt, TrendingUp, Coins, Percent, ShoppingBag,
  FileSpreadsheet, UserRoundCog, PhoneCall, FolderKanban, CheckSquare, LifeBuoy,
  Package, Boxes, FileText, Scale, Bell, ShieldCheck, Lock, Sparkles,
  LogIn, Activity, Layers,
};

type AuditReport = Awaited<ReturnType<typeof runAuditReport>>;

const MAX_SNAPSHOT_ROWS = 8;
const MAX_FIELD_LENGTH = 240;
const MAX_SNAPSHOT_CHARS_PER_KEY = 4_000;

function compactValue(value: any, depth = 0): any {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > MAX_FIELD_LENGTH ? `${value.slice(0, MAX_FIELD_LENGTH)}…` : value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return {
      count: value.length,
      sample: value.slice(0, MAX_SNAPSHOT_ROWS).map((item) => compactValue(item, depth + 1)),
    };
  }
  if (typeof value === "object") {
    if (depth >= 2) return "[nested object]";
    const out: Record<string, any> = {};
    const preferred = [
      "id", "name", "title", "type", "status", "role", "department", "amount", "total", "balance",
      "date", "created_at", "updated_at", "email", "phone", "client", "employee", "project", "priority",
      "severity", "ip", "device", "action", "module", "description", "summary", "doc_no",
    ];
    const entries = Object.entries(value).filter(([key]) => {
      const lower = key.toLowerCase();
      return !lower.includes("base64") && !lower.includes("blob") && !lower.includes("file") && !lower.includes("image") && !lower.includes("pdf") && !lower.includes("html");
    });
    const sorted = entries.sort(([a], [b]) => {
      const ai = preferred.indexOf(a);
      const bi = preferred.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    for (const [key, nested] of sorted.slice(0, 18)) out[key] = compactValue(nested, depth + 1);
    return out;
  }
  return String(value);
}

function compactDataset(value: any): any {
  const compacted = compactValue(value);
  const text = JSON.stringify(compacted);
  if (text.length <= MAX_SNAPSHOT_CHARS_PER_KEY) return compacted;
  return {
    summary: "Dataset was compacted for fast AI audit processing.",
    preview: text.slice(0, MAX_SNAPSHOT_CHARS_PER_KEY),
  };
}

type AuditRun = {
  audit: AuditDef;
  report: AuditReport;
  refNo: string;
  period: string;
  scope: string;
};

async function snapshotDataFor(keys: string[]): Promise<Record<string, any>> {
  if (typeof window === "undefined") return {};
  const entries = await Promise.all(keys.map(async (k) => {
    if (k.startsWith("sb:")) {
      const table = k.slice(3);
      try {
        // Keep payload small — server also truncates, but limit here to avoid
        // "Failed to fetch" from oversized request bodies on the edge worker.
        const { data, error, count } = await supabase.from(table as any).select("*", { count: "exact" }).limit(25);
        return [k, error ? { error: error.message } : compactDataset({ count: count ?? data?.length ?? 0, sample: data ?? [] })] as const;
      } catch (e: any) {
        return [k, { error: String(e?.message || e) }] as const;
      }
    }
    try {
      const raw = window.localStorage.getItem(`dms:${k}`);
      if (!raw) return [k, []] as const;
      const parsed = JSON.parse(raw);
      return [k, compactDataset(parsed)] as const;
    } catch {
      return [k, null] as const;
    }
  }));
  return Object.fromEntries(entries);
}

function nextAuditRef() {
  const year = new Date().getFullYear();
  const seqRaw = Number(localStorage.getItem("dms:audit_seq") || "0");
  const seq = seqRaw + 1;
  localStorage.setItem("dms:audit_seq", String(seq));
  return `AUD-${year}-${String(seq).padStart(4, "0")}`;
}

function reportToBody(run: AuditRun): string {
  const { report, audit, refNo, period, scope } = run;
  const lines: string[] = [];
  lines.push(`AUDIT REPORT — ${audit.title.toUpperCase()}`);
  lines.push(`Reference: ${refNo}    Period: ${period}    Scope: ${scope}`);
  lines.push(`Overall Rating: ${report.rating}    Score: ${report.score}/100`);
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push(report.executiveSummary || "—");
  lines.push("");
  if (report.kpis?.length) {
    lines.push("KEY INDICATORS");
    for (const k of report.kpis) lines.push(`• ${k.label}: ${k.value}${k.note ? ` — ${k.note}` : ""}`);
    lines.push("");
  }
  for (const s of report.sections || []) {
    lines.push(s.heading.toUpperCase());
    lines.push(s.body || "");
    if (s.findings?.length) {
      lines.push("Findings:");
      for (const f of s.findings) lines.push(`  [${f.severity.toUpperCase()}] ${f.text}`);
    }
    lines.push("");
  }
  if (report.risks?.length) {
    lines.push("RISK REGISTER");
    for (const r of report.risks) lines.push(`• ${r.area} — Impact ${r.impact}, Likelihood ${r.likelihood}`);
    lines.push("");
  }
  if (report.recommendations?.length) {
    lines.push("RECOMMENDATIONS");
    for (const rec of report.recommendations) lines.push(`• [${rec.priority}] ${rec.action}${rec.owner ? ` — Owner: ${rec.owner}` : ""}`);
    lines.push("");
  }
  lines.push("CONCLUSION");
  lines.push(report.conclusion || "—");
  return lines.join("\n");
}

function buildPdfOpts(run: AuditRun, signatoryName: string) {
  return {
    refNo: run.refNo,
    date: new Date().toLocaleDateString("en-GB"),
    subject: `${run.audit.title} — ${run.period}`,
    body: reportToBody(run),
    closing: "For Devionic (Private) Limited",
    signatoryName,
    signatoryTitle: "Internal Auditor (AI-assisted)",
  };
}

const AUDIT_SYSTEM_BROWSER = `You are Devionic DMS Internal Auditor — a senior audit & compliance analyst for Devionic (Private) Limited, a Pakistani technology company.
You produce sharp, evidence-based internal audit reports written in clear professional English.

Return STRICT JSON ONLY (no markdown fences, no commentary) matching:
{
  "executiveSummary": string,
  "score": number,
  "rating": "Excellent" | "Good" | "Needs Improvement" | "Poor" | "Critical",
  "kpis": [ { "label": string, "value": string, "note": string } ],
  "sections": [ { "heading": string, "body": string, "findings": [ { "severity": "info"|"low"|"medium"|"high"|"critical", "text": string } ] } ],
  "recommendations": [ { "priority": "P1"|"P2"|"P3", "action": string, "owner": string } ],
  "risks": [ { "area": string, "impact": "Low"|"Medium"|"High", "likelihood": "Low"|"Medium"|"High" } ],
  "conclusion": string
}

Rules: Cite counts/percentages from data. Never fabricate. Use Pakistani context (PKR, FBR, EOBI, PESSI, SECP). No emojis, no disclaimers. Output ONLY the JSON object.`;

function stripFences(t: string) { return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim(); }
function extractAuditJson(text: string): any {
  const t = stripFences(text);
  try { return JSON.parse(t); } catch { /* noop */ }
  const first = t.indexOf("{"); const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) { try { return JSON.parse(t.slice(first, last + 1)); } catch { /* noop */ } }
  throw new Error("AI returned non-JSON response.");
}

async function runAuditInBrowser(ai: ActiveAI, a: AuditDef, scope: string, period: string, data: Record<string, any>): Promise<AuditReport> {
  const snapshot: Record<string, any> = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (Array.isArray(v)) snapshot[k] = { count: v.length, sample: v.slice(0, 8) };
    else snapshot[k] = v;
  }
  const userMsg = [
    `AUDIT TYPE: ${a.title} (${a.id})`,
    a.description ? `DESCRIPTION: ${a.description}` : "",
    a.focus?.length ? `FOCUS AREAS:\n- ${a.focus.join("\n- ")}` : "",
    scope ? `SCOPE: ${scope}` : "",
    period ? `PERIOD: ${period}` : "",
    "",
    "DATA SNAPSHOT (JSON):",
    "```json",
    JSON.stringify(snapshot, null, 2).slice(0, 9000),
    "```",
    "",
    "Produce the audit report as strict JSON per the schema. No markdown, no commentary.",
  ].filter(Boolean).join("\n");
  const messages = [
    { role: "system", content: AUDIT_SYSTEM_BROWSER },
    { role: "user", content: userMsg },
  ];
  const model = ai.model || getProviderDefaultModel(ai.provider);
  const req = buildRequest(ai.provider, ai.apiKey, model, ai.baseUrl, messages);
  if (!["gemini", "google", "anthropic", "claude"].includes(ai.provider)) {
    (req.body as any).response_format = { type: "json_object" };
    (req.body as any).temperature = 0.3;
  }
  const json = await callProvider(req, ai.provider, 55000);
  const raw = req.parse(json) || "";
  const parsed = extractAuditJson(String(raw));
  return {
    executiveSummary: String(parsed.executiveSummary || ""),
    score: Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Number(parsed.score))) : 0,
    rating: String(parsed.rating || "Needs Improvement"),
    kpis: Array.isArray(parsed.kpis) ? parsed.kpis : [],
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    conclusion: String(parsed.conclusion || ""),
  };
}

function AuditPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [q, setQ] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [pickedAuditId, setPickedAuditId] = useState<string>("");
  const [openReport, setOpenReport] = useState<AuditRun | null>(null);
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.toLocaleString("en-GB", { month: "long" })} ${d.getFullYear()}`;
  });
  const [scope, setScope] = useState<string>("Monthly");
  const [saved, setSaved] = useState<GeneratedDoc[]>([]);
  const [activeAI, setActiveAI] = useState<ActiveAI>(() => readActiveAI());
  const runAuditFn = useServerFn(runAuditReport);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) setSaved(generatedDocs.list().filter((r) => r.template_id?.startsWith?.("audit:")));
    };
    const refreshAI = () => setActiveAI(readActiveAI());
    const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 300));
    const cic: any = (window as any).cancelIdleCallback || clearTimeout;
    const id = ric(refresh, { timeout: 900 });
    window.addEventListener("dms:generated_docs:changed", refresh as EventListener);
    window.addEventListener("storage", refreshAI);
    window.addEventListener("focus", refreshAI);
    return () => {
      cancelled = true;
      cic(id);
      window.removeEventListener("dms:generated_docs:changed", refresh as EventListener);
      window.removeEventListener("storage", refreshAI);
      window.removeEventListener("focus", refreshAI);
    };
  }, []);

  const filtered = useMemo(() => {
    return AUDITS.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return a.title.toLowerCase().includes(s) || a.description.toLowerCase().includes(s);
    });
  }, [category, q]);

  const cats = useMemo(() => {
    const counts: Record<string, number> = { all: AUDITS.length };
    for (const a of AUDITS) counts[a.category] = (counts[a.category] || 0) + 1;
    return counts;
  }, []);

  async function startAudit(a: AuditDef) {
    const ai = readActiveAI();
    setActiveAI(ai);
    if (!ai.ready) {
      toast.error(`Configure ${ai.label} in AI Assistant → Providers first.`);
      return;
    }
    setRunningId(a.id);
    const data = await snapshotDataFor(a.dataKeys);
    try {
      let report: AuditReport;
      try {
        report = await runAuditFn({
          data: {
            auditId: a.id,
            auditTitle: a.title,
            auditDescription: a.description,
            focus: a.focus,
            scope,
            period,
            data,
            provider: ai.provider,
            apiKey: ai.apiKey,
            model: ai.model,
            baseUrl: ai.baseUrl,
          },
        });
      } catch (serverErr: any) {
        const rawErr = String(serverErr?.message || serverErr || "").toLowerCase();
        const transportBlocked =
          !rawErr ||
          rawErr.includes("failed to fetch") ||
          rawErr.includes("networkerror") ||
          rawErr.includes("load failed") ||
          rawErr.includes("timed out") ||
          rawErr.includes("unreachable") ||
          rawErr.includes("could not reach");
        // Fallback: for non-Lovable providers we can call the provider API
        // directly from the browser (same pattern as AI chat fallback).
        if (transportBlocked && ai.provider !== "lovable" && ai.apiKey) {
          toast.message("Server route blocked — running audit directly from browser…");
          report = await runAuditInBrowser(ai, a, scope, period, data);
        } else {
          throw serverErr;
        }
      }
      const run: AuditRun = { audit: a, report, refNo: nextAuditRef(), period, scope };
      setOpenReport(run);
      toast.success(`${a.title} completed`);
    } catch (e: any) {
      // Log full error for diagnostics
      // eslint-disable-next-line no-console
      console.error("[audit] runAudit failed:", e);
      const raw = String(e?.message || e?.toString?.() || e || "");
      const low = raw.toLowerCase();
      let msg = raw;
      if (!msg || low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed")) {
        msg = `Could not reach the AI server (${ai.label}). This usually means the request timed out or the provider is unreachable. Try again, pick a lighter audit scope, or switch provider in AI Assistant → Providers.`;
      } else if (low.includes("429")) {
        msg = "AI rate limit hit — please wait a moment and retry.";
      } else if (low.includes("402")) {
        msg = "AI credits exhausted — add credits to continue.";
      } else if (low.includes("non-json")) {
        msg = "AI returned an unparseable response. Retry, or switch to a stronger model in AI Assistant → Providers.";
      }
      toast.error(msg);
    } finally {
      setRunningId(null);
    }
  }

  async function saveReport(run: AuditRun) {
    const opts = buildPdfOpts(run, user?.name || "Devionic Internal Audit");
    generatedDocs.add({
      doc_no: run.refNo,
      title: `${run.audit.title} — ${run.period}`,
      template_id: `audit:${run.audit.id}`,
      template_name: `AI Audit · ${AUDIT_CATEGORY_LABEL[run.audit.category]}`,
      category: "report",
      owner: user?.name || "Internal Audit",
      signatory_title: "Internal Auditor (AI-assisted)",
      date: new Date().toLocaleDateString("en-GB"),
      opts,
    });
    toast.success("Saved to Docs & Records → System generated");
  }
  async function downloadReport(run: AuditRun) {
    try {
      const opts = buildPdfOpts(run, user?.name || "Devionic Internal Audit");
      const { downloadLetterhead } = await loadLetterhead();
      await downloadLetterhead(`${run.audit.id}_${run.refNo}`, opts);
    } catch (e: any) { toast.error(e?.message || "Download failed"); }
  }
  async function printReport(run: AuditRun) {
    try {
      const opts = buildPdfOpts(run, user?.name || "Devionic Internal Audit");
      const { printLetterhead } = await loadLetterhead();
      await printLetterhead(opts);
    } catch (e: any) { toast.error(e?.message || "Print failed"); }
  }
  async function previewReport(run: AuditRun) {
    try {
      const opts = buildPdfOpts(run, user?.name || "Devionic Internal Audit");
      const { previewLetterheadUrl } = await loadLetterhead();
      const url = await previewLetterheadUrl(opts);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) { toast.error(e?.message || "Preview failed"); }
  }

  const catList: (AuditCategory | "all")[] = ["all", "hr", "finance", "commercial", "operations", "governance", "it", "overall"];

  const FEATURED_IDS = [
    "org-health",
    "complete-detailed",
    "financial-health",
    "hr-compliance",
    "project-delivery",
    "it-security",
    "invoice-receivables",
    "crm-health",
  ];
  const featured = useMemo(
    () => FEATURED_IDS.map((id) => AUDITS.find((a) => a.id === id)).filter(Boolean) as AuditDef[],
    []
  );

  return (
    <AppLayout>
      <PageHeader
        title="Audit"
        description={`AI-powered internal audits for ${COMPANY.name}. Choose an audit, review the report on letterhead, and archive it to Docs & Records.`}
      />

      <StatsCards
        stats={[
          { label: "Audit Types", value: AUDITS.length, hint: "AI-ready across all modules", icon: ClipboardCheck },
          { label: "Reports Saved", value: saved.length, hint: "Stored on letterhead", icon: FileText, tint: "oklch(0.68 0.18 155)" },
          { label: "Categories", value: Object.keys(AUDIT_CATEGORY_LABEL).length, hint: "HR, Finance, Ops & more", icon: ListChecks },
          { label: "Active AI", value: activeAI.label, hint: activeAI.model || "—", icon: Sparkles, tint: "oklch(0.68 0.19 300)" },
        ]}
      />

      {/* Active AI banner */}
      <Card className={activeAI.ready ? "border-primary/30 bg-primary/5" : "border-amber-300 bg-amber-50 dark:bg-amber-950/30"}>
        <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-lg grid place-items-center ${activeAI.ready ? "bg-primary/15 text-primary" : "bg-amber-200 text-amber-800"}`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Using AI from AI Assistant</div>
              <div className="text-sm font-semibold truncate">
                {activeAI.label}
                {activeAI.model && <span className="text-muted-foreground font-normal"> · {activeAI.model}</span>}
              </div>
              {!activeAI.ready && (
                <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">API key or model missing — configure it before running audits.</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={activeAI.ready ? "default" : "outline"} className={activeAI.ready ? "" : "border-amber-400 text-amber-700"}>
              {activeAI.ready ? "Ready" : "Not configured"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link to="/ai">Change in AI Assistant</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search + Browse all audits (dropdown with 40+) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Run a new audit</CardTitle>
              <CardDescription>Search {AUDITS.length}+ audit types or pick from the dropdown. Featured audits below.</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-36">
                <label className="text-xs text-muted-foreground">Scope</label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-xs text-muted-foreground">Period</label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Q3 2026" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 3-step: Category → Pick Audit → Run */}
          <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold">1</span>
                Select category
              </label>
              <Select value={category} onValueChange={(v) => { setCategory(v as any); setPickedAuditId(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>
                  {catList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "all" ? `All categories (${AUDITS.length})` : `${AUDIT_CATEGORY_LABEL[c as AuditCategory]} (${cats[c] ?? 0})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold">2</span>
                Pick audit
              </label>
              <Select value={pickedAuditId} onValueChange={setPickedAuditId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={`Pick from ${filtered.length} audits…`} /></SelectTrigger>
                <SelectContent className="max-h-[420px]">
                  {catList.filter((c) => c !== "all").map((c) => {
                    const items = filtered.filter((a) => a.category === c);
                    if (!items.length) return null;
                    return (
                      <div key={c}>
                        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                          {AUDIT_CATEGORY_LABEL[c as AuditCategory]}
                        </div>
                        {items.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                        ))}
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">No audits in this category.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-bold">3</span>
                Run
              </label>
              <Button
                className="mt-1 w-full md:w-auto gap-1.5"
                disabled={!pickedAuditId || !!runningId}
                onClick={() => { const a = AUDITS.find((x) => x.id === pickedAuditId); if (a) startAudit(a); }}
              >
                {runningId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {runningId ? "Running…" : "Run audit"}
              </Button>
            </div>
          </div>

          {pickedAuditId && (() => {
            const a = AUDITS.find((x) => x.id === pickedAuditId);
            if (!a) return null;
            const Icon = ICONS[a.icon] || ClipboardCheck;
            return (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{AUDIT_CATEGORY_LABEL[a.category]} · {a.description}</div>
                </div>
              </div>
            );
          })()}

          {/* Optional search */}
          <div>
            <label className="text-xs text-muted-foreground">Or search all {AUDITS.length} audits</label>
            <div className="relative mt-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or keyword…" />
            </div>
          </div>

          {q && (
            <div className="rounded-lg border bg-muted/20 divide-y max-h-72 overflow-y-auto">
              {filtered.slice(0, 12).map((a) => {
                const Icon = ICONS[a.icon] || ClipboardCheck;
                const busy = runningId === a.id;
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{AUDIT_CATEGORY_LABEL[a.category]} · {a.description}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setPickedAuditId(a.id); setCategory(a.category); setQ(""); }} disabled={busy} className="gap-1 shrink-0">
                      Select
                    </Button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-xs text-muted-foreground text-center">No audits match your search.</div>
              )}
              {filtered.length > 12 && (
                <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">Showing 12 of {filtered.length} — refine your search.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured audits (main 8) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Featured audits
            </h3>
            <p className="text-xs text-muted-foreground">Most-used audits kept handy. All {AUDITS.length} audits are in the dropdown above.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((a) => {
            const Icon = ICONS[a.icon] || ClipboardCheck;
            const busy = runningId === a.id;
            return (
              <Card key={a.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-primary" />
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl grid place-items-center bg-primary/10 text-primary shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{a.title}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-[10px]">{AUDIT_CATEGORY_LABEL[a.category]}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-3">{a.description}</p>
                  <Button className="w-full gap-1" onClick={() => startAudit(a)} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {busy ? "Running…" : "Run audit"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


      {/* Recent saved audits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recent audit reports
            <Badge variant="outline" className="ml-1 text-[10px]">{saved.length}</Badge>
          </CardTitle>
          <CardDescription>Also visible in Docs &amp; Records → System generated.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {saved.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No audit reports saved yet.</div>
          ) : (
            <div className="divide-y">
              {saved.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.doc_no} · {r.template_name} · {r.date}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" title="Preview" onClick={async () => {
                      const { previewLetterheadUrl } = await loadLetterhead();
                      const url = await previewLetterheadUrl(r.opts);
                      window.open(url, "_blank", "noopener,noreferrer");
                      setTimeout(() => URL.revokeObjectURL(url), 60000);
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Download" onClick={async () => {
                      const { downloadLetterhead } = await loadLetterhead();
                      downloadLetterhead(`${r.template_id}_${r.doc_no}`, r.opts);
                    }}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Print" onClick={async () => {
                      const { printLetterhead } = await loadLetterhead();
                      printLetterhead(r.opts);
                    }}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Remove" onClick={() => { generatedDocs.remove(r.id); toast.success("Removed"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openReport && (
        <Suspense fallback={null}>
          <AuditReportDialog
            openReport={openReport}
            onClose={() => setOpenReport(null)}
            onPreview={previewReport}
            onPrint={printReport}
            onDownload={downloadReport}
            onSave={saveReport}
          />
        </Suspense>
      )}
    </AppLayout>
  );
}

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit — Devionic DMS" }] }),
  component: AuditPage,
});
