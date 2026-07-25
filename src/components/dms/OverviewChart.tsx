import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useMemo } from "react";
import { useLocalArray } from "@/lib/use-local-array";

type Txn = { id: number; date: string; type: "income" | "expense" | "transfer"; net_amount: number; amount: number };

export function OverviewChart() {
  const txns = useLocalArray<Txn>("finance_v2");

  const data = useMemo(() => {
    const days = 30;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    const buckets = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { revenue: 0, expenses: 0 });
    }
    for (const t of txns) {
      const key = String(t.date ?? "").slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      const amt = Number(t.net_amount ?? t.amount ?? 0);
      if (t.type === "income") b.revenue += amt;
      else if (t.type === "expense") b.expenses += amt;
    }
    return Array.from(buckets.entries()).map(([iso, v]) => {
      const d = new Date(iso);
      return {
        day: `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`,
        revenue: +(v.revenue / 1_000_000).toFixed(2),
        expenses: +(v.expenses / 1_000_000).toFixed(2),
      };
    });
  }, [txns]);

  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0);

  return (
    <div className="rounded-2xl bg-card p-5 border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Overview Analytics</h3>
        <span className="text-xs text-muted-foreground">Last 30 days</span>
      </div>
      <div className="flex items-center gap-4 text-xs mb-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Revenue (PKR M)</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Expenses (PKR M)</span>
      </div>
      <div className="h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.22 275)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.55 0.22 275)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 55)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 55)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 255)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.55 0.22 275)" strokeWidth={2} fill="url(#rev)" />
              <Area type="monotone" dataKey="expenses" stroke="oklch(0.72 0.18 55)" strokeWidth={2} fill="url(#exp)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">No financial transactions in the last 30 days.</div>
        )}
      </div>
    </div>
  );
}
