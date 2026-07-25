import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckSquare, Circle, Clock } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";

export const Route = createFileRoute("/portal/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Devionic Client Portal" },
      { name: "description", content: "Track tasks assigned to your projects." },
      { property: "og:title", content: "Tasks — Devionic Client Portal" },
      { property: "og:description", content: "Track tasks assigned to your projects." },
    ],
  }),
  component: PortalTasks,
});

function PortalTasks() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    try {
      const tasks = JSON.parse(window.localStorage.getItem("dms:tasks") ?? "[]") as any[];
      const projects = JSON.parse(window.localStorage.getItem("dms:projects") ?? "[]") as any[];
      const myProjects = new Set(
        projects
          .filter((p) => {
            const c = (p.client ?? "").toLowerCase();
            return (
              (ident.company && c.includes(ident.company.toLowerCase())) ||
              (ident.name && c.includes(ident.name.toLowerCase()))
            );
          })
          .map((p) => p.id ?? p.name),
      );
      setRows(tasks.filter((t) => myProjects.has(t.project_id) || myProjects.has(t.project)));
    } catch { setRows([]); }
  }, [ident.company, ident.name]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
        <p className="text-sm text-muted-foreground">Tasks scoped to your active projects.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyCard icon={CheckSquare} text="No tasks visible on your projects yet." />
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {rows.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
              <StatusIcon status={t.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.title ?? t.name ?? `Task #${t.id}`}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {t.project ?? "—"} · Due {t.due_date ?? "—"}
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{(t.status ?? "—").replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "done" || status === "completed") return <CheckSquare className="h-4 w-4 text-emerald-600" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-blue-600" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function EmptyCard({ icon: Icon, text }: any) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}
