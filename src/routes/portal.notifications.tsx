import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Receipt, LifeBuoy, FolderKanban } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, writeList, type PortalNotification } from "@/lib/portal-data";

export const Route = createFileRoute("/portal/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Devionic Client Portal" },
      { name: "description", content: "Your notifications and alerts." },
      { property: "og:title", content: "Notifications — Devionic Client Portal" },
      { property: "og:description", content: "Your notifications and alerts." },
    ],
  }),
  component: PortalNotifs,
});

function PortalNotifs() {
  const ident = usePortalIdentity();
  const clientKey = (ident.company || ident.name || ident.email).toLowerCase();
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => {
    return readList<PortalNotification>(KEYS.notifications).filter((n) =>
      n.audience === "all" || (n.audience_key ?? "").toLowerCase().includes(clientKey),
    );
  }, [clientKey, tick]);

  useEffect(() => {
    const all = readList<PortalNotification>(KEYS.notifications);
    let changed = false;
    for (const n of all) {
      if ((n.audience === "all" || (n.audience_key ?? "").toLowerCase().includes(clientKey)) && !n.read) {
        n.read = true; changed = true;
      }
    }
    if (changed) writeList(KEYS.notifications, all);
  }, [clientKey]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground">Recent alerts across billing, projects and support.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
          You're all caught up.
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {rows.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${iconWrap(n.kind)}`}>
                {iconFor(n.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {n.link && <a href={n.link} className="text-xs text-primary hover:underline shrink-0">Open</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function iconFor(kind: string) {
  const cls = "h-4 w-4";
  if (kind === "success") return <CheckCircle2 className={cls} />;
  if (kind === "warning") return <AlertCircle className={cls} />;
  if (kind === "billing") return <Receipt className={cls} />;
  if (kind === "support") return <LifeBuoy className={cls} />;
  if (kind === "project") return <FolderKanban className={cls} />;
  return <Info className={cls} />;
}
function iconWrap(kind: string) {
  if (kind === "success") return "bg-emerald-500/15 text-emerald-600";
  if (kind === "warning") return "bg-amber-500/15 text-amber-600";
  if (kind === "billing") return "bg-blue-500/15 text-blue-600";
  if (kind === "support") return "bg-rose-500/15 text-rose-600";
  if (kind === "project") return "bg-indigo-500/15 text-indigo-600";
  return "bg-muted text-muted-foreground";
}
