import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Loader, CheckCircle2, Wallet, Archive, ArchiveRestore, History, PenSquare, Clock, ListChecks, AlertTriangle, CalendarClock, Trophy } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resources, type Project } from "@/lib/api";
import { internNameOptions } from "@/lib/interns-source";
import { localCrud } from "@/lib/local-store";
import { fmtPKR } from "@/lib/pk";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Devionic DMS" }] }),
  component: ProjectsPage,
});

const PRIORITY_OPTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTS = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];

type CrmClient = {
  id: number; name: string; company: string; stage: string;
  value?: number; priority?: string; assigned_to?: string;
  expected_close?: string; notes?: string;
};
const crmApi = localCrud<CrmClient>("clients_v2");
const IMPORTED_KEY = "crm_won_imported_v1";
const getImported = (): number[] => {
  try { return JSON.parse(localStorage.getItem(IMPORTED_KEY) ?? "[]"); } catch { return []; }
};
const setImported = (ids: number[]) => localStorage.setItem(IMPORTED_KEY, JSON.stringify(ids));

function ProjectsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });
  const employeesQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const clientsQ = useQuery({ queryKey: ["clients_v2"], queryFn: crmApi.list });
  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: resources.tasks.list });

  // Auto-import won CRM deals as projects
  const syncingRef = useRef(false);
  useEffect(() => {
    if (syncingRef.current) return;
    const clients = clientsQ.data;
    const projects = q.data;
    if (!clients || !projects) return;
    const won = clients.filter((c) => c.stage === "won");
    if (won.length === 0) return;
    const imported = new Set(getImported());
    const existingNames = new Set(projects.map((p) => p.name.toLowerCase()));
    const toImport = won.filter((c) => {
      if (imported.has(c.id)) return false;
      const projName = `${c.company} — ${c.name}`.toLowerCase();
      return !existingNames.has(projName);
    });
    if (toImport.length === 0) {
      // Still mark already-existing won deals as imported so we don't retry
      const missing = won.filter((c) => !imported.has(c.id));
      if (missing.length > 0) setImported([...imported, ...missing.map((c) => c.id)]);
      return;
    }
    syncingRef.current = true;
    (async () => {
      const newIds = [...imported];
      for (const c of toImport) {
        try {
          await resources.projects.create({
            name: `${c.company} — ${c.name}`,
            client: c.company,
            status: "planning",
            priority: (c.priority as any) ?? "medium",
            budget: Number(c.value ?? 0),
            progress: 0,
            deadline: c.expected_close ?? null,
            manager: c.assigned_to ?? null,
            description: c.notes ? `Imported from CRM won deal.\n\n${c.notes}` : "Imported from CRM won deal.",
            team_members: [] as any,
          } as Partial<Project> as any);
          newIds.push(c.id);
        } catch (e: any) {
          console.error("Failed to import won deal", c.id, e);
        }
      }
      setImported(newIds);
      qc.invalidateQueries({ queryKey: ["projects"] });
      if (toImport.length > 0) toast.success(`${toImport.length} won deal${toImport.length === 1 ? "" : "s"} imported as project${toImport.length === 1 ? "" : "s"}`);
      syncingRef.current = false;
    })();
  }, [clientsQ.data, q.data, qc]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  const rows = q.data ?? [];
  const activeRows = rows.filter((r) => !r.archived);
  const totalProjects = activeRows.length;
  const activeProjects = activeRows.filter((r) => r.status === "in_progress").length;
  const completedProjects = activeRows.filter((r) => r.status === "completed").length;
  const pendingProjects = activeRows.filter((r) => r.status === "planning" || r.status === "on_hold").length;

  const tasks = tasksQ.data ?? [];
  const totalTasks = tasks.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < today).length;
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
  const upcomingDeadlines = activeRows.filter((r) => r.deadline && new Date(r.deadline) >= today && new Date(r.deadline) <= in7 && r.status !== "completed").length;
  const totalBudget = activeRows.reduce((s, r) => s + Number(r.budget ?? 0), 0);


  const clientOptions = useMemo(
    () => (clientsQ.data ?? []).filter((c) => c.stage === "won").map((c) => ({ value: c.company, label: `${c.company} — ${c.name}` })),
    [clientsQ.data],
  );
  const employeeOptions = useMemo(
    () => [
      ...(employeesQ.data ?? []).map((e) => ({ value: e.name, label: `${e.name}${e.position ? ` (${e.position})` : ""}` })),
      ...internNameOptions(),
    ],
    [employeesQ.data],
  );

  const fields: FieldDef<Project>[] = [
    { name: "name", label: "Project name", required: true },
    { name: "client", label: "Client", type: "select", required: true, options: clientOptions,
      placeholder: clientOptions.length === 0 ? "No won deals yet — close a deal in Clients & CRM first" : undefined },
    { name: "manager", label: "Project manager", type: "select", options: employeeOptions },
    { name: "team_members", label: "Team members", type: "multiselect", options: employeeOptions,
      placeholder: "Select team members…",
      render: (v) => Array.isArray(v) && v.length > 0 ? `${v.length} member${v.length === 1 ? "" : "s"}` : "—" },
    { name: "start_date", label: "Start date", type: "date" },
    { name: "deadline", label: "Due date", type: "date" },
    { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTS,
      render: (v) => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "—" },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTS },
    { name: "description", label: "Description", type: "textarea", fullWidth: true, hideInTable: true },
    { name: "attachment", label: "Attachment", type: "document_upload", uploadFolder: "projects", fullWidth: true, hideInTable: true },
    { name: "budget", label: "Budget", type: "number", hideInTable: true, render: (v) => fmtPKR(Number(v ?? 0)) },
    { name: "progress", label: "Progress %", type: "number", hideInTable: true, render: (v) => `${v ?? 0}%` },
  ];

  const archiveMut = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      resources.projects.update(id, { archived } as Partial<Project>),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(v.archived ? "Project archived" : "Project restored");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const filterFn = (r: Project) => {
    if (!showArchived && r.archived) return false;
    if (showArchived && !r.archived) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    return true;
  };

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All statuses</option>
        {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All priorities</option>
        {PRIORITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Button type="button" size="sm" variant={showArchived ? "default" : "outline"}
        onClick={() => setShowArchived((v) => !v)}>
        {showArchived ? <ArchiveRestore className="h-4 w-4 mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
        {showArchived ? "Viewing archived" : "Show archived"}
      </Button>
    </div>
  );

  const [updateFor, setUpdateFor] = useState<Project | null>(null);
  const [historyFor, setHistoryFor] = useState<Project | null>(null);
  const [uTitle, setUTitle] = useState("");
  const [uDesc, setUDesc] = useState("");
  const [uBy, setUBy] = useState("");
  const [uStatus, setUStatus] = useState<string>("");

  const openUpdate = (row: Project) => {
    setUpdateFor(row);
    setUTitle("");
    setUDesc("");
    setUBy("");
    setUStatus(row.status ?? "");
  };

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!updateFor) throw new Error("No project");
      if (!uTitle.trim()) throw new Error("Title is required");
      const entry = {
        at: new Date().toISOString(),
        title: uTitle.trim(),
        description: uDesc.trim() || undefined,
        updated_by: uBy.trim() || undefined,
        status: uStatus || undefined,
      };
      const history = [...(updateFor.status_history ?? []), entry];
      const patch: Partial<Project> = { status_history: history };
      if (uStatus && uStatus !== updateFor.status) patch.status = uStatus as Project["status"];
      return resources.projects.update(updateFor.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Status update logged");
      setUpdateFor(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppLayout>
      <PageHeader
        title="Projects"
        description="Track project status, progress, and deadlines."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "projects",
              moduleLabel: "Projects",
              title: "Projects Report",
              subtitle: `${totalProjects} project(s) · ${activeProjects} active · ${completedProjects} completed`,
              meta: [
                { label: "Active", value: String(activeProjects) },
                { label: "Completed", value: String(completedProjects) },
                { label: "Overdue Tasks", value: String(overdueTasks) },
                { label: "Total Budget", value: fmtPKR(totalBudget) },
              ],
              sections: [
                {
                  title: "All Projects",
                  columns: [
                    { key: "name", label: "Name" },
                    { key: "client", label: "Client" },
                    { key: "manager", label: "Manager" },
                    { key: "status", label: "Status" },
                    { key: "priority", label: "Priority" },
                    { key: "progress", label: "%" },
                    { key: "start_date", label: "Start" },
                    { key: "end_date", label: "End" },
                    { key: "budget", label: "Budget", format: (v) => fmtPKR(v ?? 0) },
                  ],
                  rows: q.data ?? [],
                },
              ],
            })}
          />
        }
      />
      <StatsCards loading={q.isLoading || tasksQ.isLoading} stats={[
        { label: "Total Projects", value: totalProjects, hint: "All active", icon: FolderKanban },
        { label: "Active Projects", value: activeProjects, hint: "In progress", icon: Loader },
        { label: "Completed Projects", value: completedProjects, hint: "Delivered", icon: CheckCircle2 },
        { label: "Pending Projects", value: pendingProjects, hint: "Planning / on hold", icon: Clock },
        { label: "Total Tasks", value: totalTasks, hint: "Across all projects", icon: ListChecks },
        { label: "Overdue Tasks", value: overdueTasks, hint: "Past due date", icon: AlertTriangle },
        { label: "Upcoming Deadlines", value: upcomingDeadlines, hint: "Due within 7 days", icon: CalendarClock },
        { label: "Total Budget", value: fmtPKR(totalBudget), hint: "Across all projects", icon: Wallet },
        { label: "Won Deals (CRM)", value: (clientsQ.data ?? []).filter((c) => c.stage === "won").length, hint: "Auto-imported as projects", icon: Trophy },
      ]} />

      <CrudTable<Project>
        title="Project"
        fields={fields}
        api={resources.projects}
        queryKey="projects"
        searchable={["name", "client", "manager"]}
        defaults={{ status: "planning", progress: 0, priority: "medium", team_members: [] as any }}
        filter={filterFn}
        toolbar={toolbar}
        rowActions={(row) => (
          <>
            <Button size="sm" variant="ghost" title="Update status" onClick={() => openUpdate(row)}>
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Status history" onClick={() => setHistoryFor(row)}>
              <History className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title={row.archived ? "Restore" : "Archive"}
              onClick={() => archiveMut.mutate({ id: row.id, archived: !row.archived })}>
              {row.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
          </>
        )}
      />

      <ModuleReportsCard module="projects" />

      <Dialog open={!!updateFor} onOpenChange={(o) => !o && setUpdateFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update status — {updateFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={uTitle} onChange={(e) => setUTitle(e.target.value)} placeholder="e.g. Milestone 2 completed" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={uDesc} onChange={(e) => setUDesc(e.target.value)} placeholder="Progress notes, blockers, next steps…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Change status to</Label>
                <select value={uStatus} onChange={(e) => setUStatus(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">— Keep current —</option>
                  {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Updated by</Label>
                <Input value={uBy} onChange={(e) => setUBy(e.target.value)} placeholder="Your name" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateFor(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Status history — {historyFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {(historyFor?.status_history ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No status updates yet.</div>
            ) : (
              [...(historyFor?.status_history ?? [])].reverse().map((h, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString()}
                    </div>
                  </div>
                  {h.description && <div className="mt-1 text-sm whitespace-pre-wrap">{h.description}</div>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {h.updated_by && <span>By {h.updated_by}</span>}
                    {h.status && <span>Status → {STATUS_OPTS.find((o) => o.value === h.status)?.label ?? h.status}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
