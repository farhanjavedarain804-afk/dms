import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Download } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { matchesClient } from "@/lib/portal-data";
import { fmtPKR } from "@/lib/pk";

export const Route = createFileRoute("/portal/invoices")({
  head: () => ({
    meta: [
      { title: "My Invoices — Devionic Portal" },
      { name: "description", content: "View, download and track payment status of your Devionic invoices." },
      { property: "og:title", content: "My Invoices — Devionic Portal" },
      { property: "og:description", content: "View and download your Devionic invoices." },
    ],
  }),
  component: PortalInvoices,
});

function PortalInvoices() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("dms:invoices");
      const all = raw ? JSON.parse(raw) as any[] : [];
      const mine = all.filter((i) => matchesClient(i.client, ident));
      setRows(mine);
    } catch { setRows([]); }
  }, [ident.company, ident.name]);

  const totalDue = rows.filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .reduce((s, r) => s + (Number(r.balance_due ?? r.total ?? 0) || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (Number(r.amount_paid ?? 0) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Invoices</h2>
          <p className="text-sm text-muted-foreground">All invoices raised on your account.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-lg border bg-card px-4 py-2">
            <div className="text-[11px] text-muted-foreground">Outstanding</div>
            <div className="font-semibold text-amber-600">{fmtPKR(totalDue)}</div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2">
            <div className="text-[11px] text-muted-foreground">Paid to date</div>
            <div className="font-semibold text-emerald-600">{fmtPKR(totalPaid)}</div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No invoices found for your account.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Invoice #</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">Paid</th>
                <th className="text-right px-4 py-2">Balance</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.invoice_no ?? `#${r.id}`}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.issue_date ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{fmtPKR(r.total ?? 0)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{fmtPKR(r.amount_paid ?? 0)}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtPKR(r.balance_due ?? 0)}</td>
                  <td className="px-4 py-2"><StatusChip status={r.status} /></td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => downloadInvoice(r)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status?: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-500/15 text-slate-600",
    sent: "bg-blue-500/15 text-blue-600",
    partially_paid: "bg-amber-500/15 text-amber-600",
    paid: "bg-emerald-500/15 text-emerald-600",
    overdue: "bg-rose-500/15 text-rose-600",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[status ?? ""] ?? "bg-muted"}`}>{(status ?? "—").replace("_", " ")}</span>;
}



async function downloadInvoice(r: any) {
  try {
    const mod = await import("@/lib/pdf-docs");
    if (mod.downloadInvoicePdf) return mod.downloadInvoicePdf(r);
  } catch { /* fall through */ }
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${r.invoice_no ?? "invoice"}.json`; a.click();
  URL.revokeObjectURL(url);
}
