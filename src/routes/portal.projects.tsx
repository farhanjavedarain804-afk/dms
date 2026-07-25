import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Calendar, TrendingUp, CheckCircle2, Loader2, PauseCircle, Clock, Radio } from "lucide-react";
import { resources } from "@/lib/api";
import { usePortalIdentity } from "@/lib/portal-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/portal/projects")({
  head: () => ({
    meta: [
      { title: "My Projects — Devionic Portal" },
      { name: "description", content: "Track your Devionic projects, milestones and progress in real time." },
      { property: "og:title", content: "My Projects — Devionic Portal" },
      { property: "og:description", content: "Track your Devionic projects and milestones." },
    ],
  }),
  component: PortalProjects,
});

type Filter = "all" | "in_progress" | "completed" | "on_hold" | "planning";

function PortalProjects() {
  const ident = usePortalIdentity();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: all = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["portal", "projects"],
    queryFn: () => resources.projects.list(),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  // Realtime: sync from DMS Project Management the moment anything changes
  useEffect(() => {
    const channel = supabase
      .channel("portal-projects-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        qc.invalidateQueries({ queryKey: ["portal", "projects"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const mine = useMemo(() => {
    return all.filter((p) => {
      if (!ident.company && !ident.name) return false;
      const c = (p.client ?? "").toLowerCase();
      return (
        (ident.company && c.includes(ident.company.toLowerCase())) ||
        (ident.name && c.includes(ident.name.toLowerCase()))
      );
    });
  }, [all, ident.company, ident.name]);

  const counts = useMemo(() => ({
    all: mine.length,
    in_progress: mine.filter((p) => p.status === "in_progress").length,
    completed: mine.filter((p) => p.status === "completed").length,
    on_hold: mine.filter((p) => p.status === "on_hold").length,
    planning: mine.filter((p) => p.status === "planning").length,
  }), [mine]);

  const projects = filter === "all" ? mine : mine.filter((p) => p.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Projects</h2>
          <p className="text-sm text-muted-foreground">Live view of every project Devionic is running for you — synced from Project Management.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Radio className="h-3 w-3" /> Live · updated {new Date(dataUpdatedAt || Date.now()).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatChip label="All" value={counts.all} active={filter === "all"} onClick={() => setFilter("all")} icon={FolderKanban} />
        <StatChip label="In Progress" value={counts.in_progress} active={filter === "in_progress"} onClick={() => setFilter("in_progress")} icon={Loader2} tone="blue" />
        <StatChip label="Completed" value={counts.completed} active={filter === "completed"} onClick={() => setFilter("completed")} icon={CheckCircle2} tone="emerald" />
        <StatChip label="On Hold" value={counts.on_hold} active={filter === "on_hold"} onClick={() => setFilter("on_hold")} icon={PauseCircle} tone="amber" />
        <StatChip label="Planning" value={counts.planning} active={filter === "planning"} onClick={() => setFilter("planning")} icon={Clock} tone="slate" />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && projects.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {mine.length === 0
            ? "No projects visible for your account yet. New projects appear here automatically."
            : "No projects in this status."}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.code ?? "—"} · {p.department ?? "—"}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Progress</span>
                <span className="font-medium">{p.progress ?? 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    p.status === "completed" ? "bg-emerald-500" :
                    p.status === "on_hold" ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, p.progress ?? 0)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <div className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Start</div>
                <div className="font-medium">{p.start_date ?? "—"}</div>
              </div>
              <div className="rounded-md bg-muted/40 px-2 py-1.5">
                <div className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Deadline</div>
                <div className="font-medium">{p.deadline ?? "—"}</div>
              </div>
            </div>
            {p.manager && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t">
                Project manager: <span className="font-medium text-foreground">{p.manager}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatChip({
  label, value, active, onClick, icon: Icon, tone,
}: { label: string; value: number; active: boolean; onClick: () => void; icon: any; tone?: string }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-600" :
    tone === "blue" ? "text-blue-600" :
    tone === "amber" ? "text-amber-600" :
    tone === "slate" ? "text-slate-600" : "text-primary";
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${active ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-card hover:bg-muted/40"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    planning: "bg-slate-500/15 text-slate-600",
    in_progress: "bg-blue-500/15 text-blue-600",
    on_hold: "bg-amber-500/15 text-amber-600",
    completed: "bg-emerald-500/15 text-emerald-600",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[status ?? ""] ?? "bg-muted"}`}>
      {(status ?? "—").replace("_", " ")}
    </span>
  );
}
