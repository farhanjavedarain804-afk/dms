import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, AlertCircle, Receipt, TrendingUp, Download, Printer, HandCoins, History, FileText } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { fmtPKR } from "@/lib/pk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { PosSlipData } from "@/lib/pos-slip-pdf";

const posSlipPdf = () => import("@/lib/pos-slip-pdf");

type Invoice = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  client: string;
  client_ntn?: string;
  po_reference?: string;
  item_description?: string;
  total?: number;
  amount_paid?: number;
  balance_due?: number;
  payment_method?: string;
  bank?: string;
  currency?: string;
  status: string;
};

type Payment = {
  id: number;
  txn_id: string;
  invoice_id: number;
  invoice_no: string;
  client: string;
  amount: number;
  method: string;
  bank?: string;
  reference?: string;
  received_by?: string;
  note?: string;
  paid_on: string; // ISO
};

const invoicesApi = localCrud<Invoice>("invoices");
const paymentsApi = localCrud<Payment>("payments");

// Finance ledger integration — write income voucher into the same store used by Financials.
type FinanceAccount = { id: number; name: string; kind: "cash" | "bank" | "wallet" | "credit_card"; bank?: string };
type FinanceTxn = {
  id: number;
  voucher_no: string;
  date: string;
  description: string;
  type: "income" | "expense" | "transfer";
  category: string;
  party?: string;
  party_ntn?: string;
  account_id?: number;
  amount: number;
  gst_amount: number;
  wht_amount: number;
  net_amount: number;
  payment_method?: string;
  reference?: string;
  cost_center?: string;
  status: "pending" | "cleared" | "reconciled" | "bounced";
  notes?: string;
};
const financeAccountsApi = localCrud<FinanceAccount>("finance_accounts_v1");
const financeTxnApi = localCrud<FinanceTxn>("finance_v2");

function methodToAccountKind(m: string): FinanceAccount["kind"] {
  const x = (m || "").toLowerCase();
  if (x === "cash") return "cash";
  if (x === "jazzcash" || x === "easypaisa" || x === "wallet") return "wallet";
  if (x === "online" || x === "card") return "credit_card";
  return "bank"; // bank_transfer, cheque, online → bank by default
}


type Bucket = "paid" | "partial" | "unpaid";

const classify = (inv: Invoice): Bucket => {
  const st = (inv.status ?? "").toLowerCase();
  const total = Number(inv.total ?? 0);
  const paid = Number(inv.amount_paid ?? 0);
  if (st === "paid" || (total > 0 && paid >= total)) return "paid";
  if (st === "partial" || st === "partially_paid" || (paid > 0 && paid < total)) return "partial";
  return "unpaid";
};

const bucketMeta: Record<Bucket, { label: string; tint: string }> = {
  paid: { label: "Full Payment", tint: "oklch(0.68 0.18 155)" },
  partial: { label: "Partial", tint: "oklch(0.75 0.15 85)" },
  unpaid: { label: "Unpaid", tint: "oklch(0.65 0.2 25)" },
};

function makeTxnId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${y}${m}${day}-${r}`;
}

function TransactionsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["invoices"], queryFn: invoicesApi.list });
  const pq = useQuery({ queryKey: ["payments"], queryFn: paymentsApi.list });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | Bucket | "history">("all");

  // Collect payment dialog state
  const [collectFor, setCollectFor] = useState<(Invoice & { _total: number; _paid: number; _balance: number; _bucket: Bucket }) | null>(null);
  const [form, setForm] = useState({
    amount: "", method: "cash", bank: "", reference: "", received_by: "", note: "",
  });
  const [saving, setSaving] = useState(false);

  const rows = q.data ?? [];
  const payments = pq.data ?? [];

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const total = Number(r.total ?? 0);
        const paid = Number(r.amount_paid ?? 0);
        const balance = Number(r.balance_due ?? Math.max(0, total - paid));
        return { ...r, _total: total, _paid: paid, _balance: balance, _bucket: classify(r) };
      }),
    [rows],
  );

  const totals = useMemo(() => {
    const t = { count: enriched.length, invoiced: 0, received: 0, outstanding: 0 };
    for (const r of enriched) {
      t.invoiced += r._total;
      t.received += r._paid;
      t.outstanding += r._balance;
    }
    return t;
  }, [enriched]);

  const byBucket = useMemo(() => {
    const groups: Record<Bucket, typeof enriched> = { paid: [], partial: [], unpaid: [] };
    for (const r of enriched) groups[r._bucket].push(r);
    return groups;
  }, [enriched]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (tab === "history") {
      if (!s) return [] as typeof enriched;
      return [] as typeof enriched;
    }
    const list = tab === "all" ? enriched : byBucket[tab as Bucket];
    if (!s) return list;
    return list.filter((r) =>
      [r.invoice_no, r.client, r.po_reference, r.payment_method, r.bank, r.item_description]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s)),
    );
  }, [enriched, byBucket, tab, search]);

  const filteredPayments = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return payments;
    return payments.filter((p) =>
      [p.txn_id, p.invoice_no, p.client, p.method, p.bank, p.reference]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s)),
    );
  }, [payments, search]);

  const openCollect = (inv: (typeof enriched)[number]) => {
    setCollectFor(inv);
    setForm({
      amount: String(inv._balance || ""),
      method: inv.payment_method || "cash",
      bank: inv.bank || "",
      reference: "",
      received_by: "",
      note: "",
    });
  };

  const buildSlipForPayment = (pay: Payment, inv?: Invoice): PosSlipData => {
    const invoice = inv ?? rows.find((r) => r.id === pay.invoice_id);
    const invTotal = Number(invoice?.total ?? 0);
    const paidUpTo = payments
      .filter((x) => x.invoice_id === pay.invoice_id && new Date(x.paid_on).getTime() <= new Date(pay.paid_on).getTime())
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const previously = paidUpTo - Number(pay.amount || 0);
    return {
      txn_id: pay.txn_id,
      invoice_no: pay.invoice_no,
      invoice_date: invoice?.invoice_date,
      client: pay.client,
      client_ntn: invoice?.client_ntn,
      item_description: invoice?.item_description,
      invoice_total: invTotal,
      previously_paid: Math.max(0, previously),
      amount_now: Number(pay.amount || 0),
      balance_after: Math.max(0, invTotal - paidUpTo),
      payment_method: pay.method,
      bank: pay.bank,
      reference: pay.reference,
      received_by: pay.received_by,
      paid_on: pay.paid_on,
      note: pay.note,
    };
  };

  const submitCollect = async () => {
    if (!collectFor) return;
    const amt = Number(form.amount);
    if (!isFinite(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > collectFor._balance + 0.001) {
      toast.error(`Amount exceeds balance due (${fmtPKR(collectFor._balance)})`);
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newPaidTotal = collectFor._paid + amt;
      const newBalance = Math.max(0, collectFor._total - newPaidTotal);
      const newStatus = newBalance <= 0 ? "paid" : "partial";

      await invoicesApi.update(collectFor.id, {
        amount_paid: newPaidTotal,
        balance_due: newBalance,
        payment_method: form.method,
        bank: form.bank || collectFor.bank,
        status: newStatus,
      } as Partial<Invoice>);

      const payment = await paymentsApi.create({
        txn_id: makeTxnId(),
        invoice_id: collectFor.id,
        invoice_no: collectFor.invoice_no,
        client: collectFor.client,
        amount: amt,
        method: form.method,
        bank: form.bank,
        reference: form.reference,
        received_by: form.received_by,
        note: form.note,
        paid_on: now,
      });

      // Post to Finance ledger as an income voucher against the best-matching account.
      try {
        const accounts = await financeAccountsApi.list();
        const wantKind = methodToAccountKind(form.method);
        const acct =
          (form.bank ? accounts.find((a) => (a.bank || "").toLowerCase() === form.bank.toLowerCase()) : undefined) ||
          accounts.find((a) => a.kind === wantKind) ||
          accounts[0];
        const d = new Date(now);
        const voucherNo = `RV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${payment.id}`;
        await financeTxnApi.create({
          voucher_no: voucherNo,
          date: now.slice(0, 10),
          description: `Invoice payment ${collectFor.invoice_no} — ${collectFor.client}`,
          type: "income",
          category: "revenue",
          party: collectFor.client,
          party_ntn: collectFor.client_ntn,
          account_id: acct?.id,
          amount: amt,
          gst_amount: 0,
          wht_amount: 0,
          net_amount: amt,
          payment_method: form.method,
          reference: form.reference || payment.txn_id,
          cost_center: "Sales - Receivables",
          status: "cleared",
          notes: form.note,
        } as Omit<FinanceTxn, "id">);
      } catch (err) {
        console.warn("Finance ledger entry failed", err);
      }

      await qc.invalidateQueries({ queryKey: ["invoices"] });
      await qc.invalidateQueries({ queryKey: ["payments"] });
      await qc.invalidateQueries({ queryKey: ["finance_v2"] });
      await qc.invalidateQueries({ queryKey: ["finance_accounts_v1"] });

      toast.success(`Payment of ${fmtPKR(amt)} recorded`);

      // Auto-open POS slip
      const slip: PosSlipData = {
        txn_id: payment.txn_id,
        invoice_no: collectFor.invoice_no,
        invoice_date: collectFor.invoice_date,
        client: collectFor.client,
        client_ntn: collectFor.client_ntn,
        item_description: collectFor.item_description,
        invoice_total: collectFor._total,
        previously_paid: collectFor._paid,
        amount_now: amt,
        balance_after: newBalance,
        payment_method: form.method,
        bank: form.bank,
        reference: form.reference,
        received_by: form.received_by,
        paid_on: now,
        note: form.note,
      };
      const { downloadPosSlip } = await posSlipPdf();
      await downloadPosSlip(slip);
      setCollectFor(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const header = ["Invoice #", "Date", "Client", "Total", "Amount Paid", "Balance", "Method", "Bank", "Status"];
    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [r.invoice_no, r.invoice_date, r.client, r._total, r._paid, r._balance, r.payment_method ?? "", r.bank ?? "", bucketMeta[r._bucket].label]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const collectionRate = totals.invoiced > 0 ? Math.round((totals.received / totals.invoiced) * 100) : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Transactions"
        description="Collect payments against invoices — full or partial. Every payment prints a POS receipt."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "transactions",
                moduleLabel: "Transactions",
                title: "Payment Transactions Report",
                subtitle: `${payments.length} payment(s) · ${rows.length} invoice(s)`,
                sections: [{
                  title: "Payments",
                  columns: [
                    { key: "receipt_no", label: "Receipt #" },
                    { key: "invoice_no", label: "Invoice" },
                    { key: "customer_name", label: "Customer" },
                    { key: "method", label: "Method" },
                    { key: "amount", label: "Amount" },
                    { key: "paid_at", label: "Paid At" },
                  ],
                  rows: payments,
                }],
              })}
            />
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          </div>
        }
      />

      <StatsCards
        loading={q.isLoading}
        stats={[
          { label: "Total Invoiced", value: fmtPKR(totals.invoiced), hint: `${totals.count} invoices`, icon: Receipt },
          { label: "Amount Received", value: fmtPKR(totals.received), hint: `${collectionRate}% collected`, icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
          { label: "Outstanding", value: fmtPKR(totals.outstanding), hint: `${byBucket.partial.length + byBucket.unpaid.length} pending`, icon: AlertCircle, tint: "oklch(0.65 0.2 25)" },
          { label: "Payments Logged", value: String(payments.length), hint: `Collection ${collectionRate}%`, icon: TrendingUp, tint: "oklch(0.62 0.18 245)" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Collection Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={collectionRate} />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Full Payments</div>
              <div className="text-lg font-semibold">{byBucket.paid.length}</div>
              <div className="text-xs font-mono">{fmtPKR(byBucket.paid.reduce((s, r) => s + r._paid, 0))}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Partial Payments</div>
              <div className="text-lg font-semibold">{byBucket.partial.length}</div>
              <div className="text-xs font-mono">{fmtPKR(byBucket.partial.reduce((s, r) => s + r._paid, 0))} of {fmtPKR(byBucket.partial.reduce((s, r) => s + r._total, 0))}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Unpaid</div>
              <div className="text-lg font-semibold">{byBucket.unpaid.length}</div>
              <div className="text-xs font-mono">{fmtPKR(byBucket.unpaid.reduce((s, r) => s + r._total, 0))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Transaction Ledger</CardTitle>
          <Input
            placeholder="Search invoice, client, method, bank, txn id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-72"
          />
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{enriched.length}</Badge></TabsTrigger>
              <TabsTrigger value="paid">Full Payment <Badge variant="secondary" className="ml-2">{byBucket.paid.length}</Badge></TabsTrigger>
              <TabsTrigger value="partial">Partial <Badge variant="secondary" className="ml-2">{byBucket.partial.length}</Badge></TabsTrigger>
              <TabsTrigger value="unpaid">Unpaid <Badge variant="secondary" className="ml-2">{byBucket.unpaid.length}</Badge></TabsTrigger>
              <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> Payment History <Badge variant="secondary" className="ml-2">{payments.length}</Badge></TabsTrigger>
            </TabsList>

            {tab !== "history" ? (
              <TabsContent value={tab} className="mt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="w-32">Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                            {q.isLoading ? "Loading transactions..." : "No transactions to show. Create invoices from the Invoices module."}
                          </TableCell>
                        </TableRow>
                      ) : filtered.map((r) => {
                        const m = bucketMeta[r._bucket];
                        const pct = r._total > 0 ? Math.min(100, Math.round((r._paid / r._total) * 100)) : 0;
                        const canCollect = r._balance > 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.invoice_no}</TableCell>
                            <TableCell>{r.invoice_date}</TableCell>
                            <TableCell>{r.client}</TableCell>
                            <TableCell className="capitalize text-muted-foreground">{(r.payment_method ?? "—").replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-right font-mono">{fmtPKR(r._total)}</TableCell>
                            <TableCell className="text-right font-mono text-green-700 dark:text-green-400">{fmtPKR(r._paid)}</TableCell>
                            <TableCell className="text-right font-mono text-red-700 dark:text-red-400">{fmtPKR(r._balance)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-1.5" />
                                <span className="text-[10px] font-mono w-8 text-right">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge style={{ backgroundColor: m.tint, color: "white", borderColor: "transparent" }}>
                                {m.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={canCollect ? "default" : "outline"}
                                disabled={!canCollect}
                                onClick={() => openCollect(r)}
                              >
                                <HandCoins className="h-3.5 w-3.5 mr-1" />
                                {canCollect ? "Collect" : "Settled"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ) : (
              <TabsContent value="history" className="mt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Txn ID</TableHead>
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Bank / Ref</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">POS Slip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                            No payments recorded yet. Use "Collect" on an invoice to record one.
                          </TableCell>
                        </TableRow>
                      ) : filteredPayments.map((p) => {
                        const inv = rows.find((r) => r.id === p.invoice_id);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">{p.txn_id}</TableCell>
                            <TableCell className="text-sm">{new Date(p.paid_on).toLocaleString("en-GB")}</TableCell>
                            <TableCell className="font-medium">{p.invoice_no}</TableCell>
                            <TableCell>{p.client}</TableCell>
                            <TableCell className="capitalize text-muted-foreground">{(p.method ?? "—").replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {[p.bank, p.reference].filter(Boolean).join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-700 dark:text-green-400">{fmtPKR(p.amount)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const { downloadPosSlip } = await posSlipPdf();
                                  await downloadPosSlip(buildSlipForPayment(p, inv));
                                }}>
                                  <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                                </Button>
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const { printPosSlip } = await posSlipPdf();
                                  await printPosSlip(buildSlipForPayment(p, inv));
                                }}>
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Collect Payment Dialog */}
      <Dialog open={!!collectFor} onOpenChange={(v) => !v && setCollectFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HandCoins className="h-4 w-4" /> Collect Payment</DialogTitle>
            <DialogDescription>
              {collectFor ? (
                <>Invoice <b>{collectFor.invoice_no}</b> · {collectFor.client}</>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {collectFor && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm rounded-md border p-3 bg-muted/40">
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono">{fmtPKR(collectFor._total)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-mono text-green-700 dark:text-green-400">{fmtPKR(collectFor._paid)}</div></div>
                <div><div className="text-xs text-muted-foreground">Balance</div><div className="font-mono text-red-700 dark:text-red-400">{fmtPKR(collectFor._balance)}</div></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount (PKR)</Label>
                  <Input type="number" min="0" step="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => setForm({ ...form, amount: String(collectFor._balance) })}>Full</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => setForm({ ...form, amount: String(+(collectFor._balance / 2).toFixed(2)) })}>Half</Button>
                  </div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online / Card</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bank / Account</Label>
                  <Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Meezan Bank, HBL..." />
                </div>
                <div>
                  <Label>Reference / Txn #</Label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Cheque/UTR/Trace ID" />
                </div>
                <div className="col-span-2">
                  <Label>Received By</Label>
                  <Input value={form.received_by} onChange={(e) => setForm({ ...form, received_by: e.target.value })} placeholder="Cashier / Accountant name" />
                </div>
                <div className="col-span-2">
                  <Label>Note (optional)</Label>
                  <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectFor(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submitCollect} disabled={saving}>
              <Receipt className="h-4 w-4 mr-2" />
              {saving ? "Recording..." : "Record & Print Slip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="transactions" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Devionic DMS" }] }),
  component: TransactionsPage,
});
