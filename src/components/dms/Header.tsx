import { Search, Bell, MessageSquare, Sun, Moon, LogOut, HelpCircle, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLayoutStore } from "@/lib/layout-store";

const MODULES: { label: string; to: string }[] = [
  { label: "Dashboard", to: "/" },
  { label: "Employees", to: "/employees" },
  { label: "HR & Payroll", to: "/hr" },
  { label: "Attendance", to: "/attendance" },
  { label: "Projects", to: "/projects" },
  { label: "Tasks", to: "/tasks" },
  { label: "Clients & CRM", to: "/clients" },
  { label: "Financials", to: "/finance" },
  { label: "Sales & Invoice History", to: "/sales" },
  { label: "Assets & Inventory", to: "/inventory" },
  { label: "Docs & Records", to: "/docs" },
  { label: "IT Infrastructure", to: "/it" },
  { label: "Support Tickets", to: "/support" },
  { label: "Reports & Analytics", to: "/reports" },
  { label: "Communication", to: "/communication" },
  { label: "AI Assistant", to: "/ai" },
  { label: "Settings", to: "/settings" },
];

const NOTIFICATIONS = [
  { title: "New project assigned", detail: "Nexus Fintech - Mobile Banking App", time: "2m ago" },
  { title: "Payroll processed", detail: "July 2026 salaries cleared", time: "1h ago" },
  { title: "Support ticket #TCK-2101", detail: "High priority, awaiting response", time: "3h ago" },
  { title: "New client signed", detail: "Zeta Retail confirmed the retainer", time: "1d ago" },
];

export function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar, setMobileOpen } = useLayoutStore();
  const navigate = useNavigate();
  const initials = (user?.name ?? "U")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const [query, setQuery] = useState("");
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem("dms:theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); setDark(true); }
    const readAvatar = () => {
      try {
        const p = JSON.parse(window.localStorage.getItem("dms:preferences") || "{}");
        setAvatarUrl(p?.avatarUrl || "");
      } catch { setAvatarUrl(""); }
    };
    readAvatar();
    const onPrefs = () => readAvatar();
    const onStorage = (e: StorageEvent) => { if (e.key === "dms:preferences") readAvatar(); };
    window.addEventListener("dms:prefs", onPrefs);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("dms:prefs", onPrefs);
      window.removeEventListener("storage", onStorage);
    };
  }, []);


  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("dms:theme", next ? "dark" : "light");
  };

  const runSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = MODULES.find((m) => m.label.toLowerCase().includes(q));
    if (hit) {
      navigate({ to: hit.to });
      setQuery("");
    } else {
      toast.info(`No module matches "${query}"`);
    }
  };

  return (
    <header className="flex items-center gap-4 border-b bg-card px-4 sm:px-6 py-4">
      <button
        onClick={() => {
          if (window.innerWidth < 768) {
            setMobileOpen(true);
          } else {
            toggleSidebar();
          }
        }}
        className="h-9 w-9 grid place-items-center rounded-md border hover:bg-accent shrink-0"
        aria-label="Toggle menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
          Digital Management System (DMS)
        </h1>
        <p className="text-xs text-muted-foreground truncate">Devionic (Private) Limited</p>
      </div>

      <div className="hidden md:flex items-center gap-2 w-96 rounded-lg border bg-muted/50 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          placeholder="Search modules… (press Enter)"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">Enter</kbd>
      </div>

      <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"} className="p-2 rounded-lg hover:bg-muted">
        {dark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative p-2 rounded-lg hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground grid place-items-center">
              {NOTIFICATIONS.length}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {NOTIFICATIONS.map((n) => (
            <DropdownMenuItem key={n.title} className="flex flex-col items-start gap-0.5 py-2">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.detail}</p>
              <p className="text-[10px] text-muted-foreground">{n.time}</p>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast.success("All notifications marked as read")}>
            Mark all as read
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={() => navigate({ to: "/communication" })}
        className="relative p-2 rounded-lg hover:bg-muted" title="Messages"
      >
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-accent text-[10px] text-accent-foreground grid place-items-center">
          5
        </span>
      </button>

      <button
        onClick={() => navigate({ to: "/ai" })}
        className="p-2 rounded-lg hover:bg-muted" title="Help / AI"
      >
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 pl-3 border-l hover:opacity-90">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover border border-primary/30" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-semibold">
                {initials}
              </div>
            )}

            <div className="text-sm text-left">
              <p className="font-semibold text-foreground">{user?.name ?? "User"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {user?.role ?? "Team Member"}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/reports">Reports</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/ai">AI Assistant</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { logout(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
