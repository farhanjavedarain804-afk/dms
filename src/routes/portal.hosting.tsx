import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, type PortalHosting } from "@/lib/portal-data";

export const Route = createFileRoute("/portal/hosting")({
  head: () => ({
    meta: [
      { title: "Hosting & Domains — Devionic Portal" },
      { name: "description", content: "Track hosting, domains and SSL renewals." },
      { property: "og:title", content: "Hosting & Domains — Devionic Portal" },
      { property: "og:description", content: "Track hosting, domains and SSL renewals." },
    ],
  }),
  component: PortalHostingPage,
});

function PortalHostingPage() {
  const ident = usePortalIdentity();
  const clientKey = (ident.company || ident.name || ident.email).toLowerCase();
  const [rows, setRows] = useState<PortalHosting[]>([]);

  useEffect(() => {
    setRows(readList<PortalHosting>(KEYS.hosting).filter((h) => h.client_key.toLowerCase() === clientKey));
  }, [clientKey]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hosting & Domains</h2>
        <p className="text-sm text-muted-foreground">Every domain, SSL and hosting plan running under your account.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No hosting records yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Provider</th>
                <th className="text-left px-4 py-2">Expires</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{h.name}</td>
                  <td className="px-4 py-2 text-muted-foreground uppercase">{h.kind}</td>
                  <td className="px-4 py-2 text-muted-foreground">{h.provider ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{h.expires_at ?? "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={h.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600",
    expiring: "bg-amber-500/15 text-amber-600",
    expired: "bg-rose-500/15 text-rose-600",
    suspended: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
