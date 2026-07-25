import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Users, UserCheck, ClipboardList, Briefcase, PhoneCall, Eye, Mail, Phone, MapPin, Gauge } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { StatsCards } from "@/components/dms/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { resources, type Employee } from "@/lib/api";
import { fmtPKR } from "@/lib/pk";

const STATUS_TINT: Record<string, string> = {
  active: "oklch(0.68 0.18 155)",
  inactive: "oklch(0.65 0.02 250)",
  on_leave: "oklch(0.72 0.16 90)",
};

const ATT_TINT: Record<string, string> = {
  present: "oklch(0.68 0.18 155)",
  late: "oklch(0.72 0.16 90)",
  absent: "oklch(0.65 0.18 25)",
  leave: "oklch(0.72 0.13 250)",
};

const TASK_TINT: Record<string, string> = {
  todo: "oklch(0.65 0.02 250)",
  in_progress: "oklch(0.72 0.16 210)",
  review: "oklch(0.72 0.16 90)",
  done: "oklch(0.68 0.18 155)",
};

function match(name: string | undefined, e: Employee) {
  const k = (name ?? "").toLowerCase().trim();
  return !!k && k === e.name.toLowerCase().trim();
}

function EmployeesHistoryPage() {
  const empsQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const attQ = useQuery({ queryKey: ["attendance"], queryFn: resources.attendance.list });
  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: resources.tasks.list });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });
  const feedbackQ = useQuery({ queryKey: ["feedback_calls"], queryFn: resources.feedbackCalls.list });

  const employees = empsQ.data ?? [];
  const attendance = attQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const feedback = feedbackQ.data ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<Employee | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => employees.map((e) => {
    const att = attendance.filter((a) => a.employee_id === e.id || match(a.employee_name, e));
    const present = att.filter((a) => a.status === "present").length;
    const late = att.filter((a) => a.status === "late").length;
    const absent = att.filter((a) => a.status === "absent").length;
    const leave = att.filter((a) => a.status === "leave").length;

    const empTasks = tasks.filter((t) => match(t.assignee, e));
    const done = empTasks.filter((t) => t.status === "done").length;
    const overdue = empTasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length;

    const managed = projects.filter((p) => match(p.manager, e));
    const calls = feedback.filter((f) => f.called_by_employee_id === e.id || match(f.called_by_name, e));

    // Performance score (0-100) — blends attendance, task completion, project delivery, feedback score
    const attTotal = present + late + absent + leave;
    const attScore = attTotal ? ((present + late * 0.5) / attTotal) * 100 : 0;
    const taskTotal = empTasks.length;
    const taskScore = taskTotal ? ((done - overdue) / taskTotal) * 100 : 0;
    const deliveredProjects = managed.filter((p) => p.status === "completed").length;
    const projScore = managed.length ? (deliveredProjects / managed.length) * 100 : 0;
    const avgCall = calls.length ? calls.reduce((s, c) => s + Number(c.total_score ?? 0), 0) / calls.length : 0;
    const callScore = calls.length ? (avgCall / 25) * 100 : 0;

    const weighted =
      (attTotal ? attScore * 0.30 : 0) +
      (taskTotal ? taskScore * 0.35 : 0) +
      (managed.length ? projScore * 0.20 : 0) +
      (calls.length ? callScore * 0.15 : 0);
    const weightSum =
      (attTotal ? 0.30 : 0) + (taskTotal ? 0.35 : 0) + (managed.length ? 0.20 : 0) + (calls.length ? 0.15 : 0);
    const performance = weightSum ? Math.max(0, Math.min(100, Math.round(weighted / weightSum))) : 0;
    const grade = performance >= 85 ? "A+" : performance >= 75 ? "A" : performance >= 65 ? "B" : performance >= 50 ? "C" : performance > 0 ? "D" : "—";
    const perfTint = performance >= 75 ? "oklch(0.68 0.18 155)" : performance >= 50 ? "oklch(0.72 0.16 90)" : performance > 0 ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.02 250)";

    return {
      ...e,
      att, present, late, absent, leave,
      tasks: empTasks, tasksDone: done, tasksOverdue: overdue,
      managed, calls,
      attScore: Math.round(attScore),
      taskScore: Math.round(Math.max(0, taskScore)),
      avgCall: Math.round(avgCall * 10) / 10,
      performance, grade, perfTint,
    };
  }), [employees, attendance, tasks, projects, feedback, today]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return [r.name, r.email, r.department, r.position, r.employee_code].some((v) => (v ?? "").toString().toLowerCase().includes(s));
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((r) => r.status === "active").length;
  const onLeave = rows.filter((r) => r.status === "on_leave").length;
  const inactive = rows.filter((r) => r.status === "inactive").length;
  const rated = rows.filter((r) => r.performance > 0);
  const avgPerformance = rated.length ? Math.round(rated.reduce((s, r) => s + r.performance, 0) / rated.length) : 0;
  const topPerformers = rows.filter((r) => r.performance >= 75).length;

  const detail = useMemo(() => {
    if (!viewing) return null;
    const r = rows.find((x) => x.id === viewing.id);
    if (!r) return null;
    const attRecent = [...r.att].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 50);
    const tasksRecent = [...r.tasks].sort((a, b) => (b.due_date ?? "").localeCompare(a.due_date ?? ""));
    return { r, attRecent, tasksRecent };
  }, [viewing, rows]);

  const chip = (key: string, label: string, count: number) => (
    <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${statusFilter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <AppLayout>
      <PageHeader title="Employee History" description="Read-only summary of every employee with attendance, tasks, projects and feedback calls." />

      <StatsCards loading={empsQ.isLoading} stats={[
        { label: "Total Employees", value: rows.length, icon: Users },
        { label: "Active", value: activeCount, icon: UserCheck, tint: STATUS_TINT.active },
        { label: "On Leave", value: onLeave, icon: Users, tint: STATUS_TINT.on_leave },
        { label: "Inactive", value: inactive, icon: Users, tint: STATUS_TINT.inactive },
        { label: "Avg. Performance", value: `${avgPerformance}%`, hint: `${topPerformers} top performers (≥75%)`, icon: Gauge, tint: avgPerformance >= 75 ? "oklch(0.68 0.18 155)" : avgPerformance >= 50 ? "oklch(0.72 0.16 90)" : "oklch(0.65 0.18 25)" },
      ]} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Employee Ledger</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {chip("all", "All", rows.length)}
            {chip("active", "Active", activeCount)}
            {chip("on_leave", "On Leave", onLeave)}
            {chip("inactive", "Inactive", inactive)}
            <Input placeholder="Search name, email, dept..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Present / Late / Absent</TableHead>
                  <TableHead className="text-right">Tasks (Done / Overdue)</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">{empsQ.isLoading ? "Loading..." : "No employees to show."}</TableCell></TableRow>
                ) : filtered.map((r) => {
                  const tint = STATUS_TINT[r.status] ?? STATUS_TINT.inactive;
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setViewing(r)}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>{r.department ?? "—"}</TableCell>
                      <TableCell>{r.position ?? "—"}</TableCell>
                      <TableCell>
                        <Badge style={{ background: `color-mix(in oklab, ${tint} 14%, transparent)`, color: tint, borderColor: "transparent" }}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span style={{ color: ATT_TINT.present }}>{r.present}</span> / <span style={{ color: ATT_TINT.late }}>{r.late}</span> / <span style={{ color: ATT_TINT.absent }}>{r.absent}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span style={{ color: TASK_TINT.done }}>{r.tasksDone}</span> / <span style={{ color: "oklch(0.6 0.18 25)" }}>{r.tasksOverdue}</span>
                      </TableCell>
                      <TableCell className="text-right">{r.managed.length}</TableCell>
                      <TableCell className="text-right">{r.calls.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.performance}%`, background: r.perfTint }} />
                          </div>
                          <span className="font-mono text-xs" style={{ color: r.perfTint }}>{r.performance}%</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ color: r.perfTint, borderColor: r.perfTint }}>{r.grade}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
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
                  <Users className="h-5 w-5" /> {detail.r.name}
                  <Badge className="ml-2" style={{ background: `color-mix(in oklab, ${STATUS_TINT[detail.r.status]} 14%, transparent)`, color: STATUS_TINT[detail.r.status], borderColor: "transparent" }}>
                    {detail.r.status.replace("_", " ")}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contact</div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {detail.r.email || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {detail.r.phone || "—"}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {[detail.r.city, detail.r.district, detail.r.province].filter(Boolean).join(", ") || "—"}</div>
                </div>
                <div className="rounded-md border p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Employment</div>
                  <div><span className="text-muted-foreground">Code:</span> {detail.r.employee_code || "—"} &nbsp; <span className="text-muted-foreground">Type:</span> {detail.r.employment_type || "—"}</div>
                  <div><span className="text-muted-foreground">Department:</span> {detail.r.department || "—"} &nbsp; <span className="text-muted-foreground">Position:</span> {detail.r.position || "—"}</div>
                  <div><span className="text-muted-foreground">Manager:</span> {detail.r.reporting_manager || "—"} &nbsp; <span className="text-muted-foreground">Joined:</span> {detail.r.join_date || "—"}</div>
                  <div><span className="text-muted-foreground">Gross Salary:</span> {detail.r.gross_salary ? fmtPKR(detail.r.gross_salary) : "—"}</div>
                </div>
              </div>

              <div className="rounded-md border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" style={{ color: detail.r.perfTint }} />
                    <div className="text-sm font-semibold">Performance Scorecard</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-mono" style={{ color: detail.r.perfTint }}>{detail.r.performance}%</span>
                    <Badge style={{ background: `color-mix(in oklab, ${detail.r.perfTint} 14%, transparent)`, color: detail.r.perfTint, borderColor: "transparent" }}>Grade {detail.r.grade}</Badge>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-background overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${detail.r.performance}%`, background: detail.r.perfTint }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    { label: "Attendance", value: `${detail.r.attScore}%`, weight: "30%" },
                    { label: "Task Completion", value: `${detail.r.taskScore}%`, weight: "35%" },
                    { label: "Project Delivery", value: detail.r.managed.length ? `${Math.round((detail.r.managed.filter((p: any) => p.status === "completed").length / detail.r.managed.length) * 100)}%` : "—", weight: "20%" },
                    { label: "Feedback Score", value: detail.r.calls.length ? `${detail.r.avgCall} / 25` : "—", weight: "15%" },
                  ].map((k, i) => (
                    <div key={i} className="rounded-md border bg-background p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{k.label}</span>
                        <span className="text-[10px] text-muted-foreground">{k.weight}</span>
                      </div>
                      <div className="text-sm font-semibold font-mono mt-0.5">{k.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
                {[
                  { label: "Present", value: detail.r.present, tint: ATT_TINT.present },
                  { label: "Late", value: detail.r.late, tint: ATT_TINT.late },
                  { label: "Absent", value: detail.r.absent, tint: ATT_TINT.absent },
                  { label: "Leaves", value: detail.r.leave, tint: ATT_TINT.leave },
                  { label: "Tasks Done", value: detail.r.tasksDone, tint: TASK_TINT.done },
                  { label: "Tasks Overdue", value: detail.r.tasksOverdue, tint: "oklch(0.6 0.18 25)" },
                ].map((k, i) => (
                  <div key={i} className="rounded-md border p-2.5">
                    <div className="text-[11px] text-muted-foreground">{k.label}</div>
                    <div className="text-sm font-semibold font-mono" style={{ color: k.tint }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <Tabs defaultValue="attendance" className="mt-2">
                <TabsList>
                  <TabsTrigger value="attendance"><UserCheck className="h-3.5 w-3.5 mr-1" />Attendance ({detail.r.att.length})</TabsTrigger>
                  <TabsTrigger value="tasks"><ClipboardList className="h-3.5 w-3.5 mr-1" />Tasks ({detail.r.tasks.length})</TabsTrigger>
                  <TabsTrigger value="projects"><Briefcase className="h-3.5 w-3.5 mr-1" />Projects ({detail.r.managed.length})</TabsTrigger>
                  <TabsTrigger value="calls"><PhoneCall className="h-3.5 w-3.5 mr-1" />Feedback Calls ({detail.r.calls.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detail.attRecent.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No attendance records.</TableCell></TableRow>
                        ) : detail.attRecent.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.date}</TableCell>
                            <TableCell className="font-mono text-xs">{a.check_in || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{a.check_out || "—"}</TableCell>
                            <TableCell>
                              <Badge style={{ background: `color-mix(in oklab, ${ATT_TINT[a.status]} 14%, transparent)`, color: ATT_TINT[a.status], borderColor: "transparent" }}>{a.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="tasks">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Due</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detail.tasksRecent.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No tasks assigned.</TableCell></TableRow>
                        ) : detail.tasksRecent.map((t) => {
                          const overdue = t.due_date && t.due_date < today && t.status !== "done";
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">{t.title}</TableCell>
                              <TableCell style={{ color: overdue ? "oklch(0.6 0.18 25)" : undefined }}>{t.due_date || "—"}</TableCell>
                              <TableCell className="capitalize text-xs">{t.priority}</TableCell>
                              <TableCell>
                                <Badge style={{ background: `color-mix(in oklab, ${TASK_TINT[t.status]} 14%, transparent)`, color: TASK_TINT[t.status], borderColor: "transparent" }}>{t.status.replace("_", " ")}</Badge>
                              </TableCell>
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
                      <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Progress</TableHead><TableHead className="text-right">Budget</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detail.r.managed.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Not managing any projects.</TableCell></TableRow>
                        ) : detail.r.managed.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.client || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{p.status.replace("_", " ")}</Badge></TableCell>
                            <TableCell className="text-right">{p.progress ?? 0}%</TableCell>
                            <TableCell className="text-right font-mono">{p.budget ? fmtPKR(p.budget) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="calls">
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Project</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detail.r.calls.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No feedback calls made.</TableCell></TableRow>
                        ) : detail.r.calls.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">{(c.call_date ?? c.created_at ?? "").slice(0, 10)}</TableCell>
                            <TableCell>{c.customer_name}</TableCell>
                            <TableCell>{c.project_ref || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{c.total_score ?? 0} / 25</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export const Route = createFileRoute("/employees-history")({
  component: EmployeesHistoryPage,
});
