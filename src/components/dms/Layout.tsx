import { lazy, Suspense, type ReactNode } from "react";
import { RequireAuth } from "@/lib/auth";
import { useLayoutStore } from "@/lib/layout-store";

const Sidebar = lazy(() => import("./Sidebar").then((m) => ({ default: m.Sidebar })));
const Header = lazy(() => import("./Header").then((m) => ({ default: m.Header })));

export function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen, mobileOpen, setMobileOpen } = useLayoutStore();
  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-muted/40">
        <Suspense fallback={<div className={`hidden shrink-0 border-r bg-sidebar md:block ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'}`} />}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0">
          <Suspense fallback={<div className="h-16 shrink-0 border-b bg-card" />}>
            <Header />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-6 space-y-5">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-foreground tracking-tight truncate">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );

}
