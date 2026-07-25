import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards, type Stat } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays, Check, X, Plus, Trash2, Palmtree, Clock3, CheckCircle2,
  XCircle, CalendarCheck, Users, Pencil, ChevronLeft, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/leaves")({
  head: () => ({ meta: [{ title: "Leaves & Holidays — Devionic DMS" }] }),
  component: LeavesPage,
});

// ---------- helpers ----------
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};
const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${map[s] ?? map.pending}`}>{s}</span>;
};

// ---------- types ----------
type LeaveType = { id: string; name: string; code: string | null; color: string | null; default_days: number; paid: boolean; description: string | null; active: boolean };
type LeaveRequest = {
  id: string; employee_id: string; employee_name: string | null;
  leave_type_id: string | null; leave_type_name: string | null;
  start_date: string; end_date: string; days: number; half_day: boolean;
  reason: string | null; status: string; applied_at: string;
  reviewed_at: string | null; reviewer: string | null; reviewer_comment: string | null;
};
type LeaveBalance = { id: string; employee_id: string; leave_type_id: string; year: number; allocated: number; used: number; carried_forward: number };
type Holiday = { id: string; name: string; holiday_date: string; type: string; recurring: boolean; description: string | null; color: string | null };
type Employee = { id: string | number; name: string };

// ============================================================
function LeavesPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Leaves & Holidays"
        description="Manage leave requests, balances, and the company holiday calendar."
        actions={
          <ModuleReportButton
            build={async () => {
              const [reqRes, holRes, balRes] = await Promise.all([
                supabase.from("leave_requests").select("*").order("applied_at", { ascending: false }),
                supabase.from("holidays").select("*").order("holiday_date"),
                supabase.from("leave_balances").select("*"),
              ]);
              const reqs = (reqRes.data ?? []) as any[];
              const hols = (holRes.data ?? []) as any[];
              const bals = (balRes.data ?? []) as any[];
              const pending = reqs.filter((r) => r.status === "pending").length;
              const approved = reqs.filter((r) => r.status === "approved").length;
              return {
                module: "leaves",
                moduleLabel: "Leaves & Holidays",
                title: "Leaves & Holidays Report",
                subtitle: `${reqs.length} request(s) · ${hols.length} holiday(s)`,
                meta: [
                  { label: "Pending", value: String(pending) },
                  { label: "Approved", value: String(approved) },
                  { label: "Holidays", value: String(hols.length) },
                ],
                sections: [
                  {
                    title: "Leave Requests",
                    columns: [
                      { key: "employee_name", label: "Employee" },
                      { key: "leave_type_name", label: "Type" },
                      { key: "start_date", label: "From" },
                      { key: "end_date", label: "To" },
                      { key: "days", label: "Days" },
                      { key: "status", label: "Status" },
                      { key: "reason", label: "Reason" },
                    ],
                    rows: reqs,
                  },
                  {
                    title: "Leave Balances",
                    columns: [
                      { key: "employee_id", label: "Employee" },
                      { key: "leave_type_id", label: "Type" },
                      { key: "year", label: "Year" },
                      { key: "allocated", label: "Allocated" },
                      { key: "used", label: "Used" },
                      { key: "carried_forward", label: "C/F" },
                    ],
                    rows: bals,
                  },
                  {
                    title: "Holidays",
                    columns: [
                      { key: "holiday_date", label: "Date" },
                      { key: "name", label: "Name" },
                      { key: "type", label: "Type" },
                      { key: "recurring", label: "Recurring", format: (v) => v ? "Yes" : "No" },
                    ],
                    rows: hols,
                  },
                ],
              };
            }}
          />
        }
      />
      <LeavesKpis />
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="requests"><Clock3 className="h-4 w-4 mr-1.5" />Requests</TabsTrigger>
          <TabsTrigger value="balances"><Users className="h-4 w-4 mr-1.5" />Balances</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="setup"><Palmtree className="h-4 w-4 mr-1.5" />Holidays & Types</TabsTrigger>
        </TabsList>
        <TabsContent value="requests"><RequestsTab /></TabsContent>
        <TabsContent value="balances"><BalancesTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="setup"><SetupTab /></TabsContent>
      </Tabs>
      <ModuleReportsCard module="leaves" />
    </AppLayout>
  );
}

// ---------- shared hooks ----------
function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_types").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as LeaveType[];
    },
  });
}
function useEmployees() {
  return useQuery({
    queryKey: ["employees-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Employee[];
    },
  });
}
function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("holidays").select("*").order("holiday_date");
      if (error) throw error;
      return (data ?? []) as Holiday[];
    },
  });
}
function useRequests() {
  return useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*").order("applied_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaveRequest[];
    },
  });
}
function useBalances() {
  return useQuery({
    queryKey: ["leave_balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_balances").select("*");
      if (error) throw error;
      return (data ?? []) as LeaveBalance[];
    },
  });
}

// ---------- KPIs ----------
function LeavesKpis() {
  const reqs = useRequests();
  const hols = useHolidays();
  const rows = reqs.data ?? [];
  const yr = new Date().getFullYear();
  const thisYear = rows.filter((r) => r.start_date.startsWith(String(yr)));
  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = thisYear.filter((r) => r.status === "approved").length;
  const rejected = thisYear.filter((r) => r.status === "rejected").length;
  const upcomingHols = (hols.data ?? []).filter((h) => h.holiday_date >= todayISO()).length;
  const stats: Stat[] = [
    { label: "Pending Requests", value: pending, icon: Clock3, hint: "Awaiting approval", tint: "oklch(0.72 0.18 55)" },
    { label: "Approved (YTD)", value: approved, icon: CheckCircle2, hint: `${yr}`, tint: "oklch(0.68 0.18 155)" },
    { label: "Rejected (YTD)", value: rejected, icon: XCircle, hint: `${yr}`, tint: "oklch(0.65 0.2 25)" },
    { label: "Upcoming Holidays", value: upcomingHols, icon: Palmtree, hint: "From today", tint: "oklch(0.55 0.22 275)" },
  ];
  return <StatsCards stats={stats} />;
}

// ============================================================
// REQUESTS TAB
// ============================================================
function RequestsTab() {
  const qc = useQueryClient();
  const reqs = useRequests();
  const types = useLeaveTypes();
  const emps = useEmployees();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const rows = (reqs.data ?? []).filter((r) => filter === "all" || r.status === filter);

  const review = useMutation({
    mutationFn: async ({ id, status, comment, req }: { id: string; status: "approved" | "rejected"; comment: string; req: LeaveRequest }) => {
      const { error } = await supabase.from("leave_requests").update({
        status, reviewer_comment: comment, reviewed_at: new Date().toISOString(),
        reviewer: "Admin",
      }).eq("id", id);
      if (error) throw error;

      // On approval, increment used balance for that employee/type/year
      if (status === "approved" && req.leave_type_id) {
        const year = new Date(req.start_date).getFullYear();
        const { data: existing } = await supabase.from("leave_balances")
          .select("*").eq("employee_id", req.employee_id).eq("leave_type_id", req.leave_type_id).eq("year", year).maybeSingle();
        if (existing) {
          await supabase.from("leave_balances").update({ used: Number(existing.used) + Number(req.days) }).eq("id", existing.id);
        } else {
          const t = (types.data ?? []).find((x) => x.id === req.leave_type_id);
          await supabase.from("leave_balances").insert({
            employee_id: req.employee_id, leave_type_id: req.leave_type_id, year,
            allocated: t?.default_days ?? 0, used: req.days,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      qc.invalidateQueries({ queryKey: ["leave_balances"] });
      toast.success("Request updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Deleted"); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle className="flex-1 text-base">Leave Requests</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Apply for Leave</Button>
          </DialogTrigger>
          <NewRequestDialog employees={emps.data ?? []} types={types.data ?? []} onDone={() => setOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reqs.isLoading && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!reqs.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No leave requests.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employee_name || "—"}</TableCell>
                  <TableCell>{r.leave_type_name || "—"}{r.half_day && <span className="ml-1 text-[10px] text-muted-foreground">(½)</span>}</TableCell>
                  <TableCell className="text-xs">{fmt(r.start_date)}</TableCell>
                  <TableCell className="text-xs">{fmt(r.end_date)}</TableCell>
                  <TableCell><Badge variant="secondary">{r.days}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-xs" title={r.reason ?? ""}>{r.reason || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(r.applied_at)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => review.mutate({ id: r.id, status: "approved", comment: "", req: r })}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const c = prompt("Reason for rejection?") ?? "";
                              review.mutate({ id: r.id, status: "rejected", comment: c, req: r });
                            }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-red-700"
                        onClick={() => { if (confirm("Delete this request?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function NewRequestDialog({ employees, types, onDone }: { employees: Employee[]; types: LeaveType[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [empId, setEmpId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const days = halfDay ? 0.5 : daysBetween(start, end);

  const create = useMutation({
    mutationFn: async () => {
      if (!empId) throw new Error("Select an employee");
      if (!typeId) throw new Error("Select a leave type");
      if (end < start) throw new Error("End date must be on/after start date");
      const emp = employees.find((e) => String(e.id) === empId);
      const t = types.find((x) => x.id === typeId);
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: empId, employee_name: emp?.name ?? null,
        leave_type_id: typeId, leave_type_name: t?.name ?? null,
        start_date: start, end_date: end, days, half_day: halfDay, reason,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request submitted");
      onDone();
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit"),
  });

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Leave Type</Label>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
            <SelectContent>{types.filter((t) => t.active).map((t) => <SelectItem key={t.id} value={t.id}>{t.name} {t.paid ? "" : "(Unpaid)"}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>From</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>To</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} disabled={halfDay} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={halfDay} onChange={(e) => { setHalfDay(e.target.checked); if (e.target.checked) setEnd(start); }} />
          Half day
        </label>
        <div className="grid gap-1.5"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional details for approver" /></div>
        <div className="rounded-md bg-muted p-2 text-sm">Total: <b>{days}</b> day(s)</div>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// BALANCES TAB
// ============================================================
function BalancesTab() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const emps = useEmployees();
  const types = useLeaveTypes();
  const bals = useBalances();

  const seed = useMutation({
    mutationFn: async () => {
      const employees = emps.data ?? [];
      const activeTypes = (types.data ?? []).filter((t) => t.active);
      const existing = new Set((bals.data ?? []).map((b) => `${b.employee_id}|${b.leave_type_id}|${b.year}`));
      const rows: any[] = [];
      for (const e of employees) for (const t of activeTypes) {
        const key = `${e.id}|${t.id}|${year}`;
        if (existing.has(key)) continue;
        rows.push({ employee_id: e.id, leave_type_id: t.id, year, allocated: t.default_days, used: 0 });
      }
      if (!rows.length) return 0;
      const { error } = await supabase.from("leave_balances").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["leave_balances"] }); toast.success(`Seeded ${n} balance row(s)`); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const updateAlloc = useMutation({
    mutationFn: async ({ id, allocated }: { id: string; allocated: number }) => {
      const { error } = await supabase.from("leave_balances").update({ allocated }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_balances"] }),
  });

  const typeById = useMemo(() => new Map((types.data ?? []).map((t) => [t.id, t])), [types.data]);
  const byEmp = useMemo(() => {
    const map = new Map<string, LeaveBalance[]>();
    for (const b of (bals.data ?? [])) {
      if (b.year !== year) continue;
      const arr = map.get(b.employee_id) ?? [];
      arr.push(b); map.set(b.employee_id, arr);
    }
    return map;
  }, [bals.data, year]);

  const activeTypes = (types.data ?? []).filter((t) => t.active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle className="flex-1 text-base">Leave Balances</CardTitle>
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="w-24 h-9" />
        <Button size="sm" variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Seed for {year}
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Employee</TableHead>
              {activeTypes.map((t) => <TableHead key={t.id} className="text-center">{t.code || t.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(emps.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="sticky left-0 bg-background font-medium">{e.name}</TableCell>
                {activeTypes.map((t) => {
                  const b = (byEmp.get(String(e.id)) ?? []).find((x) => x.leave_type_id === t.id);
                  const remaining = b ? Number(b.allocated) - Number(b.used) + Number(b.carried_forward || 0) : (t.default_days);
                  return (
                    <TableCell key={t.id} className="text-center">
                      {b ? (
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold">{remaining}</div>
                          <div className="text-[10px] text-muted-foreground">{b.used}/{b.allocated}</div>
                          <input
                            type="number"
                            defaultValue={b.allocated}
                            className="w-14 text-[11px] text-center border rounded px-1 py-0.5 mt-0.5"
                            title="Allocated days (edit to override)"
                            onBlur={(ev) => {
                              const v = Number(ev.target.value);
                              if (!Number.isNaN(v) && v !== Number(b.allocated)) updateAlloc.mutate({ id: b.id, allocated: v });
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {(emps.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={activeTypes.length + 1} className="text-center py-8 text-muted-foreground">No employees yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================
// CALENDAR TAB
// ============================================================
function CalendarTab() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const hols = useHolidays();
  const reqs = useRequests();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date | null; iso: string }[] = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null, iso: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ date: dt, iso: dt.toISOString().slice(0, 10) });
  }

  const holByDate = useMemo(() => {
    const m = new Map<string, Holiday[]>();
    for (const h of (hols.data ?? [])) {
      const arr = m.get(h.holiday_date) ?? []; arr.push(h); m.set(h.holiday_date, arr);
    }
    return m;
  }, [hols.data]);

  const leaveByDate = useMemo(() => {
    const m = new Map<string, LeaveRequest[]>();
    for (const r of (reqs.data ?? [])) {
      if (r.status !== "approved") continue;
      const s = new Date(r.start_date); const e = new Date(r.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        const arr = m.get(iso) ?? []; arr.push(r); m.set(iso, arr);
      }
    }
    return m;
  }, [reqs.data]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayIso = todayISO();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> {monthLabel}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</Button>
        <Button size="sm" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-muted-foreground uppercase mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c.date) return <div key={i} className="h-24 rounded bg-muted/20" />;
            const isToday = c.iso === todayIso;
            const h = holByDate.get(c.iso) || [];
            const l = leaveByDate.get(c.iso) || [];
            const dow = c.date.getDay();
            const weekend = dow === 0 || dow === 6;
            return (
              <div key={i} className={`h-24 rounded border p-1.5 overflow-hidden text-xs ${isToday ? "border-primary bg-primary/5" : "border-border"} ${weekend ? "bg-muted/30" : "bg-background"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${isToday ? "text-primary" : ""}`}>{c.date.getDate()}</span>
                  {h.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Holiday" />}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {h.slice(0, 1).map((x) => (
                    <div key={x.id} className="truncate rounded px-1 py-0.5 text-[10px] font-semibold" style={{ background: (x.color || "#ef4444") + "22", color: x.color || "#ef4444" }} title={x.name}>{x.name}</div>
                  ))}
                  {l.slice(0, 2).map((r) => (
                    <div key={r.id} className="truncate rounded bg-emerald-100 text-emerald-800 px-1 py-0.5 text-[10px]" title={`${r.employee_name} — ${r.leave_type_name}`}>{r.employee_name}</div>
                  ))}
                  {(l.length > 2) && <div className="text-[10px] text-muted-foreground">+{l.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Holiday</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved leave</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted" /> Weekend</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SETUP TAB — Holidays + Leave Types
// ============================================================
function SetupTab() {
  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <HolidaysCard />
      <LeaveTypesCard />
    </div>
  );
}

function HolidaysCard() {
  const qc = useQueryClient();
  const hols = useHolidays();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Holiday | null>(null);
  const [form, setForm] = useState({ name: "", holiday_date: todayISO(), type: "public", recurring: false, description: "", color: "#ef4444" });

  useEffect(() => {
    if (edit) setForm({ name: edit.name, holiday_date: edit.holiday_date, type: edit.type, recurring: edit.recurring, description: edit.description ?? "", color: edit.color ?? "#ef4444" });
    else setForm({ name: "", holiday_date: todayISO(), type: "public", recurring: false, description: "", color: "#ef4444" });
  }, [edit, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      if (edit) {
        const { error } = await supabase.from("holidays").update(form).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("holidays").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["holidays"] }); toast.success("Saved"); setOpen(false); setEdit(null); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("holidays").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["holidays"] }); toast.success("Deleted"); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base flex items-center gap-2"><Palmtree className="h-4 w-4" /> Holiday Calendar</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Holiday</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Holiday</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} /></div>
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="religious">Religious</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10" /></div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurring annually
                </label>
              </div>
              <div className="grid gap-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 max-h-[420px] overflow-y-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(hols.data ?? []).map((h) => (
              <TableRow key={h.id}>
                <TableCell className="whitespace-nowrap text-xs">{fmt(h.holiday_date)}</TableCell>
                <TableCell className="font-medium"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: h.color ?? "#ef4444" }} />{h.name}</span></TableCell>
                <TableCell className="capitalize text-xs">{h.type}{h.recurring && <span className="ml-1 text-[10px] text-muted-foreground">(yearly)</span>}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEdit(h); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 text-red-700" onClick={() => { if (confirm("Delete holiday?")) del.mutate(h.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {(hols.data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No holidays yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeaveTypesCard() {
  const qc = useQueryClient();
  const types = useLeaveTypes();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({ name: "", code: "", color: "#3b82f6", default_days: 0, paid: true, description: "", active: true });

  useEffect(() => {
    if (edit) setForm({ name: edit.name, code: edit.code ?? "", color: edit.color ?? "#3b82f6", default_days: Number(edit.default_days), paid: edit.paid, description: edit.description ?? "", active: edit.active });
    else setForm({ name: "", code: "", color: "#3b82f6", default_days: 0, paid: true, description: "", active: true });
  }, [edit, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      if (edit) {
        const { error } = await supabase.from("leave_types").update(form).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leave_types").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_types"] }); toast.success("Saved"); setOpen(false); setEdit(null); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("leave_types").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_types"] }); toast.success("Deleted"); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="flex-1 text-base">Leave Types</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(null); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Type</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{edit ? "Edit" : "Add"} Leave Type</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="AL" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5"><Label>Default days/yr</Label><Input type="number" value={form.default_days} onChange={(e) => setForm({ ...form, default_days: Number(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label>Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10" /></div>
                <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> Paid</label>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
              <div className="grid gap-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 max-h-[420px] overflow-y-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Code</TableHead><TableHead className="text-right">Days/yr</TableHead><TableHead>Paid</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(types.data ?? []).map((t) => (
              <TableRow key={t.id} className={!t.active ? "opacity-50" : ""}>
                <TableCell className="font-medium"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: t.color ?? "#3b82f6" }} />{t.name}</span></TableCell>
                <TableCell className="text-xs">{t.code || "—"}</TableCell>
                <TableCell className="text-right">{Number(t.default_days)}</TableCell>
                <TableCell className="text-xs">{t.paid ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEdit(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 text-red-700" onClick={() => { if (confirm("Delete type?")) del.mutate(t.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {(types.data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No leave types.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
