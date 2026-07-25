import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Landmark, ReceiptText, FileSpreadsheet, CheckSquare, Download, MapPin,
  AlertCircle, CheckCircle2, TrendingUp, TrendingDown,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { fmtPKR } from "@/lib/pk";

// ============= Storage helpers =============
function readLS<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(`dms:${key}`); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function writeLS<T>(key: string, val: T) {
  try { localStorage.setItem(`dms:${key}`, JSON.stringify(val)); } catch { /* noop */ }
}

// ============= Types (mirror invoices/bills for aggregation) =============
type Invoice = { id: number; invoice_no: string; invoice_date: string; client: string; client_ntn?: string;
  subtotal: number; gst_rate: number; gst_amount: number; wht_rate: number; wht_amount: number; total: number;
  status: string; };
type VendorBill = { id: number; bill_no: string; bill_date: string; vendor: string;
  subtotal: number; tax_amount: number; wht_rate: number; wht_amount: number; net_payable: number;
  status: string; };

// ============= Sales Tax Return =============
function SalesTaxTab({ month }: { month: string }) {
  const invoices = readLS<Invoice[]>("invoices", []);
  const bills = readLS<VendorBill[]>("vendor_bills_v1", []);

  const monthlyInvoices = invoices.filter((i) => i.invoice_date?.startsWith(month) && i.status !== "cancelled");
  const monthlyBills = bills.filter((b) => b.bill_date?.startsWith(month) && b.status !== "cancelled");

  const taxableSales = monthlyInvoices.reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
  const outputTax = monthlyInvoices.reduce((s, i) => s + Number(i.gst_amount ?? 0), 0);
  const taxablePurchases = monthlyBills.reduce((s, b) => s + Number(b.subtotal ?? 0), 0);
  const inputTax = monthlyBills.reduce((s, b) => s + Number(b.tax_amount ?? 0), 0);
  const netPayable = outputTax - inputTax;

  const exportCsv = () => {
    const rows = [
      ["Section", "Description", "Amount (PKR)"],
      ["Sales", "Taxable Sales", taxableSales.toFixed(2)],
      ["Sales", "Output Tax (18%)", outputTax.toFixed(2)],
      ["Purchases", "Taxable Purchases", taxablePurchases.toFixed(2)],
      ["Purchases", "Input Tax Claimed", inputTax.toFixed(2)],
      ["Summary", "Net Sales Tax Payable / (Refundable)", netPayable.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `fbr-sales-tax-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("FBR Sales Tax return exported");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />FBR Sales Tax Return Summary</CardTitle>
          <CardDescription>Aggregated from invoices & vendor bills for {month}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />OUTPUT (SALES)</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Taxable Sales</span><span className="font-semibold">{fmtPKR(taxableSales)}</span></div>
                <div className="flex justify-between"><span>Output Tax (18%)</span><span className="font-semibold text-emerald-700">{fmtPKR(outputTax)}</span></div>
                <div className="text-xs text-muted-foreground mt-1">{monthlyInvoices.length} invoices</div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" />INPUT (PURCHASES)</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Taxable Purchases</span><span className="font-semibold">{fmtPKR(taxablePurchases)}</span></div>
                <div className="flex justify-between"><span>Input Tax Claimed</span><span className="font-semibold text-amber-700">{fmtPKR(inputTax)}</span></div>
                <div className="text-xs text-muted-foreground mt-1">{monthlyBills.length} bills</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-between">
            <div>
              <div className="text-xs opacity-80">Net Sales Tax {netPayable >= 0 ? "Payable" : "Refundable"}</div>
              <div className="text-2xl font-bold">{fmtPKR(Math.abs(netPayable))}</div>
            </div>
            <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export FBR CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sales Register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead>Buyer</TableHead>
              <TableHead>NTN</TableHead><TableHead className="text-right">Value Excl. Tax</TableHead>
              <TableHead className="text-right">GST</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {monthlyInvoices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No sales this month.</TableCell></TableRow>}
              {monthlyInvoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                  <TableCell>{i.invoice_date}</TableCell>
                  <TableCell>{i.client}</TableCell>
                  <TableCell className="font-mono text-xs">{i.client_ntn ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmtPKR(i.subtotal)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtPKR(i.gst_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= WHT Register =============
const WHT_SECTIONS = [
  { code: "153(1)(a)", label: "153(1)(a) — Sale of goods", rate: 4.5 },
  { code: "153(1)(b)", label: "153(1)(b) — Rendering of services", rate: 10 },
  { code: "153(1)(c)", label: "153(1)(c) — Execution of contracts", rate: 7 },
  { code: "155", label: "155 — Rent of property", rate: 15 },
  { code: "165", label: "165 — Statement of taxes collected/deducted", rate: 0 },
  { code: "149", label: "149 — Salary", rate: 0 },
];

function WHTTab({ month }: { month: string }) {
  const bills = readLS<VendorBill[]>("vendor_bills_v1", []);
  const invoices = readLS<Invoice[]>("invoices", []);
  const monthlyBills = bills.filter((b) => b.bill_date?.startsWith(month));
  const monthlyInv = invoices.filter((i) => i.invoice_date?.startsWith(month));

  const totalWhtDeducted = monthlyBills.reduce((s, b) => s + Number(b.wht_amount ?? 0), 0);
  const totalWhtCollected = monthlyInv.reduce((s, i) => s + Number(i.wht_amount ?? 0), 0);

  const exportCsv = () => {
    const rows = [
      ["Type", "Doc No", "Date", "Party", "Section", "Gross", "Rate%", "WHT Amount"],
      ...monthlyBills.map((b) => ["Deducted (Payment)", b.bill_no, b.bill_date, b.vendor, "153", b.subtotal.toFixed(2), (b.wht_rate ?? 0).toFixed(2), (b.wht_amount ?? 0).toFixed(2)]),
      ...monthlyInv.map((i) => ["Collected (Receipt)", i.invoice_no, i.invoice_date, i.client, "153", i.subtotal.toFixed(2), (i.wht_rate ?? 0).toFixed(2), (i.wht_amount ?? 0).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `wht-register-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("WHT register exported");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">WHT Deducted (from vendor payments)</div>
          <div className="text-2xl font-bold text-amber-700">{fmtPKR(totalWhtDeducted)}</div>
          <div className="text-xs text-muted-foreground mt-1">Payable to FBR</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">WHT Collected on us (by clients)</div>
          <div className="text-2xl font-bold text-emerald-700">{fmtPKR(totalWhtCollected)}</div>
          <div className="text-xs text-muted-foreground mt-1">Adjustable — collect certificates</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Withholding Tax Sections (Pakistan)</CardTitle>
            <CardDescription>Standard rates under Income Tax Ordinance 2001</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export Register</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Section</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Filer Rate %</TableHead></TableRow></TableHeader>
            <TableBody>{WHT_SECTIONS.map((s) => (
              <TableRow key={s.code}>
                <TableCell className="font-mono">{s.code}</TableCell>
                <TableCell>{s.label}</TableCell>
                <TableCell className="text-right font-semibold">{s.rate}%</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">WHT Register — {month}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Doc</TableHead><TableHead>Date</TableHead><TableHead>Party</TableHead>
              <TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">WHT</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {monthlyBills.map((b) => (
                <TableRow key={`b${b.id}`}>
                  <TableCell><Badge variant="outline">Deducted</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{b.bill_no}</TableCell>
                  <TableCell>{b.bill_date}</TableCell>
                  <TableCell>{b.vendor}</TableCell>
                  <TableCell className="text-right">{fmtPKR(b.subtotal)}</TableCell>
                  <TableCell className="text-right">{b.wht_rate}%</TableCell>
                  <TableCell className="text-right font-semibold text-amber-700">{fmtPKR(b.wht_amount)}</TableCell>
                </TableRow>
              ))}
              {monthlyInv.map((i) => (
                <TableRow key={`i${i.id}`}>
                  <TableCell><Badge className="bg-emerald-100 text-emerald-800">Collected</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                  <TableCell>{i.invoice_date}</TableCell>
                  <TableCell>{i.client}</TableCell>
                  <TableCell className="text-right">{fmtPKR(i.subtotal)}</TableCell>
                  <TableCell className="text-right">{i.wht_rate}%</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{fmtPKR(i.wht_amount)}</TableCell>
                </TableRow>
              ))}
              {monthlyBills.length + monthlyInv.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No WHT entries this month.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Provincial Tax =============
const PROVINCES = [
  { code: "PRA", name: "Punjab (PRA)", rate: 16 },
  { code: "SRB", name: "Sindh (SRB)", rate: 15 },
  { code: "KPRA", name: "KPK (KPRA)", rate: 15 },
  { code: "BRA", name: "Balochistan (BRA)", rate: 15 },
  { code: "IRB", name: "Islamabad (IRB)", rate: 16 },
];

function ProvincialTab({ month }: { month: string }) {
  type ProvEntry = { id: number; date: string; province: string; client: string; taxable: number; rate: number; tax: number; challan?: string; status: string };
  const [entries, setEntries] = useState<ProvEntry[]>(() => readLS<ProvEntry[]>("provincial_tax_v1", [
    { id: 1, date: `${month}-05`, province: "PRA", client: "Beta Foods (Pvt) Ltd", taxable: 250000, rate: 16, tax: 40000, challan: "PRA-778991", status: "filed" },
    { id: 2, date: `${month}-12`, province: "SRB", client: "Gamma Logistics", taxable: 180000, rate: 15, tax: 27000, status: "pending" },
  ]));
  useEffect(() => writeLS("provincial_tax_v1", entries), [entries]);

  const [form, setForm] = useState({ province: "PRA", client: "", taxable: 0, challan: "" });

  const add = () => {
    if (!form.client || !form.taxable) return toast.error("Client & taxable amount required");
    const p = PROVINCES.find((x) => x.code === form.province)!;
    const next: ProvEntry = { id: Date.now(), date: new Date().toISOString().slice(0, 10),
      province: form.province, client: form.client, taxable: form.taxable, rate: p.rate,
      tax: form.taxable * p.rate / 100, challan: form.challan, status: form.challan ? "filed" : "pending" };
    setEntries([next, ...entries]);
    setForm({ province: "PRA", client: "", taxable: 0, challan: "" });
    toast.success("Provincial tax entry recorded");
  };

  const byProvince = useMemo(() => {
    const m = new Map<string, number>();
    entries.filter((e) => e.date?.startsWith(month)).forEach((e) => m.set(e.province, (m.get(e.province) ?? 0) + e.tax));
    return m;
  }, [entries, month]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {PROVINCES.map((p) => (
          <Card key={p.code}><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.code}</div>
            <div className="text-lg font-bold mt-1">{fmtPKR(byProvince.get(p.code) ?? 0)}</div>
            <div className="text-[10px] text-muted-foreground">{p.name} • {p.rate}%</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Record Provincial Sales Tax on Services</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-5 gap-2">
          <Select value={form.province} onValueChange={(v) => setForm({ ...form, province: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROVINCES.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          <Input type="number" placeholder="Taxable amount" value={form.taxable || ""} onChange={(e) => setForm({ ...form, taxable: Number(e.target.value) })} />
          <Input placeholder="Challan # (optional)" value={form.challan} onChange={(e) => setForm({ ...form, challan: e.target.value })} />
          <Button onClick={add}>Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Authority</TableHead><TableHead>Client</TableHead>
              <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Tax</TableHead><TableHead>Challan</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell><Badge variant="outline">{e.province}</Badge></TableCell>
                  <TableCell>{e.client}</TableCell>
                  <TableCell className="text-right">{fmtPKR(e.taxable)}</TableCell>
                  <TableCell className="text-right">{e.rate}%</TableCell>
                  <TableCell className="text-right font-semibold">{fmtPKR(e.tax)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.challan ?? "—"}</TableCell>
                  <TableCell><Badge variant={e.status === "filed" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Filing Checklist =============
const CHECKLIST_TEMPLATE = [
  { title: "FBR Sales Tax Return (Annex-C)", authority: "FBR", due_day: 18, frequency: "monthly" },
  { title: "WHT Statement (Section 165)", authority: "FBR", due_day: 15, frequency: "monthly" },
  { title: "Salary Tax Deduction (Section 149)", authority: "FBR", due_day: 15, frequency: "monthly" },
  { title: "PRA Sales Tax on Services", authority: "PRA", due_day: 15, frequency: "monthly" },
  { title: "SRB Sales Tax on Services", authority: "SRB", due_day: 15, frequency: "monthly" },
  { title: "KPRA / BRA Filings (if applicable)", authority: "KPRA/BRA", due_day: 15, frequency: "monthly" },
  { title: "EOBI Contribution", authority: "EOBI", due_day: 15, frequency: "monthly" },
  { title: "PESSI / SESSI Contribution", authority: "PESSI/SESSI", due_day: 15, frequency: "monthly" },
  { title: "Income Tax Advance (Section 147)", authority: "FBR", due_day: 25, frequency: "quarterly" },
  { title: "Annual Income Tax Return", authority: "FBR", due_day: 30, frequency: "annual" },
];

function ChecklistTab({ month }: { month: string }) {
  type Item = { key: string; done: boolean; note?: string; filed_on?: string };
  const [items, setItems] = useState<Item[]>(() => readLS<Item[]>(`tax_checklist_${month}`, CHECKLIST_TEMPLATE.map((c) => ({ key: c.title, done: false }))));
  useEffect(() => { setItems(readLS<Item[]>(`tax_checklist_${month}`, CHECKLIST_TEMPLATE.map((c) => ({ key: c.title, done: false })))); }, [month]);
  useEffect(() => writeLS(`tax_checklist_${month}`, items), [items, month]);

  const toggle = (key: string) => setItems(items.map((i) => i.key === key ? { ...i, done: !i.done, filed_on: !i.done ? new Date().toISOString().slice(0, 10) : undefined } : i));

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const done = items.filter((i) => i.done).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Compliance Checklist — {month}</CardTitle>
            <CardDescription>Standard Pakistan tax & statutory filings</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{done}/{items.length}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10"></TableHead><TableHead>Filing</TableHead>
            <TableHead>Authority</TableHead><TableHead>Frequency</TableHead>
            <TableHead>Due Date</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {CHECKLIST_TEMPLATE.map((c) => {
              const item = items.find((i) => i.key === c.title) ?? { key: c.title, done: false };
              const dueDay = Math.min(c.due_day, daysInMonth);
              const dueDate = `${month}-${String(dueDay).padStart(2, "0")}`;
              const overdue = !item.done && new Date(dueDate) < new Date();
              return (
                <TableRow key={c.title} className={item.done ? "opacity-70" : ""}>
                  <TableCell><Checkbox checked={item.done} onCheckedChange={() => toggle(c.title)} /></TableCell>
                  <TableCell className={item.done ? "line-through" : "font-medium"}>{c.title}</TableCell>
                  <TableCell><Badge variant="outline">{c.authority}</Badge></TableCell>
                  <TableCell className="capitalize">{c.frequency}</TableCell>
                  <TableCell>{dueDate}</TableCell>
                  <TableCell>
                    {item.done ? <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />Filed {item.filed_on}</Badge>
                      : overdue ? <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>
                      : <Badge variant="secondary">Pending</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============= E-Invoice CSV Export =============
function EInvoiceTab({ month }: { month: string }) {
  const invoices = readLS<Invoice[]>("invoices", []);
  const monthlyInv = invoices.filter((i) => i.invoice_date?.startsWith(month));

  const exportEInvoice = () => {
    const rows = [
      ["Seller_NTN", "Seller_Name", "Invoice_No", "Invoice_Date", "Buyer_NTN", "Buyer_Name",
        "HS_Code", "Description", "Quantity", "Rate", "Value_Sales_Excl_Tax", "Sales_Tax_Rate", "Sales_Tax", "Value_Sales_Incl_Tax", "Sale_Type"],
      ...monthlyInv.map((i) => [
        "7654321-8", "DEVIONIC (PRIVATE) LIMITED", i.invoice_no, i.invoice_date,
        i.client_ntn ?? "", i.client, "9983.13", "Services",
        "1", i.subtotal.toFixed(2), i.subtotal.toFixed(2),
        (i.gst_rate ?? 18).toFixed(2), i.gst_amount.toFixed(2), i.total.toFixed(2), "Services",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `e-invoice-fbr-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${monthlyInv.length} invoices in FBR e-invoice format`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />FBR E-Invoice CSV Export</CardTitle>
        <CardDescription>Ready-to-upload format for FBR IRIS / Digital Invoicing portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-4 rounded-lg bg-muted/40 text-sm space-y-1">
          <div className="font-semibold">Format includes:</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
            <li>Seller & Buyer NTN, Name</li>
            <li>Invoice #, Date</li>
            <li>HS Code, Description, Quantity, Rate</li>
            <li>Value excluding tax, Sales tax rate & amount, Value including tax</li>
            <li>Sale type classification</li>
          </ul>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div>
            <div className="text-sm text-muted-foreground">Invoices in {month}</div>
            <div className="text-2xl font-bold">{monthlyInv.length}</div>
          </div>
          <Button onClick={exportEInvoice} disabled={monthlyInv.length === 0}>
            <Download className="h-4 w-4 mr-1" />Export E-Invoice CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Dashboard =============
function DashboardTab({ month, setMonth }: { month: string; setMonth: (v: string) => void }) {
  const invoices = readLS<Invoice[]>("invoices", []);
  const bills = readLS<VendorBill[]>("vendor_bills_v1", []);

  const monthlyInv = invoices.filter((i) => i.invoice_date?.startsWith(month));
  const monthlyBills = bills.filter((b) => b.bill_date?.startsWith(month));

  const outputTax = monthlyInv.reduce((s, i) => s + Number(i.gst_amount ?? 0), 0);
  const inputTax = monthlyBills.reduce((s, b) => s + Number(b.tax_amount ?? 0), 0);
  const whtDeducted = monthlyBills.reduce((s, b) => s + Number(b.wht_amount ?? 0), 0);
  const whtCollected = monthlyInv.reduce((s, i) => s + Number(i.wht_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Label className="whitespace-nowrap">Reporting Month:</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
          <div className="text-xs text-muted-foreground ml-auto">All tabs use this month</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Net Sales Tax</div>
          <div className={`text-2xl font-bold ${outputTax - inputTax >= 0 ? "text-primary" : "text-emerald-700"}`}>{fmtPKR(Math.abs(outputTax - inputTax))}</div>
          <div className="text-xs text-muted-foreground">{outputTax - inputTax >= 0 ? "Payable to FBR" : "Refundable"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Output Tax</div>
          <div className="text-2xl font-bold text-emerald-700">{fmtPKR(outputTax)}</div>
          <div className="text-xs text-muted-foreground">{monthlyInv.length} sales invoices</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Input Tax</div>
          <div className="text-2xl font-bold text-amber-700">{fmtPKR(inputTax)}</div>
          <div className="text-xs text-muted-foreground">{monthlyBills.length} purchase bills</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">WHT (Deducted / Collected)</div>
          <div className="text-2xl font-bold">{fmtPKR(whtDeducted)} <span className="text-sm text-muted-foreground">/ {fmtPKR(whtCollected)}</span></div>
          <div className="text-xs text-muted-foreground">Sections 153/165</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Compliance Snapshot — {month}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">Sales Register</div>
            <div className="font-bold">{monthlyInv.length} entries</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">Purchase Register</div>
            <div className="font-bold">{monthlyBills.length} entries</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">Filer Compliance</div>
            <div className="font-bold text-emerald-700">Active</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-xs text-muted-foreground">Fiscal Year</div>
            <div className="font-bold">FY {new Date(month).getMonth() >= 6 ? new Date(month).getFullYear() + 1 : new Date(month).getFullYear()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============= Main =============
function TaxPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const invoices = readLS<Invoice[]>("invoices", []);
  const bills = readLS<VendorBill[]>("vendor_bills_v1", []);
  const monthlyInv = invoices.filter((i) => i.invoice_date?.startsWith(month));
  const monthlyBills = bills.filter((b) => b.bill_date?.startsWith(month));
  const netTax = monthlyInv.reduce((s, i) => s + Number(i.gst_amount ?? 0), 0)
    - monthlyBills.reduce((s, b) => s + Number(b.tax_amount ?? 0), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Tax & Compliance"
        description="FBR sales tax, WHT, provincial (PRA/SRB/BRA), monthly filing checklist and e-invoice export — built for Pakistan."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "tax",
              moduleLabel: "Tax & Compliance",
              title: `Tax Report — ${month}`,
              subtitle: `Net Tax: ${fmtPKR(Math.abs(netTax))} ${netTax >= 0 ? "Payable" : "Refundable"}`,
              meta: [
                { label: "Sales Invoices", value: String(monthlyInv.length) },
                { label: "Purchase Bills", value: String(monthlyBills.length) },
              ],
              sections: [
                {
                  title: "Monthly Sales Invoices",
                  columns: [
                    { key: "invoice_no", label: "Invoice" },
                    { key: "customer_name", label: "Customer" },
                    { key: "invoice_date", label: "Date" },
                    { key: "subtotal", label: "Subtotal" },
                    { key: "gst_amount", label: "GST" },
                    { key: "total", label: "Total" },
                  ],
                  rows: monthlyInv,
                },
                {
                  title: "Monthly Purchase Bills",
                  columns: [
                    { key: "bill_no", label: "Bill" },
                    { key: "vendor_name", label: "Vendor" },
                    { key: "bill_date", label: "Date" },
                    { key: "subtotal", label: "Subtotal" },
                    { key: "tax_amount", label: "Tax" },
                    { key: "total", label: "Total" },
                  ],
                  rows: monthlyBills,
                },
              ],
            })}
          />
        }
      />
      <StatsCards stats={[
        { label: "Net Sales Tax", value: fmtPKR(Math.abs(netTax)), hint: netTax >= 0 ? "Payable FBR" : "Refundable", icon: Landmark, tint: netTax >= 0 ? "oklch(0.65 0.2 25)" : "oklch(0.68 0.18 155)" },
        { label: "Monthly Invoices", value: monthlyInv.length, hint: month, icon: ReceiptText },
        { label: "Monthly Bills", value: monthlyBills.length, hint: month, icon: FileSpreadsheet },
        { label: "Reporting Month", value: month, hint: "Change in Dashboard tab", icon: CheckSquare },
      ]} />

      <Tabs defaultValue="dashboard" className="mt-4">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sales-tax">Sales Tax</TabsTrigger>
          <TabsTrigger value="wht">WHT Register</TabsTrigger>
          <TabsTrigger value="provincial">Provincial</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="einvoice">E-Invoice</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><DashboardTab month={month} setMonth={setMonth} /></TabsContent>
        <TabsContent value="sales-tax" className="mt-4"><SalesTaxTab month={month} /></TabsContent>
        <TabsContent value="wht" className="mt-4"><WHTTab month={month} /></TabsContent>
        <TabsContent value="provincial" className="mt-4"><ProvincialTab month={month} /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><ChecklistTab month={month} /></TabsContent>
        <TabsContent value="einvoice" className="mt-4"><EInvoiceTab month={month} /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export const Route = createFileRoute("/tax")({
  head: () => ({ meta: [{ title: "Tax & Compliance — Devionic ERP" }] }),
  component: TaxPage,
});
