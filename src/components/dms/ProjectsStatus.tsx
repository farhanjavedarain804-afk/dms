import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const COLORS: Record<string, string> = {
  completed: "oklch(0.68 0.18 155)",
  in_progress: "oklch(0.6 0.2 250)",
  on_hold: "oklch(0.72 0.18 55)",
  not_started: "oklch(0.75 0.02 250)",
  planning: "oklch(0.72 0.13 250)",
  cancelled: "oklch(0.65 0.2 25)",
  archived: "oklch(0.7 0.02 250)",
};
const LABEL: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  on_hold: "On Hold",
  not_started: "Not Started",
  planning: "Planning",
  cancelled: "Cancelled",
  archived: "Archived",
};

export function ProjectsStatus() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["projects", "status-breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        const s = String(r.status ?? "not_started").toLowerCase().replace(/\s+/g, "_");
        counts[s] = (counts[s] ?? 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({
        key: name,
        name: LABEL[name] ?? name,
        value,
        color: COLORS[name] ?? "oklch(0.7 0.05 250)",
      }));
    },
    staleTime: 30_000,
  });

  const data = q.data ?? [];
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="rounded-2xl bg-card p-5 border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4">Projects Status</h3>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} innerRadius={40} outerRadius={64} dataKey="value" paddingAngle={2}>
                  {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 text-xs min-w-0">
            {data.map((d) => (
              <div key={d.key} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <div className="min-w-0">
                  <p className="text-muted-foreground truncate">{d.name}</p>
                  <p className="font-semibold text-foreground">
                    {d.value} <span className="text-muted-foreground font-normal">({((d.value / total) * 100).toFixed(1)}%)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Total Projects</p>
          <p className="font-bold text-lg">{total}</p>
        </div>
        <button onClick={() => navigate({ to: "/projects" })} className="text-primary text-xs font-semibold hover:underline">View All Projects →</button>
      </div>
    </div>
  );
}
