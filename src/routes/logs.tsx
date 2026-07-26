import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText, LogIn, Activity, Server, ShieldAlert, Mail, CheckCircle2, XCircle, Search, Download, ShieldOff, AlertTriangle,
} from "lucide-react";

import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db-client";

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "System Logs — Devionic DMS" }] }),
  component: LogsPage,
});

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
}

function humanDuration(sec?: number | null) {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : "", `${s}s`].filter(Boolean).join(" ");
}

function toCsv(rows: any[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function downloadCsv(name: string, rows: any[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function useLogs(table: string, filter?: (q: any) => any) {
  return useQuery({
    queryKey: ["logs", table],
    queryFn: async () => {
      let q = db.from(table as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (table === "user_login_logs") q = db.from(table as any).select("*").order("login_at", { ascending: false }).limit(500);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 15_000,
  });
}

function SeverityBadge({ level }: { level?: string }) {
  const l = (level || "info").toLowerCase();
  const cls =
    l === "error" || l === "critical" ? "bg-red-100 text-red-700 border-red-200" :
    l === "warn" || l === "warning" ? "bg-amber-100 text-amber-700 border-amber-200" :
    l === "success" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={cls}>{l}</Badge>;
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const cls =
    s === "success" || s === "sent" || s === "verified" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    s === "failed" || s === "expired" ? "bg-red-100 text-red-700 border-red-200" :
    s === "queued" ? "bg-amber-100 text-amber-700 border-amber-200" :
    "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge variant="outline" className={cls}>{status || "—"}</Badge>;
}

function useSearch<T>(rows: T[], keys: (keyof T)[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      keys.some((k) => String((r as any)[k] ?? "").toLowerCase().includes(q))
    );
  }, [rows, keys, query]);
}

function LoginLogsView({ mode }: { mode: "all" | "success" | "failed" }) {
  const { data = [], isLoading } = useLogs("user_login_logs");
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (mode === "all") return data;
    const target = mode === "success" ? "success" : "failed";
    return data.filter((r) => (r.status || "").toLowerCase() === target);
  }, [data, mode]);
  const rows = useSearch(filtered, ["email", "username", "full_name", "ip_address", "device", "browser", "os", "city", "country"] as any, q);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2">
          <LogIn className="h-4 w-4" /> {mode === "success" ? "Successful Logins" : mode === "failed" ? "Failed Logins" : "All Login Logs"}
          <span className="text-xs text-muted-foreground font-normal">({rows.length})</span>
        </CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, IP, device…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`login-logs-${mode}`, rows)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Login At</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Logout At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !rows.length && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No records.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.login_at)}</TableCell>
                  <TableCell className="text-xs">{r.full_name || r.username || "—"}</TableCell>
                  <TableCell className="text-xs">{r.email || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ip_address || "—"}</TableCell>
                  <TableCell className="text-xs">{[r.device, r.browser, r.os].filter(Boolean).join(" · ") || "—"}</TableCell>
                  <TableCell className="text-xs">{[r.city, r.country].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{humanDuration(r.duration_seconds)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.logout_at)}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLogsView() {
  const { data = [], isLoading } = useLogs("user_activity_logs");
  const [q, setQ] = useState("");
  const rows = useSearch(data, ["action", "module", "description", "username", "full_name", "ip_address"] as any, q);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Logs <span className="text-xs text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, module, user…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("activity-logs", rows)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !rows.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No activity yet.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.full_name || r.username || "—"}</TableCell>
                  <TableCell className="text-xs">{r.module || "—"}</TableCell>
                  <TableCell className="text-xs"><Badge variant="secondary">{r.action || "—"}</Badge></TableCell>
                  <TableCell className="text-xs max-w-md truncate">{r.description || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ip_address || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemLogsView() {
  const { data = [], isLoading } = useLogs("system_logs");
  const [q, setQ] = useState("");
  const rows = useSearch(data, ["source", "message", "level"] as any, q);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><Server className="h-4 w-4" /> System Logs <span className="text-xs text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search source, message…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("system-logs", rows)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !rows.length && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No system events yet.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.created_at)}</TableCell>
                  <TableCell><SeverityBadge level={r.level} /></TableCell>
                  <TableCell className="text-xs">{r.source || "—"}</TableCell>
                  <TableCell className="text-xs max-w-lg truncate">{r.message}</TableCell>
                  <TableCell className="text-xs font-mono max-w-xs truncate">{r.meta ? JSON.stringify(r.meta) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function OtpLogsView() {
  const { data = [], isLoading } = useLogs("otp_logs");
  const [q, setQ] = useState("");
  const rows = useSearch(data, ["email", "ip_address", "purpose", "status", "message"] as any, q);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> OTP Logs <span className="text-xs text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, IP…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("otp-logs", rows)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !rows.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No OTP events yet.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.email || "—"}</TableCell>
                  <TableCell className="text-xs">{r.purpose || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ip_address || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{r.message || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailLogsView() {
  const { data = [], isLoading } = useLogs("email_logs");
  const [q, setQ] = useState("");
  const rows = useSearch(data, ["to_email", "from_email", "subject", "category", "provider", "status"] as any, q);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Email Logs <span className="text-xs text-muted-foreground font-normal">({rows.length})</span></CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient, subject…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("email-logs", rows)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !rows.length && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No email events yet.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="text-xs">{r.to_email}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{r.subject || "—"}</TableCell>
                  <TableCell className="text-xs">{r.category || "—"}</TableCell>
                  <TableCell className="text-xs">{r.provider || "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-red-600 max-w-xs truncate">{r.error || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorLogsView() {
  const sys = useLogs("system_logs");
  const email = useLogs("email_logs");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const out: any[] = [];
    for (const r of (sys.data || [])) {
      const level = String(r.level || "").toLowerCase();
      if (level !== "error" && level !== "critical") continue;
      out.push({
        id: `sys-${r.id}`,
        at: r.created_at,
        severity: level,
        source: r.source || "system",
        message: r.message,
        detail: r.meta ? JSON.stringify(r.meta) : "",
      });
    }
    for (const r of (email.data || [])) {
      if (String(r.status || "").toLowerCase() !== "failed") continue;
      out.push({
        id: `email-${r.id}`,
        at: r.created_at,
        severity: "error",
        source: `email:${r.provider || "smtp"}`,
        message: `Failed to send "${r.subject || "email"}" to ${r.to_email}`,
        detail: r.error || "",
      });
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [sys.data, email.data]);

  const filtered = useSearch(rows, ["source", "message", "detail", "severity"] as any, q);
  const isLoading = sys.isLoading || email.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" /> System Errors
          <span className="text-xs text-muted-foreground font-normal">({filtered.length})</span>
        </CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search source, message…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("error-logs", filtered)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !filtered.length && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No errors captured. ✅</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.at)}</TableCell>
                  <TableCell><SeverityBadge level={r.severity} /></TableCell>
                  <TableCell className="text-xs">{r.source}</TableCell>
                  <TableCell className="text-xs max-w-lg truncate" title={r.message}>{r.message}</TableCell>
                  <TableCell className="text-xs font-mono max-w-xs truncate" title={r.detail}>{r.detail || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function UnauthorizedAccessView() {
  const login = useLogs("user_login_logs");
  const otp = useLogs("otp_logs");
  const sys = useLogs("system_logs");
  const activity = useLogs("user_activity_logs");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const out: any[] = [];
    // 1) Failed / blocked logins
    for (const r of (login.data || [])) {
      const status = String(r.status || "").toLowerCase();
      const reason = String(r.failure_reason || r.reason || r.message || "").toLowerCase();
      const suspicious = status === "failed" || status === "blocked" || status === "locked" ||
        /lock|block|unauthor|forbid|invalid|denied|brute|suspend/.test(reason);
      if (!suspicious) continue;
      out.push({
        id: `login-${r.id}`,
        at: r.login_at || r.created_at,
        category: "Login",
        actor: r.email || r.username || r.full_name || "unknown",
        ip: r.ip_address || "",
        device: [r.device, r.browser, r.os].filter(Boolean).join(" · "),
        detail: r.failure_reason || r.reason || r.message || `Login ${status}`,
        severity: status === "blocked" || status === "locked" || /lock|block|brute/.test(reason) ? "critical" : "error",
      });
    }
    // 2) OTP failures (bad codes / IP verification failures)
    for (const r of (otp.data || [])) {
      const status = String(r.status || "").toLowerCase();
      if (!(status === "failed" || status === "expired" || status === "invalid")) continue;
      out.push({
        id: `otp-${r.id}`,
        at: r.created_at,
        category: "OTP",
        actor: r.email || "unknown",
        ip: r.ip_address || "",
        device: "",
        detail: `${r.purpose || "OTP"} — ${r.message || status}`,
        severity: status === "expired" ? "warning" : "error",
      });
    }
    // 3) System logs flagged as security / unauthorized / critical
    for (const r of (sys.data || [])) {
      const src = String(r.source || "").toLowerCase();
      const level = String(r.level || "").toLowerCase();
      const msg = String(r.message || "").toLowerCase();
      const hit = /security|unauthor|forbid|denied|intrusion|access|rls/.test(src + " " + msg);
      if (!hit && level !== "critical") continue;
      out.push({
        id: `sys-${r.id}`,
        at: r.created_at,
        category: "System",
        actor: r.auth_user_id || "system",
        ip: (r.meta && (r.meta.ip || r.meta.ip_address)) || "",
        device: (r.meta && r.meta.device) || "",
        detail: r.message,
        severity: level === "critical" ? "critical" : (level === "error" ? "error" : "warning"),
      });
    }
    // 4) Activity logs marked denied/unauthorized
    for (const r of (activity.data || [])) {
      const action = String(r.action || "").toLowerCase();
      const target = String(r.target || r.resource || "").toLowerCase();
      const detail = String(r.details || r.message || "").toLowerCase();
      if (!/unauthor|denied|forbid|blocked|violation/.test(action + " " + target + " " + detail)) continue;
      out.push({
        id: `act-${r.id}`,
        at: r.created_at,
        category: "Activity",
        actor: r.user_email || r.username || r.user_id || "unknown",
        ip: r.ip_address || "",
        device: r.device || "",
        detail: r.details || r.message || r.action,
        severity: "error",
      });
    }
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [login.data, otp.data, sys.data, activity.data]);

  const filtered = useSearch(rows, ["actor", "ip", "device", "detail", "category"] as any, q);
  const isLoading = login.isLoading || otp.isLoading || sys.isLoading || activity.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-red-600" /> Unauthorized System Access
          <span className="text-xs text-muted-foreground font-normal">({filtered.length})</span>
        </CardTitle>
        <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, IP, detail…" className="pl-7 h-8 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("unauthorized-access", filtered)}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[65vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && !filtered.length && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No unauthorized access attempts detected. ✅</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDate(r.at)}</TableCell>
                  <TableCell><SeverityBadge level={r.severity} /></TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell className="text-xs">{r.actor}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ip || "—"}</TableCell>
                  <TableCell className="text-xs">{r.device || "—"}</TableCell>
                  <TableCell className="text-xs max-w-lg truncate" title={r.detail}>{r.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiRow() {

  const login = useLogs("user_login_logs");
  const activity = useLogs("user_activity_logs");
  const otp = useLogs("otp_logs");
  const email = useLogs("email_logs");
  const sys = useLogs("system_logs");
  const l = login.data || [];
  const successCount = l.filter((r: any) => (r.status || "").toLowerCase() === "success").length;
  const failedCount = l.filter((r: any) => (r.status || "").toLowerCase() === "failed").length;
  const errCount = (sys.data || []).filter((r: any) => ["error", "critical"].includes((r.level || "").toLowerCase())).length;
  const unauthCount =
    l.filter((r: any) => ["failed", "blocked", "locked"].includes((r.status || "").toLowerCase())).length +
    (otp.data || []).filter((r: any) => ["failed", "expired", "invalid"].includes((r.status || "").toLowerCase())).length;

  const items = [
    { label: "Successful Logins", value: successCount, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Failed Logins", value: failedCount, icon: XCircle, color: "text-red-600" },
    { label: "Unauthorized Attempts", value: unauthCount, icon: ShieldOff, color: "text-red-600" },
    { label: "Activity Events", value: (activity.data || []).length, icon: Activity, color: "text-sky-600" },
    { label: "OTP Events", value: (otp.data || []).length, icon: ShieldAlert, color: "text-amber-600" },
    { label: "Emails", value: (email.data || []).length, icon: Mail, color: "text-violet-600" },
    { label: "System Errors", value: errCount, icon: Server, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((k) => (
        <Card key={k.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </div>
              <k.icon className={`h-6 w-6 ${k.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LogsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="System Logs"
        description="Login sessions, activity, OTP, email delivery and system events — all connected to Audit & AI Assistant."
      />
      <KpiRow />
      <Tabs defaultValue="login">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="login"><LogIn className="h-3.5 w-3.5 mr-1" />Login Logs</TabsTrigger>
          <TabsTrigger value="success"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Successful</TabsTrigger>
          <TabsTrigger value="failed"><XCircle className="h-3.5 w-3.5 mr-1" />Failed</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-3.5 w-3.5 mr-1" />Activity</TabsTrigger>
          <TabsTrigger value="otp"><ShieldAlert className="h-3.5 w-3.5 mr-1" />OTP</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="system"><Server className="h-3.5 w-3.5 mr-1" />System</TabsTrigger>
          <TabsTrigger value="unauth"><ShieldOff className="h-3.5 w-3.5 mr-1 text-red-600" />Unauthorized</TabsTrigger>
          <TabsTrigger value="errors"><AlertTriangle className="h-3.5 w-3.5 mr-1 text-red-600" />Errors</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="mt-4"><LoginLogsView mode="all" /></TabsContent>
        <TabsContent value="success" className="mt-4"><LoginLogsView mode="success" /></TabsContent>
        <TabsContent value="failed" className="mt-4"><LoginLogsView mode="failed" /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityLogsView /></TabsContent>
        <TabsContent value="otp" className="mt-4"><OtpLogsView /></TabsContent>
        <TabsContent value="email" className="mt-4"><EmailLogsView /></TabsContent>
        <TabsContent value="system" className="mt-4"><SystemLogsView /></TabsContent>
        <TabsContent value="unauth" className="mt-4"><UnauthorizedAccessView /></TabsContent>
        <TabsContent value="errors" className="mt-4"><ErrorLogsView /></TabsContent>


      </Tabs>
    </AppLayout>
  );
}
