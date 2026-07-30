import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ArrowUpRight } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { matchesClient } from "@/lib/portal-data";
import { fmtPKR } from "@/lib/pk";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Devionic Client Portal" },
      { name: "description", content: "Payment history and settlement records." },
      { property: "og:title", content: "Payments — Devionic Client Portal" },
      { property: "og:description", content: "Payment history and settlement records." },
    ],
  }),
  component: PortalPayments,
});



function PortalPayments() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    try {
      const tx = JSON.parse(window.localStorage.getItem("dms:transactions") ?? "[]") as any[];
      setRows(tx.filter((t) => matchesClient(t.client, ident)));
    } catch { setRows([]); }
  }, [ident.company, ident.name]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.type !== "refund").reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const last = rows.slice(-30).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { paid, last };
  }, [rows]);

  const makePayment = () => {
    toast.success("Payment intent recorded — our team will confirm the settlement shortly.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">Every settlement made against your invoices.</p>
        </div>
        <button onClick={makePayment} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-sm font-medium hover:opacity-90">
          <CreditCard className="h-4 w-4" /> Make Payment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard label="Total Paid" value={fmtPKR(totals.paid)} />
        <StatCard label="Last 30 Days" value={fmtPKR(totals.last)} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No payments recorded yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Ref</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Method</th>
                <th className="text-left px-4 py-2">Notes</th>
                <th className="text-right px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.ref ?? `#${r.id}`}</td>
                  <td className="px-4 py-2 text-muted-foreground">{(r.date ?? r.created_at ?? "").slice(0, 10)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.method ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-[240px]">{r.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtPKR(r.amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
