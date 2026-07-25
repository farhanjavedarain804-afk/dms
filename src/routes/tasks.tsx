import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Circle, Loader, CheckCircle2, AlertTriangle, CalendarClock, Clock, CheckCheck, ArrowRight, PenSquare, History } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resources, type Task } from "@/lib/api";
import { internNameOptions } from "@/lib/interns-source";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Devionic DMS" }] }),
  component: TasksPage,
});

const STATUS_OPTS = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const NEXT_STATUS: Record<string, Task["status"]> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
  done: "todo",
};

function TasksPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tasks"], queryFn: resources.tasks.list });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });
  const employeesQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const rows = q.data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7);

  const totalTasks = rows.length;
  const todo = rows.filter((r) => r.status === "todo").length;
  const inProgress = rows.filter((r) => r.status === "in_progress" || r.status === "review").length;
  const done = rows.filter((r) => r.status === "done").length;
  const overdue = rows.filter((r) => r.status !== "done" && r.due_date && new Date(r.due_date) < today).length;
  const dueToday = rows.filter((r) => r.status !== "done" && r.due_date && new Date(r.due_date).toDateString() === today.toDateString()).length;
  const dueSoon = rows.filter((r) => r.status !== "done" && r.due_date && new Date(r.due_date) >= today && new Date(r.due_date) <= in7).length;
  const highPriority = rows.filter((r) => r.priority === "high" && r.status !== "done").length;

  const projectOptions = useMemo(
    () => (projectsQ.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    [projectsQ.data],
  );
  const employeeOptions = useMemo(
    () => [
      ...(employeesQ.data ?? []).map((e) => ({ value: e.name, label: `${e.name}${e.position ? ` (${e.position})` : ""}` })),
      ...internNameOptions(),
    ],
    [employeesQ.data],
  );

  const projectName = (id?: number | null) =>
    id ? (projectsQ.data ?? []).find((p) => p.id === Number(id))?.name ?? `#${id}` : "—";

  const fields: FieldDef<Task>[] = [
    { name: "title", label: "Title", required: true },
    { name: "project_id", label: "Project", type: "select", options: projectOptions,
      placeholder: projectOptions.length === 0 ? "Add a project first" : undefined,
      render: (v) => projectName(v as number) },
    { name: "assignee", label: "Assignee", type: "select", options: employeeOptions,
      placeholder: employeeOptions.length === 0 ? "Add employees first" : undefined },
    { name: "status", label: "Status", type: "select", required: true, options: STATUS_OPTS },
    { name: "priority", label: "Priority", type: "select", required: true, options: PRIORITY_OPTS,
      render: (v) => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : "—" },
    { name: "start_date", label: "Start date", type: "date" },
    { name: "due_date", label: "Due date", type: "date" },
    { name: "estimated_hours", label: "Estimated hours", type: "number", hideInTable: true },
    { name: "actual_hours", label: "Actual hours", type: "number", hideInTable: true },
    { name: "tags", label: "Tags", type: "multiselect", options: [
      { value: "bug", label: "Bug" },
      { value: "feature", label: "Feature" },
      { value: "enhancement", label: "Enhancement" },
      { value: "urgent", label: "Urgent" },
      { value: "documentation", label: "Documentation" },
      { value: "design", label: "Design" },
      { value: "testing", label: "Testing" },
    ], hideInTable: true,
      render: (v) => Array.isArray(v) && v.length ? v.join(", ") : "—" },
    { name: "description", label: "Description", type: "textarea", fullWidth: true, hideInTable: true },
    { name: "attachment", label: "Attachment", type: "document_upload", uploadFolder: "tasks", fullWidth: true, hideInTable: true },
  ];

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task["status"] }) => {
      const patch: Partial<Task> = { status };
      if (status === "done") patch.completed_at = new Date().toISOString();
      return resources.tasks.update(id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const [updateFor, setUpdateFor] = useState<Task | null>(null);
  const [historyFor, setHistoryFor] = useState<Task | null>(null);
  const [uTitle, setUTitle] = useState("");
  const [uDesc, setUDesc] = useState("");
  const [uBy, setUBy] = useState("");
  const [uStatus, setUStatus] = useState<string>("");

  const openUpdate = (row: Task) => {
    setUpdateFor(row);
    setUTitle("");
    setUDesc("");
    setUBy("");
    setUStatus(row.status ?? "");
  };

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!updateFor) throw new Error("No task");
      if (!uTitle.trim()) throw new Error("Title is required");
      const entry = {
        at: new Date().toISOString(),
        title: uTitle.trim(),
        description: uDesc.trim() || undefined,
        updated_by: uBy.trim() || undefined,
        status: uStatus || undefined,
      };
      const history = [...(updateFor.status_history ?? []), entry];
      const patch: Partial<Task> = { status_history: history };
      if (uStatus && uStatus !== updateFor.status) {
        patch.status = uStatus as Task["status"];
        if (uStatus === "done") patch.completed_at = new Date().toISOString();
      }
      return resources.tasks.update(updateFor.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Status update logged");
      setUpdateFor(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const filterFn = (r: Task) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (projectFilter !== "all" && String(r.project_id ?? "") !== projectFilter) return false;
    if (assigneeFilter !== "all" && r.assignee !== assigneeFilter) return false;
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
      <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All projects</option>
        {projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All assignees</option>
        {employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Tasks"
        description="Assign, prioritise, and track team tasks end-to-end."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "tasks",
              moduleLabel: "Tasks",
              title: "Tasks Report",
              subtitle: `${totalTasks} task(s) · ${done} done · ${overdue} overdue`,
              meta: [
                { label: "To Do", value: String(todo) },
                { label: "In Progress", value: String(inProgress) },
                { label: "Done", value: String(done) },
                { label: "Overdue", value: String(overdue) },
              ],
              sections: [{
                title: "All Tasks",
                columns: [
                  { key: "title", label: "Title" },
                  { key: "assignee", label: "Assignee" },
                  { key: "project", label: "Project" },
                  { key: "priority", label: "Priority" },
                  { key: "status", label: "Status" },
                  { key: "due_date", label: "Due" },
                ],
                rows,
              }],
            })}
          />
        }
      />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Tasks", value: totalTasks, hint: "All tasks", icon: CheckSquare },
        { label: "To Do", value: todo, hint: "Not started", icon: Circle },
        { label: "In Progress", value: inProgress, hint: "Active + review", icon: Loader },
        { label: "Done", value: done, hint: `${totalTasks ? Math.round((done / totalTasks) * 100) : 0}% complete`, icon: CheckCircle2 },
        { label: "Overdue", value: overdue, hint: "Past due date", icon: AlertTriangle },
        { label: "Due Today", value: dueToday, hint: "Deliver today", icon: Clock },
        { label: "Due in 7 days", value: dueSoon, hint: "Upcoming", icon: CalendarClock },
        { label: "High Priority", value: highPriority, hint: "Open + high", icon: AlertTriangle },
      ]} />

      <CrudTable<Task>
        title="Task"
        fields={fields}
        api={resources.tasks}
        queryKey="tasks"
        searchable={["title", "assignee"]}
        defaults={{ status: "todo", priority: "medium" }}
        filter={filterFn}
        toolbar={toolbar}
        rowActions={(row) => (
          <>
            {row.status !== "done" && (
              <Button size="sm" variant="ghost" title="Mark as done"
                onClick={() => statusMut.mutate({ id: row.id, status: "done" })}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" title="Advance status"
              onClick={() => statusMut.mutate({ id: row.id, status: NEXT_STATUS[row.status] })}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Update status" onClick={() => openUpdate(row)}>
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Status history" onClick={() => setHistoryFor(row)}>
              <History className="h-4 w-4" />
            </Button>
          </>
        )}
      />

      <Dialog open={!!updateFor} onOpenChange={(o) => !o && setUpdateFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update status — {updateFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={uTitle} onChange={(e) => setUTitle(e.target.value)} placeholder="e.g. Blocked on API access" />
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
            <DialogTitle>Status history — {historyFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {(historyFor?.status_history ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No status updates yet.</div>
            ) : (
              [...(historyFor?.status_history ?? [])].reverse().map((h, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
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
      <ModuleReportsCard module="tasks" />
    </AppLayout>
  );
}
