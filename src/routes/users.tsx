import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, ShieldCheck, Activity, LogIn, Plus, Trash2, KeyRound, Circle, Search, UserCog,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { createAppUser, deleteAppUser, resetUserPassword, updateUserRole, setUserStatus } from "@/lib/users.functions";
import { adminUnlockLogin, adminLockLogin } from "@/lib/login-security.functions";
import { Building2, Power, Lock as LockIcon, Unlock as UnlockIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users & Access — Devionic DMS" }] }),
  component: UsersPage,
});

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "employee", label: "Employee" },
  { value: "viewer", label: "Viewer" },
];

type AppUser = {
  id: number;
  auth_user_id: string | null;
  employee_id: number | null;
  username: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  phone: string | null;
  status: string;
  last_seen_at: string | null;
  total_online_seconds: number;
  created_at: string;
  is_locked?: boolean;
  failed_attempts?: number;
  locked_at?: string | null;
  lock_reason?: string | null;
  last_login_ip?: string | null;
  known_ips?: string[] | null;

};

type Employee = { id: number; name: string; email: string | null; phone: string | null; department: string | null; position: string | null };
type Department = { id: number; name: string; description: string | null };

type LoginLog = {
  id: number;
  username: string | null;
  full_name: string | null;
  email: string | null;
  ip_address: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  status: string;
  login_at: string;
  logout_at: string | null;
  duration_seconds: number | null;
};

type ActivityLog = {
  id: number;
  username: string | null;
  full_name: string | null;
  action: string;
  module: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
};

function fmtDur(sec: number | null) {
  if (!sec || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

function isOnline(last?: string | null) {
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < 2 * 60 * 1000; // 2 min
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function StatCard({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] ?? tones.slate}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function UsersPage() {
  const qc = useQueryClient();
  const createFn = useServerFn(createAppUser);
  const deleteFn = useServerFn(deleteAppUser);
  const resetFn = useServerFn(resetUserPassword);
  const roleFn = useServerFn(updateUserRole);
  const statusFn = useServerFn(setUserStatus);
  const unlockLoginFn = useServerFn(adminUnlockLogin);
  const lockLoginFn = useServerFn(adminLockLogin);

  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<string>("employee");
  const [roleSaving, setRoleSaving] = useState(false);

  const employeesQ = useQuery({
    queryKey: ["employees_for_users"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase.from("employees" as any)
        .select("id, name, email, phone, department, position")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as any) ?? [];
    },
  });
  const employees = employeesQ.data ?? [];

  const departmentsQ = useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase.from("departments" as any)
        .select("id, name, description").order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as any) ?? [];
    },
  });
  const departments = departmentsQ.data ?? [];

  const usersQ = useQuery({
    queryKey: ["app_users"],
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase.from("app_users" as any).select("*").order("id", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as any) ?? [];
    },
    refetchInterval: 60_000,
  });

  const loginsQ = useQuery({
    queryKey: ["login_logs"],
    queryFn: async (): Promise<LoginLog[]> => {
      const { data, error } = await supabase.from("user_login_logs" as any).select("*").order("login_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return (data as any) ?? [];
    },
  });

  const activityQ = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase.from("user_activity_logs" as any).select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return (data as any) ?? [];
    },
  });

  const users = usersQ.data ?? [];
  const logins = loginsQ.data ?? [];
  const activity = activityQ.data ?? [];

  const stats = useMemo(() => {
    const online = users.filter((u) => isOnline(u.last_seen_at)).length;
    const admins = users.filter((u) => u.role === "admin" || u.role === "super_admin").length;
    const today = new Date().toISOString().slice(0, 10);
    const loginsToday = logins.filter((l) => l.login_at.slice(0, 10) === today).length;
    return {
      total: users.length,
      online,
      admins,
      loginsToday,
      activityCount: activity.length,
      offline: users.length - online,
    };
  }, [users, logins, activity]);

  const [open, setOpen] = useState(false);
  const emptyForm = {
    employee_id: "" as string, username: "", password: "", role: "employee",
    status: "active" as "active" | "inactive",
  };
  const [form, setForm] = useState(emptyForm);
  const selectedEmp = employees.find((e) => String(e.id) === form.employee_id);
  const linkedEmployeeIds = new Set(users.map((u) => u.employee_id).filter(Boolean) as number[]);
  const availableEmployees = employees.filter((e) => !linkedEmployeeIds.has(e.id));

  const createM = useMutation({
    mutationFn: async () => {
      if (!form.employee_id) throw new Error("Select an employee");
      if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");
      const username = form.username.trim() || (selectedEmp?.email?.split("@")[0] ?? "");
      return createFn({ data: {
        employee_id: Number(form.employee_id),
        username,
        password: form.password,
        role: form.role,
        status: form.status,
      } });
    },
    onSuccess: () => {
      toast.success("User account created");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["app_users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [search, setSearch] = useState("");
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.username.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <PageHeader
        title="Users & Access Control"
        description="Manage workspace users, roles, activity and login history."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "users",
                moduleLabel: "Users & Access",
                title: "Users & Access Report",
                subtitle: `${(usersQ.data ?? []).length} user(s)`,
                sections: [
                  {
                    title: "Users",
                    columns: [
                      { key: "full_name", label: "Name" },
                      { key: "email", label: "Email" },
                      { key: "role", label: "Role" },
                      { key: "status", label: "Status" },
                      { key: "last_login_at", label: "Last Login" },
                    ],
                    rows: usersQ.data ?? [],
                  },
                  {
                    title: "Recent Logins",
                    columns: [
                      { key: "user_email", label: "User" },
                      { key: "ip", label: "IP" },
                      { key: "device", label: "Device" },
                      { key: "login_at", label: "At" },
                    ],
                    rows: (loginsQ.data ?? []).slice(0, 100),
                  },
                ],
              })}
            />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create User Account</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Employee</Label>
                  <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                    <SelectTrigger><SelectValue placeholder={availableEmployees.length ? "Select an employee" : "No employees available"} /></SelectTrigger>
                    <SelectContent>
                      {availableEmployees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}{e.position ? ` — ${e.position}` : ""}{e.department ? ` · ${e.department}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Only employees without an existing account are listed.
                  </div>
                </div>

                {selectedEmp && (
                  <div className="col-span-2 rounded-lg border bg-muted/40 p-3 text-xs space-y-0.5">
                    <div><span className="text-muted-foreground">Name:</span> <b>{selectedEmp.name}</b></div>
                    <div><span className="text-muted-foreground">Email:</span> {selectedEmp.email ?? "—"}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {selectedEmp.phone ?? "—"}</div>
                    <div><span className="text-muted-foreground">Department:</span> {selectedEmp.department ?? "—"}</div>
                    <div><span className="text-muted-foreground">Designation:</span> {selectedEmp.position ?? "—"}</div>
                  </div>
                )}

                <div>
                  <Label>Username <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                  <Input
                    placeholder={selectedEmp?.email?.split("@")[0] ?? "auto from email"}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={createM.isPending || !form.employee_id || !form.password}
                  onClick={() => createM.mutate()}
                >
                  {createM.isPending ? "Creating…" : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.total} tone="blue" />
        <StatCard icon={Circle} label="Online Now" value={stats.online} tone="green" />
        <StatCard icon={Circle} label="Offline" value={stats.offline} tone="slate" />
        <StatCard icon={ShieldCheck} label="Admins" value={stats.admins} tone="violet" />
        <StatCard icon={LogIn} label="Logins Today" value={stats.loginsToday} tone="amber" />
        <StatCard icon={Activity} label="Activity Events" value={stats.activityCount} tone="rose" />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="h-4 w-4 mr-1" />Departments</TabsTrigger>
          <TabsTrigger value="sessions"><Circle className="h-4 w-4 mr-1" />Sessions</TabsTrigger>
          <TabsTrigger value="logins"><LogIn className="h-4 w-4 mr-1" />Login Logs</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" />Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Online Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const online = isOnline(u.last_seen_at);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.username}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700">
                          {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                        </span>
                      </TableCell>
                      <TableCell>{u.department ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${online ? "text-emerald-600" : "text-slate-500"}`}>
                          <Circle className={`h-2 w-2 ${online ? "fill-emerald-500 text-emerald-500" : "fill-slate-400 text-slate-400"}`} />
                          {online ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell>{timeAgo(u.last_seen_at)}</TableCell>
                      <TableCell>{fmtDur(u.total_online_seconds)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm" variant="outline" title="Change role"
                          onClick={() => {
                            if (!u.auth_user_id) { toast.error("Missing auth id"); return; }
                            setRoleTarget(u);
                            setNewRole(u.role);
                          }}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="outline" title={u.status === "active" ? "Deactivate" : "Activate"}
                          onClick={async () => {
                            const next = u.status === "active" ? "inactive" : "active";
                            try {
                              await statusFn({ data: { id: u.id, status: next } });
                              toast.success(`User ${next}`);
                              qc.invalidateQueries({ queryKey: ["app_users"] });
                            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          }}
                        >
                          <Power className={`h-3.5 w-3.5 ${u.status === "active" ? "text-emerald-600" : "text-slate-400"}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title={u.is_locked ? `Unlock login${u.lock_reason ? ` — ${u.lock_reason}` : ""}` : "Lock login"}
                          onClick={async () => {
                            try {
                              if (u.is_locked) {
                                const resetIps = window.confirm(
                                  "Unlock this user's login?\n\nOK = Unlock and CLEAR trusted devices (user will be asked to verify next sign-in).\nCancel = Unlock but KEEP trusted devices.",
                                );
                                await unlockLoginFn({ data: { id: u.id, resetIps } });
                                toast.success("Login unlocked");
                              } else {
                                const reason = window.prompt("Reason for locking login (optional):") || undefined;
                                await lockLoginFn({ data: { id: u.id, reason } });
                                toast.success("Login locked");
                              }
                              qc.invalidateQueries({ queryKey: ["app_users"] });
                            } catch (e: any) {
                              toast.error(e?.message ?? "Failed");
                            }
                          }}
                        >
                          {u.is_locked ? (
                            <LockIcon className="h-3.5 w-3.5 text-rose-600" />
                          ) : (
                            <UnlockIcon className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={async () => {
                            const pw = window.prompt(`New password for ${u.username}:`);
                            if (!pw || !u.auth_user_id) return;
                            try {
                              await resetFn({ data: { auth_user_id: u.auth_user_id, password: pw } });
                              toast.success("Password reset");
                            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={async () => {
                            if (!confirm(`Delete user ${u.username}?`)) return;
                            try {
                              await deleteFn({ data: { id: u.id, auth_user_id: u.auth_user_id ?? undefined } });
                              toast.success("User deleted");
                              qc.invalidateQueries({ queryKey: ["app_users"] });
                            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No users yet. Click "New User" to add one.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-3">
          <DepartmentsPanel departments={departments} onChange={() => qc.invalidateQueries({ queryKey: ["departments"] })} />
        </TabsContent>



        <TabsContent value="sessions" className="space-y-3">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Total Online</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const online = isOnline(u.last_seen_at);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${online ? "text-emerald-600" : "text-slate-500"}`}>
                          <Circle className={`h-2 w-2 ${online ? "fill-emerald-500 text-emerald-500" : "fill-slate-400 text-slate-400"}`} />
                          {online ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell>{timeAgo(u.last_seen_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtDur(u.total_online_seconds)}</TableCell>
                      <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="logins" className="space-y-3">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Login At</TableHead>
                  <TableHead>Logout At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser / OS</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logins.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.full_name ?? l.username ?? l.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(l.login_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{l.logout_at ? new Date(l.logout_at).toLocaleString() : <span className="text-emerald-600">active</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDur(l.duration_seconds)}</TableCell>
                    <TableCell className="font-mono text-xs">{l.ip_address ?? "—"}</TableCell>
                    <TableCell>{l.device ?? "—"}</TableCell>
                    <TableCell className="text-xs">{[l.browser, l.os].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell className="text-xs">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
                {logins.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No login records yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{a.full_name ?? a.username ?? "—"}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{a.module ?? "—"}</span></TableCell>
                    <TableCell className="text-xs font-medium">{a.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.description ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {activity.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No activity yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role — {roleTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Current role: <span className="font-medium">{ROLES.find((r) => r.value === roleTarget?.role)?.label ?? roleTarget?.role}</span>
            </div>
            <div>
              <Label>New role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button
              disabled={roleSaving || !roleTarget || newRole === roleTarget?.role}
              onClick={async () => {
                if (!roleTarget?.auth_user_id) return;
                setRoleSaving(true);
                try {
                  await roleFn({ data: { id: roleTarget.id, auth_user_id: roleTarget.auth_user_id, role: newRole } });
                  toast.success("Role updated");
                  setRoleTarget(null);
                  qc.invalidateQueries({ queryKey: ["app_users"] });
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed to update role");
                } finally {
                  setRoleSaving(false);
                }
              }}
            >
              {roleSaving ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="users" />
    </AppLayout>
  );
}

function DepartmentsPanel({ departments, onChange }: { departments: Department[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("departments" as any).insert({ name: name.trim(), description: description.trim() || null } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Department added");
    setName(""); setDescription("");
    onChange();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete department?")) return;
    const { error } = await supabase.from("departments" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChange();
  };

  return (
    <div className="grid gap-3 md:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border bg-card p-4 space-y-2">
        <div className="text-sm font-medium">Add department</div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <Button disabled={saving} onClick={add} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Add"}
        </Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.description ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => remove(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {departments.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">No departments yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

