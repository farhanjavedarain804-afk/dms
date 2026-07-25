import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap, Plus } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, writeList, nextId, type PortalChangeRequest } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/change-requests")({
  head: () => ({
    meta: [
      { title: "Change Requests — Devionic Portal" },
      { name: "description", content: "Submit change requests for ongoing projects." },
      { property: "og:title", content: "Change Requests — Devionic Portal" },
      { property: "og:description", content: "Submit change requests for ongoing projects." },
    ],
  }),
  component: PortalCRs,
});

function PortalCRs() {
  const ident = usePortalIdentity();
  const clientKey = ident.company || ident.name || ident.email;
  const [rows, setRows] = useState<PortalChangeRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project: "", priority: "medium" as const });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const all = readList<PortalChangeRequest>(KEYS.change_requests);
    setRows(all.filter((r) => r.client_key.toLowerCase() === clientKey.toLowerCase()));
  }, [clientKey, tick]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const all = readList<PortalChangeRequest>(KEYS.change_requests);
    const id = nextId(all);
    const row: PortalChangeRequest = {
      id,
      code: `CR-${String(id).padStart(4, "0")}`,
      title: form.title.trim(),
      description: form.description.trim(),
      client_key: clientKey,
      project: form.project.trim() || undefined,
      priority: form.priority,
      status: "submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    writeList(KEYS.change_requests, [row, ...all]);
    setForm({ title: "", description: "", project: "", priority: "medium" });
    setOpen(false);
    toast.success(`${row.code} submitted`);
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Change Requests</h2>
          <p className="text-sm text-muted-foreground">Request changes on any active project.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New CR</Button>
      </div>

      {open && (
        <form onSubmit={submit} className="rounded-xl border bg-card p-5 space-y-3">
          <Field label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
          </Field>
          <Field label="Details">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project (optional)">
              <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No change requests yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">{r.code} · {r.project ?? "General"}</div>
                  <div className="font-semibold truncate">{r.title}</div>
                  {r.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</div>}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={r.status} />
                  <div className="text-[11px] text-muted-foreground mt-1">{r.priority}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><label className="text-xs text-muted-foreground">{label}</label>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-blue-500/15 text-blue-600",
    in_review: "bg-amber-500/15 text-amber-600",
    approved: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-rose-500/15 text-rose-600",
    completed: "bg-slate-500/15 text-slate-600",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted"}`}>{status.replace("_", " ")}</span>;
}
