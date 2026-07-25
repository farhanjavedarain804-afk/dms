import type { LucideIcon } from "lucide-react";

export type Stat = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tint?: string;
};

const DEFAULT_TINTS = [
  "oklch(0.55 0.22 275)",
  "oklch(0.75 0.16 185)",
  "oklch(0.72 0.18 55)",
  "oklch(0.68 0.18 155)",
];

export function StatsCards({ stats, loading, className }: { stats: Stat[]; loading?: boolean; className?: string }) {
  return (
    <div className={className ?? "grid grid-cols-2 xl:grid-cols-4 gap-4"}>

      {stats.map((s, i) => {
        const Icon = s.icon;
        const tint = s.tint ?? DEFAULT_TINTS[i % DEFAULT_TINTS.length];
        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl bg-card p-5 border shadow-sm hover:shadow-md transition-all"
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${tint}, transparent)` }}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground whitespace-nowrap truncate">
                  {loading ? "…" : s.value}
                </p>
                {s.hint && (
                  <p className="mt-1 text-xs text-muted-foreground truncate">{s.hint}</p>
                )}
              </div>
              <div
                className="h-11 w-11 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105"
                style={{
                  background: `color-mix(in oklab, ${tint} 14%, transparent)`,
                  color: tint,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
