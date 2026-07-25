import { Activity, FolderPlus, Wallet, CheckCircle2, CalendarDays, UserPlus, FileText, Users, Ticket, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<string, { icon: any; color: string }> = {
  projects: { icon: FolderPlus, color: "bg-violet-100 text-violet-600" },
  finance: { icon: Wallet, color: "bg-emerald-100 text-emerald-600" },
  tasks: { icon: CheckCircle2, color: "bg-orange-100 text-orange-600" },
  leaves: { icon: CalendarDays, color: "bg-rose-100 text-rose-600" },
  employees: { icon: UserPlus, color: "bg-sky-100 text-sky-600" },
  docs: { icon: FileText, color: "bg-indigo-100 text-indigo-600" },
  users: { icon: Users, color: "bg-fuchsia-100 text-fuchsia-600" },
  support: { icon: Ticket, color: "bg-amber-100 text-amber-600" },
  settings: { icon: Settings, color: "bg-slate-100 text-slate-600" },
  default: { icon: Activity, color: "bg-muted text-foreground" },
};

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RecentActivity() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_activity_logs")
        .select("id, action, module, description, full_name, username, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const items = q.data ?? [];

  return (
    <div className="rounded-2xl bg-card p-5 border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <button onClick={() => navigate({ to: "/logs" })} className="text-primary text-xs font-semibold hover:underline">View All</button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {items.map((it: any) => {
            const meta = ICONS[String(it.module ?? "").toLowerCase()] ?? ICONS.default;
            const Icon = meta.icon;
            return (
              <div key={it.id} className="flex gap-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{it.action}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.description ?? it.full_name ?? it.username ?? "System"}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{ago(it.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
