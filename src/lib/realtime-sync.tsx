import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db-client";

// Tables that drive KPI cards and cross-module stats.
const TABLES = [
  "employees", "attendance", "tasks", "projects", "project_members",
  "project_milestones", "project_task_checklists", "project_task_comments",
  "project_timesheets", "project_expenses", "project_budgets",
  "project_documents", "project_meetings", "project_activity_logs",
  "app_users", "user_activity_logs", "user_login_logs",
  "internal_messages", "internal_notices", "meetings", "feedback_calls",
  "departments",
];

// Throttle invalidations so a burst of changes triggers at most one refetch cycle.
export function RealtimeSync() {
  const qc = useQueryClient();
  const timer = useRef<number | null>(null);
  const dirty = useRef<Set<string>>(new Set());

  useEffect(() => {
    let channel: ReturnType<typeof db.channel> | null = null;
    let cancelled = false;

    const flush = () => {
      timer.current = null;
      const changed = Array.from(dirty.current);
      dirty.current.clear();
      if (changed.length === 0) return;
      // Invalidate ALL matching queries (not just active) so background lists
      // show fresh data instantly when re-opened.
      qc.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return key.some((k) =>
            typeof k === "string" && changed.some((t) => k === t || k.includes(t)),
          );
        },
        refetchType: document.hidden ? "none" : "active",
      });
      window.dispatchEvent(new CustomEvent("dms:realtime", { detail: { tables: changed } }));
    };

    const schedule = (table: string) => {
      dirty.current.add(table);
      if (timer.current == null) {
        // Snappy 250ms coalescing window — instant-feeling updates, still batches bursts.
        timer.current = window.setTimeout(flush, 250);
      }
    };

    const start = () => {
      if (cancelled || channel) return;
      channel = db.channel("dms-realtime-kpi");
      for (const t of TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: t },
          () => schedule(t),
        );
      }
      channel.subscribe();
    };

    // Start immediately so data stays live from first paint.
    start();

    const onVisible = () => {
      if (!document.hidden) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current != null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (channel) db.removeChannel(channel);
    };
  }, [qc]);

  return null;
}

