import {
  LayoutDashboard, Users, Briefcase, Clock, FolderKanban, CheckSquare,
  UserRoundCog, Wallet, ShoppingBag, Package, FileText, Server,
  LifeBuoy, BarChart3, MessageSquare, Sparkles, Settings,
  UserCircle2, HelpCircle, LogOut, Receipt, FileSpreadsheet, FileSignature,
  Rocket, Trello, Flag, UsersRound, Timer, FolderOpen, CalendarClock,
  Coins, ReceiptText, CalendarDays, GanttChart, Bell, ChevronDown, ShieldCheck,
  PhoneCall, History, Scale, ClipboardCheck, Search, Zap, BookOpen, Mail,
  Keyboard, ExternalLink, ArrowLeftRight, PackageSearch, GraduationCap, Camera, X, ScrollText, Truck, Landmark, Award, BadgeCheck,
} from "lucide-react";


import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
const logo = "/devionic-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const SidebarDialogs = lazy(() =>
  import("./SidebarDialogs").then((m) => ({ default: m.SidebarDialogs })),
);


type NavItem = { icon: any; label: string; to: string; children?: NavItem[] };
type NavSection = { heading?: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/" },
      { icon: Users, label: "Employees", to: "/employees" },
      { icon: Briefcase, label: "HR & Payroll", to: "/hr" },
      { icon: GraduationCap, label: "Interns", to: "/interns" },
      { icon: Clock, label: "Attendance", to: "/attendance" },
      { icon: CalendarDays, label: "Leaves & Holidays", to: "/leaves" },
      { icon: FolderKanban, label: "Project Management", to: "/projects" },
      { icon: CheckSquare, label: "Tasks", to: "/tasks" },
      { icon: UserRoundCog, label: "Clients & CRM", to: "/clients" },
      { icon: Wallet, label: "Financials", to: "/finance" },
      { icon: ArrowLeftRight, label: "Transactions", to: "/transactions" },

      { icon: PackageSearch, label: "Products & Services", to: "/catalog" },
      { icon: Receipt, label: "Invoices", to: "/invoices" },
      { icon: FileSpreadsheet, label: "Quotations", to: "/quotations" },
      { icon: Truck, label: "Purchase & Vendors", to: "/purchase" },
      { icon: Landmark, label: "Tax & Compliance", to: "/tax" },

      { icon: ShoppingBag, label: "Sales & Invoice History", to: "/sales" },
      { icon: UsersRound, label: "Clients History", to: "/clients-history" },
      { icon: History, label: "Employee History", to: "/employees-history" },
      { icon: PhoneCall, label: "Feedback Calls", to: "/feedback" },
      { icon: Package, label: "Assets & Inventory", to: "/inventory" },
      { icon: FileText, label: "Docs & Records", to: "/docs" },
      { icon: FileSignature, label: "Document Center", to: "/letters" },
      { icon: Award, label: "Certificate Issuance", to: "/certificates" },
      { icon: BadgeCheck, label: "Record Verification", to: "/verification" },

      { icon: Server, label: "IT Infrastructure", to: "/it" },
      { icon: LifeBuoy, label: "Support Tickets", to: "/support" },
      { icon: Scale, label: "Case Management", to: "/cases" },
      { icon: BarChart3, label: "Reports & Analytics", to: "/reports" },
      { icon: ClipboardCheck, label: "Audit", to: "/audit" },
      { icon: MessageSquare, label: "Communication", to: "/communication" },
      { icon: Sparkles, label: "AI Assistant", to: "/ai" },
      { icon: ShieldCheck, label: "Users & Access", to: "/users" },
      { icon: ExternalLink, label: "Client Management", to: "/portal-admin" },
      { icon: ScrollText, label: "System Logs", to: "/logs" },
      { icon: Settings, label: "Settings", to: "/settings" },


    ],
  },
];



export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "/pm": pathname.startsWith("/pm"),
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const load = () => {
      try {
        const p = JSON.parse(localStorage.getItem("dms:preferences") || "{}");
        setAvatarUrl(typeof p.avatarUrl === "string" ? p.avatarUrl : "");
      } catch { setAvatarUrl(""); }
    };
    load();
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === "dms:preferences") load(); };
    const onCustom = () => load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("dms:prefs-updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dms:prefs-updated", onCustom);
    };
  }, []);

  function saveAvatar(next: string) {
    try {
      const p = JSON.parse(localStorage.getItem("dms:preferences") || "{}");
      p.avatarUrl = next;
      localStorage.setItem("dms:preferences", JSON.stringify(p));
      setAvatarUrl(next);
      window.dispatchEvent(new Event("dms:prefs-updated"));
    } catch (e: any) {
      toast.error("Failed to save picture");
    }
  }

  async function onPickFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      saveAvatar(dataUrl);
      toast.success("Profile picture updated");
    };
    reader.onerror = () => toast.error("Could not read image");
    reader.readAsDataURL(file);
  }

  const allItems = useMemo(
    () => sections.flatMap((s) => s.items.flatMap((i) => (i.children ? [i, ...i.children] : [i]))),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (to: string) => {
    const exact = to === "/" || to === "/pm";
    return exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  };


  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <img src={logo.url} alt="Devionic" className="h-9 w-auto brightness-0 invert" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {sections.map((section, si) => (
          <div key={si} className="space-y-0.5">
            {section.heading && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                {section.heading}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              if (item.children) {
                const open = openGroups[item.to] ?? pathname.startsWith(item.to);
                const groupActive = pathname.startsWith(item.to);
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setOpenGroups((s) => ({ ...s, [item.to]: !open }))}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        groupActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </button>
                    {open && (
                      <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
                        {item.children.map((child) => {
                          const CIcon = child.icon;
                          const cActive = isActive(child.to);
                          return (
                            <Link
                              key={child.to}
                              to={child.to}
                              className={cn(
                                "w-full flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                                cActive
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              )}
                            >
                              <CIcon className="h-3.5 w-3.5" />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const active = isActive(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Zap className="h-4 w-4" />
          <span className="flex-1 text-left">Quick Access</span>
          <kbd className="text-[10px] font-mono bg-sidebar-accent/60 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="flex-1 text-left">Help Center</span>
          <kbd className="text-[10px] font-mono bg-sidebar-accent/60 px-1.5 py-0.5 rounded">⌘/</kbd>
        </button>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/60 transition-colors">
          <div className="relative shrink-0 group">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={avatarUrl ? "Change picture" : "Upload picture"}
              className="block h-10 w-10 rounded-full overflow-hidden ring-2 ring-sidebar-border hover:ring-primary transition"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {(user?.name || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => { saveAvatar(""); toast.success("Picture removed"); }}
                title="Remove picture"
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          <Link to="/settings" className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email || ""}</div>
            {user?.role && (
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mt-0.5">{user.role}</div>
            )}
          </Link>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-sidebar-accent/40 hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>

      {(quickOpen || helpOpen) && (
        <Suspense fallback={null}>
          <SidebarDialogs
            quickOpen={quickOpen}
            setQuickOpen={setQuickOpen}
            helpOpen={helpOpen}
            setHelpOpen={setHelpOpen}
            allItems={allItems}
            onNavigate={(to) => navigate({ to: to as any })}
          />
        </Suspense>
      )}
    </aside>
  );
}

