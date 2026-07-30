import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { matchesClient } from "@/lib/portal-data";
import { fmtPKR } from "@/lib/pk";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Devionic Client Portal" },
      { name: "description", content: "Review quotations Devionic has prepared for you and accept or reject with a click." },
      { property: "og:title", content: "Quotations — Devionic Client Portal" },
      { property: "og:description", content: "Review and respond to Devionic quotations." },
    ],
  }),
  component: PortalQuotations,
});



function PortalQuotations() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);

  const refresh = () => {
    try {
      const all = JSON.parse(window.localStorage.getItem("dms:quotations") ?? "[]") as any[];
      setRows(all.filter((q) => matchesClient(q.client, ident)));
    } catch { setRows([]); }
  };

  useEffect(refresh, [ident.company, ident.name]);

  const totals = useMemo(() => {
    const pending = rows.filter((r) => r.status === "sent" || r.status === "draft").length;
    const accepted = rows.filter((r) => r.status === "accepted" || r.status === "converted").length;
    const value = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
    return { pending, accepted, value };
  }, [rows]);

  const setStatus = (id: number, status: string) => {
    try {
      const all = JSON.parse(window.localStorage.getItem("dms:quotations") ?? "[]") as any[];
      const next = all.map((q) => (q.id === id ? { ...q, status } : q));
      window.localStorage.setItem("dms:quotations", JSON.stringify(next));
      toast.success(`Quotation marked as ${status}`);
      refresh();
    } catch { toast.error("Could not update quotation"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quotations</h2>
        <p className="text-sm text-muted-foreground">Proposals prepared by the Devionic team — review, accept or reject.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Pending Review" value={String(totals.pending)} />
        <StatCard label="Accepted" value={String(totals.accepted)} />
        <StatCard label="Total Value" value={fmtPKR(totals.value)} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No quotations available for your account yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => (
            <div key={q.id} className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{q.quote_no}</span>
                  <StatusBadge status={q.status} />
                </div>
                <div className="text-sm font-medium mt-0.5 truncate">{q.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {q.quote_date} {q.valid_until && `· valid till ${q.valid_until}`}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-bold">{fmtPKR(q.total ?? 0)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{q.currency ?? "PKR"}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {(q.status === "sent" || q.status === "draft") && (
                    <>
                      <button onClick={() => setStatus(q.id, "accepted")} className="text-xs px-3 h-7 rounded-md bg-emerald-600 text-white hover:opacity-90">Accept</button>
                      <button onClick={() => setStatus(q.id, "rejected")} className="text-xs px-3 h-7 rounded-md border hover:bg-accent">Decline</button>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        const mod: any = await import("@/lib/pdf-docs");
                        const fn = mod.downloadQuotationPdf ?? mod.generateQuotationPdf ?? mod.default;
                        if (typeof fn === "function") await fn(q);
                        else toast.info("PDF export unavailable");
                      } catch { toast.error("Could not generate PDF"); }
                    }}
                    className="text-xs inline-flex items-center gap-1 px-3 h-7 rounded-md border hover:bg-accent"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-500/15 text-slate-600",
    sent: "bg-blue-500/15 text-blue-600",
    accepted: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-rose-500/15 text-rose-600",
    expired: "bg-amber-500/15 text-amber-600",
    converted: "bg-primary/15 text-primary",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[status ?? ""] ?? "bg-muted"}`}>
      {status ?? "—"}
    </span>
  );
}
