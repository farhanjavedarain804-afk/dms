import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resources, type Task } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Plus, ListChecks, MessageSquare, Save } from "lucide-react";

type Props = {
  taskId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function TaskDetailDialog({ taskId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });
  const empQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const taskQ = useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => resources.tasks.get(taskId!),
    enabled: !!taskId && open,
  });
  const checksQ = useQuery({
    queryKey: ["project_task_checklists"],
    queryFn: resources.taskChecklists.list,
    enabled: open,
  });
  const commentsQ = useQuery({
    queryKey: ["project_task_comments"],
    queryFn: resources.taskComments.list,
    enabled: open,
  });

  const task = taskQ.data;
  const checks = (checksQ.data ?? []).filter((c) => c.task_id === taskId);
  const comments = (commentsQ.data ?? []).filter((c) => c.task_id === taskId);

  const [form, setForm] = useState<Partial<Task>>({});
  useEffect(() => { if (task) setForm(task); }, [task]);

  const set = (k: keyof Task, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (body: any) => resources.tasks.update(taskId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const addCheckMut = useMutation({
    mutationFn: (label: string) => resources.taskChecklists.create({ task_id: taskId, label, done: false } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_task_checklists"] }),
  });
  const toggleCheckMut = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      resources.taskChecklists.update(id, { done } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_task_checklists"] }),
  });
  const delCheckMut = useMutation({
    mutationFn: (id: number) => resources.taskChecklists.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_task_checklists"] }),
  });

  const addCommentMut = useMutation({
    mutationFn: ({ author, body }: { author: string; body: string }) =>
      resources.taskComments.create({ task_id: taskId, author, body } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_task_comments"] }),
  });
  const delCommentMut = useMutation({
    mutationFn: (id: number) => resources.taskComments.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_task_comments"] }),
  });

  const [newCheck, setNewCheck] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentBody, setCommentBody] = useState("");

  const projects = projectsQ.data ?? [];
  const employees = empQ.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        {!task ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project</Label>
                  <Select value={form.project_id != null ? String(form.project_id) : ""}
                    onValueChange={(v) => set("project_id", v ? Number(v) : null)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assignee</Label>
                  <Select value={form.assignee ?? ""} onValueChange={(v) => set("assignee", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status ?? "todo"} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority ?? "medium"} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMut.mutate({
                  title: form.title,
                  project_id: form.project_id,
                  assignee: form.assignee,
                  status: form.status,
                  priority: form.priority,
                  due_date: form.due_date,
                })} disabled={saveMut.isPending}>
                  <Save className="h-4 w-4 mr-1" /> Save task
                </Button>
              </div>
            </div>

            <section className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4" /> Checklist ({checks.filter((c) => c.done).length}/{checks.length})</h4>
              <div className="space-y-1 mb-3">
                {checks.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
                {checks.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 group">
                    <Checkbox checked={!!c.done} onCheckedChange={(v) => toggleCheckMut.mutate({ id: c.id, done: !!v })} />
                    <span className={c.done ? "line-through text-muted-foreground text-sm flex-1" : "text-sm flex-1"}>{c.label}</span>
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7"
                      onClick={() => delCheckMut.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newCheck.trim()) return; addCheckMut.mutate(newCheck.trim()); setNewCheck(""); }}>
                <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} placeholder="Add checklist item…" />
                <Button type="submit" size="sm"><Plus className="h-4 w-4" /></Button>
              </form>
            </section>

            <section className="rounded-lg border p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3"><MessageSquare className="h-4 w-4" /> Comments ({comments.length})</h4>
              <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="rounded-md bg-muted/50 p-2 text-sm group">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                      <span className="font-medium text-foreground">{c.author || "Anonymous"}</span>
                      <span>· {c.created_at ? new Date(c.created_at).toLocaleString() : ""}</span>
                      <Button size="icon" variant="ghost" className="ml-auto opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={() => delCommentMut.mutate(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
              <form className="grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                if (!commentBody.trim()) return;
                addCommentMut.mutate({ author: commentAuthor.trim() || "You", body: commentBody.trim() });
                setCommentBody("");
              }}>
                <Input value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} placeholder="Your name (optional)" />
                <Textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Write a comment… use @name to mention" rows={2} />
                <div className="flex justify-end">
                  <Button type="submit" size="sm"><MessageSquare className="h-4 w-4 mr-1" /> Post</Button>
                </div>
              </form>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
