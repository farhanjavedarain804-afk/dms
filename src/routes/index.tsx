import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/dms/Layout";
import { CalendarDays, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const KpiCards = lazy(() => import("@/components/dms/KpiCards").then((m) => ({ default: m.KpiCards })));
const OverviewChart = lazy(() => import("@/components/dms/OverviewChart").then((m) => ({ default: m.OverviewChart })));
const ProjectsStatus = lazy(() => import("@/components/dms/ProjectsStatus").then((m) => ({ default: m.ProjectsStatus })));
const RecentActivity = lazy(() => import("@/components/dms/RecentActivity").then((m) => ({ default: m.RecentActivity })));
const BottomWidgets = lazy(() => import("@/components/dms/BottomWidgets").then((m) => ({ default: m.BottomWidgets })));
const QuickActionsAndAI = lazy(() => import("@/components/dms/BottomWidgets").then((m) => ({ default: m.QuickActionsAndAI })));

function DashboardBlockFallback({ className = "" }: { className?: string }) {
  return <div className={`min-h-32 animate-pulse rounded-lg border bg-card ${className}`} />;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Devionic DMS" },
      { name: "description", content: "Devionic's internal enterprise Digital Management System." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = (user?.name ?? "there").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <AppLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {firstName}! 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening in Devionic today.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate({ to: "/attendance" })}
            className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
            <CalendarDays className="h-4 w-4" /> {today}
          </button>
          <button onClick={() => toast.success("Dashboard preferences saved")}
            className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
            <Settings2 className="h-4 w-4" /> Customize Dashboard
          </button>
        </div>
      </div>

      <Suspense fallback={<DashboardBlockFallback />}>
        <KpiCards />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Suspense fallback={<DashboardBlockFallback className="xl:col-span-6" />}>
          <div className="xl:col-span-6"><OverviewChart /></div>
        </Suspense>
        <Suspense fallback={<DashboardBlockFallback className="xl:col-span-3" />}>
          <div className="xl:col-span-3"><ProjectsStatus /></div>
        </Suspense>
        <Suspense fallback={<DashboardBlockFallback className="xl:col-span-3" />}>
          <div className="xl:col-span-3"><RecentActivity /></div>
        </Suspense>
      </div>

      <Suspense fallback={<DashboardBlockFallback />}>
        <BottomWidgets />
      </Suspense>
      <Suspense fallback={null}>
        <QuickActionsAndAI />
      </Suspense>
    </AppLayout>
  );
}
