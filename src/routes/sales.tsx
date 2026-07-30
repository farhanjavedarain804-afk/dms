import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, CheckCircle2, AlertCircle, Wallet } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { fmtPKR } from "@/lib/pk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

type InvoiceLite = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  client: string;
  client_ntn?: string;
  po_reference?: string;
  item_description?: string;
  total?: number;
  payment_method?: string;
  status: string;
};

const invoicesApi = localCrud<InvoiceLite>("invoices");

const HISTORY_STATUSES = new Set(["paid", "partial", "partially_paid", "unpaid", "sent", "invoiced", "overdue"]);

const statusMeta = (s: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; tint?: string } => {
  const v = (s ?? "").toLowerCase();
  if (v === "paid") return { label: "Paid", variant: "default", tint: "oklch(0.68 0.18 155)" };
  if (v === "partial" || v === "partially_paid") return { label: "Partially Paid", variant: "secondary", tint: "oklch(0.75 0.15 85)" };
  if (v === "overdue") return { label: "Overdue", variant: "destructive" };
  return { label: "Unpaid", variant: "outline" };
};

function SalesPage() {
  const invQ = useQuery({ queryKey: ["invoices"], queryFn: invoicesApi.list });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "partial">("all");

  const invoices = useMemo(() => (invQ.data ?? []).filter((i) => HISTORY_STATUSES.has((i.status ?? "").toLowerCase())), [invQ.data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return invoices.filter((i) => {
      const st = (i.status ?? "").toLowerCase();
      if (filter === "paid" && st !== "paid") return false;
      if (filter === "partial" && !(st === "partial" || st === "partially_paid")) return false;
      if (filter === "unpaid" && !(st === "unpaid" || st === "sent" || st === "invoiced" || st === "overdue")) return false;
      if (!s) return true;
      return [i.invoice_no, i.client, i.po_reference, i.item_description].some((v) => (v ?? "").toString().toLowerCase().includes(s));
    });
  }, [invoices, search, filter]);

  const paid = invoices.filter((i) => i.status === "paid");
  const partial = invoices.filter((i) => i.status === "partial" || i.status === "partially_paid");
  const unpaid = invoices.filter((i) => ["unpaid", "sent", "invoiced", "overdue"].includes((i.status ?? "").toLowerCase()));
  const paidAmt = paid.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const partialAmt = partial.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const unpaidAmt = unpaid.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const total = invoices.reduce((s, r) => s + Number(r.total ?? 0), 0);

  const chip = (key: typeof filter, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Sales & Invoice History"
        description="Read-only view of issued invoices — paid, partially paid, and unpaid. Create or edit in the Invoices module."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "sales",
              moduleLabel: "Sales & Invoice History",
              title: "Sales History Report",
              subtitle: `${invoices.length} invoice(s) · Total ${fmtPKR(total)}`,
              meta: [
                { label: "Paid", value: fmtPKR(paidAmt) },
                { label: "Partial", value: fmtPKR(partialAmt) },
                { label: "Unpaid", value: fmtPKR(unpaidAmt) },
              ],
              sections: [{
                title: "Invoice History",
                columns: [
                  { key: "invoice_no", label: "Invoice #" },
                  { key: "invoice_date", label: "Date" },
                  { key: "client", label: "Client" },
                  { key: "total", label: "Total", format: (v) => fmtPKR(v ?? 0) },
                  { key: "amount_paid", label: "Paid", format: (v) => fmtPKR(v ?? 0) },
                  { key: "balance_due", label: "Balance", format: (v) => fmtPKR(v ?? 0) },
                  { key: "status", label: "Status" },
                ],
                rows: invoices,
              }],
            })}
          />
        }
      />
      <StatsCards loading={invQ.isLoading} stats={[
        { label: "Total Invoices", value: invoices.length, hint: fmtPKR(total), icon: ShoppingBag },
        { label: "Paid", value: fmtPKR(paidAmt), hint: `${paid.length} invoices`, icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Partially Paid", value: fmtPKR(partialAmt), hint: `${partial.length} invoices`, icon: Wallet, tint: "oklch(0.75 0.15 85)" },
        { label: "Unpaid", value: fmtPKR(unpaidAmt), hint: `${unpaid.length} invoices`, icon: AlertCircle, tint: "oklch(0.65 0.2 25)" },
      ]} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Invoice History</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {chip("all", "All", invoices.length)}
            {chip("paid", "Paid", paid.length)}
            {chip("partial", "Partial", partial.length)}
            {chip("unpaid", "Unpaid", unpaid.length)}
            <Input placeholder="Search invoice, client, PO..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-56" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>PO Ref</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      {invQ.isLoading ? "Loading..." : "No invoices to show. Create invoices from the Invoices module."}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((i) => {
                  const m = statusMeta(i.status);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.invoice_no}</TableCell>
                      <TableCell>{i.invoice_date}</TableCell>
                      <TableCell>{i.due_date ?? "—"}</TableCell>
                      <TableCell>{i.client}</TableCell>
                      <TableCell className="text-muted-foreground">{i.po_reference ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{fmtPKR(Number(i.total ?? 0))}</TableCell>
                      <TableCell>
                        <Badge variant={m.variant} style={m.tint ? { backgroundColor: m.tint, color: "white", borderColor: "transparent" } : undefined}>
                          {m.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ModuleReportsCard module="sales" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/sales")({
  beforeLoad: () => {
    throw redirect({ to: "/transactions" });
  },
  head: () => ({ meta: [{ title: "Sales & Invoice History — Devionic DMS" }] }),
  component: SalesPage,
});
