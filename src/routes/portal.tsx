import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  LifeBuoy,
  FileText,
  CalendarDays,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  MessageSquare,
  CreditCard,
  Package,
  User,
  Headphones,
  ChevronDown,
} from "lucide-react";
import { RequirePortalAuth, usePortalIdentity } from "@/lib/portal-auth";
import { useAuth } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import { KEYS, readList, type PortalNotification, startPortalSession, heartbeatPortalSession, endPortalSession } from "@/lib/portal-data";
const devionicLogo = "/devionic-logo.png";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Client Portal — Devionic" },
      { name: "description", content: "Devionic Client Portal — projects, tasks, invoices, tickets, documents, meetings & more." },
      { property: "og:title", content: "Devionic Client Portal" },
      { property: "og:description", content: "Self-service portal for Devionic clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalLayout,
});

type NavItem = { to: string; icon: any; label: string; group: string; exact?: boolean };

const NAV: NavItem[] = [
  { to: "/portal", icon: LayoutDashboard, label: "Dashboard", exact: true, group: "Overview" },
  { to: "/portal/projects", icon: FolderKanban, label: "Projects", group: "Work" },
  { to: "/portal/tickets", icon: LifeBuoy, label: "Support Tickets", group: "Work" },
  { to: "/portal/meetings", icon: CalendarDays, label: "Meetings", group: "Work" },
  { to: "/portal/quotations", icon: FileText, label: "Quotations", group: "Billing" },
  { to: "/portal/invoices", icon: Receipt, label: "Invoices", group: "Billing" },
  { to: "/portal/payments", icon: CreditCard, label: "Payments", group: "Billing" },
  { to: "/portal/services", icon: Package, label: "Services & Products", group: "Catalog" },
  { to: "/portal/messages", icon: MessageSquare, label: "Messages", group: "Account" },
  { to: "/portal/notifications", icon: Bell, label: "Notifications", group: "Account" },
  { to: "/portal/profile", icon: User, label: "Profile & Settings", group: "Account" },
];

const GROUP_ORDER = ["Overview", "Work", "Billing", "Catalog", "Account"];

function PortalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = pathname === "/portal/login" || pathname === "/portal/register";
  if (isPublic) return <Outlet />;
  return (
    <RequirePortalAuth>
      <PortalShell />
    </RequirePortalAuth>
  );
}

function PortalShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ident = usePortalIdentity();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { document.title = "Client Portal — Devionic"; }, []);
  useEffect(() => { setMobileOpen(false); setNotifOpen(false); setProfileOpen(false); }, [pathname]);

  // Session tracking: start on mount, heartbeat every 30s, end on unload/logout.
  useEffect(() => {
    if (!ident.email) return;
    startPortalSession({ email: ident.email, name: ident.name, company: ident.company });
    const iv = window.setInterval(() => heartbeatPortalSession(), 30_000);
    const onUnload = () => endPortalSession();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("beforeunload", onUnload);
      endPortalSession();
    };
  }, [ident.email, ident.name, ident.company]);

  const handleLogout = async () => { endPortalSession(); await logout(); navigate({ to: "/portal/login" }); };

  const clientKey = (ident.company || ident.name || ident.email).toLowerCase();
  const notifications = useMemo(
    () => readList<PortalNotification>(KEYS.notifications)
      .filter((n) => n.audience === "all" || (n.audience_key ?? "").toLowerCase().includes(clientKey))
      .slice(0, 6),
    [clientKey, notifOpen],
  );
  const unread = notifications.filter((n) => !n.read).length;

  const active = useMemo(
    () => NAV.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to))),
    [pathname],
  );

  const initials = (ident.name || ident.email || "?")
    .split(/\s+/).map((s: string) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-muted/30 via-background to-muted/40">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 shrink-0 border-r bg-white text-foreground transform transition-all duration-300 md:flex md:flex-col ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"
        } ${
          sidebarOpen ? "md:sticky md:top-0 md:h-screen md:translate-x-0 md:w-72" : "md:absolute md:-translate-x-full md:w-0 md:border-none md:overflow-hidden"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b">
          <img src={devionicLogo} alt="Devionic" className="h-9 w-auto object-contain" />
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden ml-auto h-8 w-8 grid place-items-center rounded-md hover:bg-accent"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUP_ORDER.map((group) => {
            const items = NAV.filter((n) => n.group === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {items.map((n) => {
                    const isActive = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground/70 hover:text-foreground hover:bg-accent/60"
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />}
                        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-2">
          <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center gap-2 text-primary">
              <Headphones className="h-4 w-4" />
              <span className="text-xs font-semibold">Need Help?</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
              Our support team is ready to assist you.
            </p>
            <Link
              to="/portal/tickets"
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 h-8 text-[11px] font-medium hover:opacity-90"
            >
              Contact Support
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-label="Close" />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 shrink-0 border-b bg-card/80 backdrop-blur flex items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true);
              } else {
                setSidebarOpen((prev) => !prev);
              }
            }}
            className="h-9 w-9 grid place-items-center rounded-md border hover:bg-accent shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="hidden md:flex flex-1 max-w-xl items-center gap-2 h-10 px-3.5 rounded-full border bg-background/70">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search anything…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="md:hidden min-w-0 flex-1">
            <div className="text-base font-semibold truncate">{active?.label ?? "Portal"}</div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link to="/portal/messages" className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-accent" aria-label="Messages">
              <MessageSquare className="h-4 w-4" />
            </Link>
            <div className="relative">
              <button
                onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
                className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-accent"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-popover shadow-xl overflow-hidden z-30">
                  <div className="px-4 py-2.5 border-b flex items-center justify-between">
                    <span className="text-sm font-semibold">Notifications</span>
                    <Link to="/portal/notifications" className="text-[11px] text-primary hover:underline">View All</Link>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Nothing new.</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y">
                      {notifications.map((n) => (
                        <div key={n.id} className="px-4 py-3">
                          <div className="text-sm font-medium">{n.title}</div>
                          {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                          <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
                className="flex items-center gap-2 pl-2 pr-1 h-10 rounded-full hover:bg-accent"
              >
                <div className="hidden sm:block text-right leading-tight">
                  <div className="text-xs font-semibold truncate max-w-[140px]">{ident.name || ident.email}</div>
                  {ident.company && <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{ident.company}</div>}
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-[11px] font-semibold">
                  {initials}
                </div>
                <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-popover shadow-xl overflow-hidden z-30">
                  <Link to="/portal/profile" className="block px-4 py-2.5 text-sm hover:bg-accent">Profile & Settings</Link>
                  <Link to="/portal/notifications" className="block px-4 py-2.5 text-sm hover:bg-accent">Notifications</Link>
                  <Link to="/portal/tickets" className="block px-4 py-2.5 text-sm hover:bg-accent">Support</Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 border-t">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Outlet />
        </main>

        <footer className="border-t bg-card/50 px-6 py-3 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {COMPANY.name}</span>
          <span className="flex items-center gap-3">
            <a href={`mailto:${COMPANY.email}`} className="hover:text-foreground">{COMPANY.email}</a>
            <span>•</span>
            <span>{COMPANY.website}</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
