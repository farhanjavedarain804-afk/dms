import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Sparkles, UserPlus, FolderPlus, FileText, Wallet, Ticket, Upload, Megaphone, Bot } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEPT_COLORS = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500", "bg-fuchsia-500", "bg-teal-500", "bg-indigo-500"];
const TASK_COLORS: Record<string, string> = {
  completed: "oklch(0.68 0.18 155)",
  done: "oklch(0.68 0.18 155)",
  in_progress: "oklch(0.6 0.2 250)",
  pending: "oklch(0.72 0.18 55)",
  todo: "oklch(0.72 0.18 55)",
  overdue: "oklch(0.62 0.24 25)",
  blocked: "oklch(0.62 0.24 25)",
};
const TASK_LABEL: Record<string, string> = {
  completed: "Completed", done: "Completed", in_progress: "In Progress",
  pending: "Pending", todo: "Pending", overdue: "Overdue", blocked: "Blocked",
};

function useEmployeesByDept() {
  return useQuery({
    queryKey: ["dashboard", "dept-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("department");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((e: any) => {
        const d = e.department || "Unassigned";
        counts[d] = (counts[d] ?? 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count], i) => ({
          name, count, pct: Math.round((count / total) * 100), color: DEPT_COLORS[i % DEPT_COLORS.length],
        }));
    },
    staleTime: 30_000,
  });
}

function useTasksOverview() {
  return useQuery({
    queryKey: ["dashboard", "tasks-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((t: any) => {
        const s = String(t.status ?? "pending").toLowerCase().replace(/\s+/g, "_");
        counts[s] = (counts[s] ?? 0) + 1;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return {
        total,
        rows: Object.entries(counts).map(([k, v]) => ({
          key: k,
          name: TASK_LABEL[k] ?? k,
          value: v,
          color: TASK_COLORS[k] ?? "oklch(0.7 0.05 250)",
          pct: total ? Math.round((v / total) * 100) : 0,
        })),
      };
    },
    staleTime: 30_000,
  });
}

function useAttendanceToday() {
  return useQuery({
    queryKey: ["dashboard", "attendance-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [attRes, empRes] = await Promise.all([
        supabase.from("attendance").select("status").eq("date", today),
        supabase.from("employees").select("*", { count: "exact", head: true }),
      ]);
      let present = 0, absent = 0, late = 0;
      (attRes.data ?? []).forEach((a: any) => {
        const s = String(a.status ?? "").toLowerCase();
        if (s === "late") late++;
        else if (s === "absent") absent++;
        else if (s === "present" || s === "half_day" || s === "leave") present++;
      });
      const total = empRes.count ?? 0;
      return { present, absent, late, total, pct: total ? Math.round(((present + late) / total) * 100) : 0 };
    },
    staleTime: 30_000,
  });
}

function useUpcomingEvents() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-events"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [meetings, holidays] = await Promise.all([
        supabase.from("meetings").select("id, title, date, start_time, end_time").gte("date", today).order("date").limit(4),
        supabase.from("holidays").select("id, name, date").gte("date", today).order("date").limit(4),
      ]);
      type Ev = { id: string; d: string; m: string; title: string; time: string; sort: string };
      const mk = (iso: string): { d: string; m: string } => {
        const dt = new Date(iso);
        return { d: String(dt.getDate()).padStart(2, "0"), m: dt.toLocaleString("en", { month: "short" }).toUpperCase() };
      };
      const rows: Ev[] = [];
      (meetings.data ?? []).forEach((m: any) => {
        const { d, m: mo } = mk(m.date);
        rows.push({
          id: `m${m.id}`, d, m: mo, title: m.title,
          time: [m.start_time, m.end_time].filter(Boolean).join(" – ") || "All day",
          sort: m.date,
        });
      });
      (holidays.data ?? []).forEach((h: any) => {
        const { d, m } = mk(h.date);
        rows.push({ id: `h${h.id}`, d, m, title: h.name, time: "Holiday", sort: h.date });
      });
      return rows.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 4);
    },
    staleTime: 60_000,
  });
}

export function BottomWidgets() {
  const navigate = useNavigate();
  const departments = useEmployeesByDept();
  const tasks = useTasksOverview();
  const attendance = useAttendanceToday();
  const events = useUpcomingEvents();

  const deptRows = departments.data ?? [];
  const taskData = tasks.data ?? { total: 0, rows: [] };
  const att = attendance.data ?? { present: 0, absent: 0, late: 0, total: 0, pct: 0 };
  const evRows = events.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Departments */}
      <div className="rounded-2xl bg-card p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Department Wise Employees</h3>
          <button onClick={() => navigate({ to: "/employees" })} className="text-primary text-xs font-semibold hover:underline">View All</button>
        </div>
        {deptRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No employees yet.</p>
        ) : (
          <div className="space-y-3">
            {deptRows.map((d) => (
              <div key={d.name} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-foreground truncate">{d.name}</span>
                  <span className="text-muted-foreground text-xs">{d.count} <span className="ml-2">{d.pct}%</span></span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${d.color}`} style={{ width: `${Math.min(100, d.pct * 2.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Overview */}
      <div className="rounded-2xl bg-card p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Tasks Overview</h3>
          <span className="text-xs text-muted-foreground">All time</span>
        </div>
        {taskData.total === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-32 w-32 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={taskData.rows} innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2}>
                    {taskData.rows.map((t) => <Cell key={t.key} fill={t.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-lg font-bold">{taskData.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              {taskData.rows.map((t) => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-muted-foreground truncate">{t.name}</span>
                  <span className="ml-auto font-semibold">{t.value} ({t.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => navigate({ to: "/tasks" })} className="mt-3 text-primary text-xs font-semibold w-full text-center hover:underline">View All Tasks →</button>
      </div>

      {/* Attendance Overview */}
      <div className="rounded-2xl bg-card p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Attendance Overview</h3>
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{att.present}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Absent</p>
            <p className="text-2xl font-bold text-rose-600">{att.absent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Late</p>
            <p className="text-2xl font-bold text-orange-500">{att.late}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Total Employees: {att.total}</span>
            <span className="font-semibold">{att.pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${att.pct}%` }} />
          </div>
        </div>
        <button onClick={() => navigate({ to: "/attendance" })} className="mt-4 text-primary text-xs font-semibold w-full text-center hover:underline">View Attendance →</button>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-2xl bg-card p-5 border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Upcoming Events</h3>
          <button onClick={() => navigate({ to: "/leaves" })} className="text-primary text-xs font-semibold hover:underline">View Calendar</button>
        </div>
        {evRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No upcoming events.</p>
        ) : (
          <div className="space-y-3">
            {evRows.map((e) => (
              <div key={e.id} className="flex gap-3">
                <div className="h-12 w-12 rounded-lg bg-muted grid place-items-center text-center shrink-0">
                  <div>
                    <p className="text-sm font-bold text-foreground leading-none">{e.d}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{e.m}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickActionsAndAI() {
  const navigate = useNavigate();
  const actions = [
    { label: "Add Employee", icon: UserPlus, color: "bg-violet-100 text-violet-600", to: "/employees" as const },
    { label: "New Project", icon: FolderPlus, color: "bg-emerald-100 text-emerald-600", to: "/projects" as const },
    { label: "Create Invoice", icon: FileText, color: "bg-orange-100 text-orange-600", to: "/sales" as const },
    { label: "Add Expense", icon: Wallet, color: "bg-sky-100 text-sky-600", to: "/finance" as const },
    { label: "New Ticket", icon: Ticket, color: "bg-rose-100 text-rose-600", to: "/support" as const },
    { label: "Upload Document", icon: Upload, color: "bg-indigo-100 text-indigo-600", to: "/docs" as const },
    { label: "Announcement", icon: Megaphone, color: "bg-teal-100 text-teal-600", to: "/communication" as const },
    { label: "AI Assistant", icon: Bot, color: "bg-fuchsia-100 text-fuchsia-600", to: "/ai" as const },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-2xl bg-card p-5 border shadow-sm">
        <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.label} onClick={() => navigate({ to: a.to })} className="flex flex-col items-center gap-2 group">
                <div className={`h-12 w-12 rounded-xl grid place-items-center ${a.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] text-center text-muted-foreground leading-tight">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-5 shadow-sm text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.5 0.22 285), oklch(0.55 0.22 260))" }}>
        <div className="relative z-10">
          <h3 className="font-bold">AI Assistant</h3>
          <p className="text-xs text-white/80 mt-1 mb-4">How can I help you today?</p>
          <button onClick={() => navigate({ to: "/ai" })} className="bg-white/20 backdrop-blur border border-white/30 rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/30">
            Ask AI Assistant
          </button>
        </div>
        <Sparkles className="absolute right-4 bottom-4 h-20 w-20 text-white/20" />
      </div>
    </div>
  );
}
