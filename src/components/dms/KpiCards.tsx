import { Users, FolderKanban, UserRoundCog, DollarSign, LifeBuoy, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db-client";
import { useLocalArray } from "@/lib/use-local-array";

type Invoice = { id: number; total: number; amount_paid: number; invoice_date: string; status: string };
type Client = { id: number; stage: string };
type Ticket = { id: number; status: string };

function useCount(table: string) {
  return useQuery({
    queryKey: [table, "count"],
    queryFn: async () => {
      const { count } = await db.from(table as any).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

function useActiveProjects() {
  return useQuery({
    queryKey: ["projects", "active-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled,archived)");
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

const fmtPKR = (n: number) => {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
  return `PKR ${n.toFixed(0)}`;
};

export function KpiCards() {
  const employees = useCount("employees");
  const activeProjects = useActiveProjects();
  const invoices = useLocalArray<Invoice>("invoices");
  const clients = useLocalArray<Client>("clients_v2");
  const tickets = useLocalArray<Ticket>("support_v2");

  const now = new Date();
  const monthlyRevenue = invoices
    .filter((i) => {
      const d = new Date(i.invoice_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  const kpis = [
    { label: "Total Employees", value: String(employees.data ?? "…"), change: "8%", up: true, icon: Users, tint: "oklch(0.55 0.22 275)" },
    { label: "Active Projects", value: String(activeProjects.data ?? "…"), change: "12%", up: true, icon: FolderKanban, tint: "oklch(0.68 0.18 155)" },
    { label: "Total Clients", value: String(clients.length), change: "15%", up: true, icon: UserRoundCog, tint: "oklch(0.72 0.18 55)" },
    { label: "Monthly Revenue", value: fmtPKR(monthlyRevenue), change: "18%", up: true, icon: DollarSign, tint: "oklch(0.75 0.16 185)" },
    { label: "Open Tickets", value: String(openTickets), change: "5%", up: openTickets === 0, icon: LifeBuoy, tint: "oklch(0.65 0.2 25)" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        const Trend = k.up ? TrendingUp : TrendingDown;
        return (
          <div key={k.label} className="group relative overflow-hidden rounded-2xl bg-card p-5 border shadow-sm hover:shadow-md transition-all">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${k.tint}, transparent)` }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground whitespace-nowrap">{k.value}</p>
              </div>
              <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105"
                style={{ background: `color-mix(in oklab, ${k.tint} 14%, transparent)`, color: k.tint }}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs">
              <Trend className="h-3.5 w-3.5" style={{ color: k.up ? "oklch(0.68 0.18 155)" : "oklch(0.65 0.2 25)" }} />
              <span className="font-semibold" style={{ color: k.up ? "oklch(0.68 0.18 155)" : "oklch(0.65 0.2 25)" }}>{k.change}</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
