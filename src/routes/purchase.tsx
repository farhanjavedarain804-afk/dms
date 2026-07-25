import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, ShoppingCart, PackageCheck, ReceiptText, TrendingDown, BookOpen,
  Download, Plus, Trash2, ArrowRight, CheckCircle2,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { localCrud } from "@/lib/local-store";
import { fmtPKR, PK_BANKS } from "@/lib/pk";

const purchasePdf = () => import("@/lib/purchase-pdf");

// ============= Types =============
type Vendor = {
  id: number;
  code: string;
  name: string;
  category: "goods" | "services" | "logistics" | "utilities" | "other";
  contact_person?: string;
  phone?: string;
  email?: string;
  ntn?: string;
  strn?: string;
  address?: string;
  city?: string;
  payment_terms: string;
  bank?: string;
  iban?: string;
  opening_balance: number;
  status: "active" | "on_hold" | "blocked";
  notes?: string;
};

type POItem = { description: string; quantity: number; unit_price: number; tax_rate: number };
type PurchaseOrder = {
  id: number;
  po_no: string;
  po_date: string;
  expected_date?: string;
  vendor_id: number;
  vendor: string;
  items: POItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  status: "draft" | "approved" | "partial" | "received" | "closed" | "cancelled";
  notes?: string;
};

type GRN = {
  id: number;
  grn_no: string;
  grn_date: string;
  po_no: string;
  vendor: string;
  vendor_id: number;
  warehouse: string;
  items: { description: string; quantity: number; received: number; unit_price: number }[];
  landed_cost: number;
  total_value: number;
  status: "posted" | "draft";
  notes?: string;
};

type VendorBill = {
  id: number;
  bill_no: string;
  bill_date: string;
  due_date: string;
  vendor_id: number;
  vendor: string;
  po_reference?: string;
  grn_reference?: string;
  subtotal: number;
  tax_amount: number;
  wht_rate: number;
  wht_amount: number;
  net_payable: number;
  amount_paid: number;
  balance: number;
  status: "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
  notes?: string;
};

type VendorPayment = {
  id: number;
  payment_no: string;
  payment_date: string;
  vendor_id: number;
  vendor: string;
  bill_no?: string;
  amount: number;
  method: string;
  bank?: string;
  reference?: string;
  notes?: string;
};

// ============= Local stores =============
const vendorsApi = localCrud<Vendor>("purchase_vendors_v1", [
  {
    code: "V-001", name: "TechnoTraders (Pvt) Ltd", category: "goods",
    contact_person: "Zafar Iqbal", phone: "+92 300 1112233", email: "sales@technotraders.pk",
    ntn: "3344556-7", strn: "17-99-3344-556-70", address: "Hall Road, Lahore", city: "Lahore",
    payment_terms: "Net 30", bank: "Meezan Bank", iban: "PK36MEZN0000000012345678",
    opening_balance: 0, status: "active",
  },
  {
    code: "V-002", name: "Al-Karam Stationers", category: "goods",
    contact_person: "Nadia Sheikh", phone: "+92 321 4455667", email: "info@alkaram.pk",
    ntn: "2211334-5", address: "Blue Area, Islamabad", city: "Islamabad",
    payment_terms: "Net 15", bank: "HBL", opening_balance: 45000, status: "active",
  },
  {
    code: "V-003", name: "Rapid Logistics", category: "logistics",
    contact_person: "Junaid Khan", phone: "+92 333 7788990",
    ntn: "8899001-2", address: "Airport Rd, Karachi", city: "Karachi",
    payment_terms: "Net 7", opening_balance: 0, status: "active",
  },
]);

const poApi = localCrud<PurchaseOrder>("purchase_orders_v1", [
  {
    po_no: "PO-2026-001", po_date: "2026-07-05", expected_date: "2026-07-15",
    vendor_id: 1, vendor: "TechnoTraders (Pvt) Ltd",
    items: [
      { description: "Dell OptiPlex 3090 Desktop", quantity: 5, unit_price: 145000, tax_rate: 18 },
      { description: "24\" LED Monitor", quantity: 5, unit_price: 32000, tax_rate: 18 },
    ],
    subtotal: 885000, tax_amount: 159300, total: 1044300, status: "approved",
    notes: "For new hire batch — deliver to head office.",
  },
  {
    po_no: "PO-2026-002", po_date: "2026-07-08",
    vendor_id: 2, vendor: "Al-Karam Stationers",
    items: [
      { description: "A4 Paper Ream (500 sheets)", quantity: 20, unit_price: 1600, tax_rate: 18 },
      { description: "Office Files & Folders", quantity: 50, unit_price: 180, tax_rate: 18 },
    ],
    subtotal: 41000, tax_amount: 7380, total: 48380, status: "received",
  },
]);

const grnApi = localCrud<GRN>("purchase_grns_v1", [
  {
    grn_no: "GRN-2026-001", grn_date: "2026-07-14",
    po_no: "PO-2026-002", vendor: "Al-Karam Stationers", vendor_id: 2,
    warehouse: "Head Office Store",
    items: [
      { description: "A4 Paper Ream (500 sheets)", quantity: 20, received: 20, unit_price: 1600 },
      { description: "Office Files & Folders", quantity: 50, received: 50, unit_price: 180 },
    ],
    landed_cost: 500, total_value: 41500, status: "posted",
  },
]);

const billsApi = localCrud<VendorBill>("vendor_bills_v1", [
  {
    bill_no: "BILL-2026-001", bill_date: "2026-07-15", due_date: "2026-07-30",
    vendor_id: 2, vendor: "Al-Karam Stationers", po_reference: "PO-2026-002", grn_reference: "GRN-2026-001",
    subtotal: 41000, tax_amount: 7380, wht_rate: 4.5, wht_amount: 1845,
    net_payable: 46535, amount_paid: 0, balance: 46535, status: "unpaid",
  },
]);

const paymentsApi = localCrud<VendorPayment>("vendor_payments_v1", []);

// ============= Vendor Form Fields =============
const vendorFields: FieldDef<Vendor>[] = [
  { name: "code", label: "Vendor Code", required: true, section: "Basic" },
  { name: "name", label: "Vendor Name", required: true, section: "Basic" },
  { name: "category", label: "Category", type: "select", required: true, section: "Basic", options: [
    { value: "goods", label: "Goods" }, { value: "services", label: "Services" },
    { value: "logistics", label: "Logistics" }, { value: "utilities", label: "Utilities" }, { value: "other", label: "Other" },
  ] },
  { name: "status", label: "Status", type: "select", required: true, section: "Basic", options: [
    { value: "active", label: "Active" }, { value: "on_hold", label: "On Hold" }, { value: "blocked", label: "Blocked" },
  ] },
  { name: "contact_person", label: "Contact Person", section: "Contact" },
  { name: "phone", label: "Phone", type: "tel", section: "Contact" },
  { name: "email", label: "Email", type: "email", section: "Contact" },
  { name: "city", label: "City", section: "Contact", hideInTable: true },
  { name: "address", label: "Address", type: "textarea", section: "Contact", fullWidth: true, hideInTable: true },
  { name: "ntn", label: "NTN", section: "Tax", hideInTable: true },
  { name: "strn", label: "STRN (Sales Tax)", section: "Tax", hideInTable: true },
  { name: "payment_terms", label: "Payment Terms", required: true, section: "Financial" },
  { name: "bank", label: "Bank", type: "select", options: PK_BANKS, section: "Financial", hideInTable: true },
  { name: "iban", label: "IBAN", section: "Financial", hideInTable: true },
  { name: "opening_balance", label: "Opening Balance (PKR)", type: "number", section: "Financial",
    render: (v) => fmtPKR(v) },
  { name: "notes", label: "Notes", type: "textarea", section: "Financial", fullWidth: true, hideInTable: true },
];

// ============= PO Dialog =============
function POEditor({ open, onOpenChange, initial, vendors, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; initial?: PurchaseOrder;
  vendors: Vendor[]; onSaved: () => void;
}) {
  const now = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Partial<PurchaseOrder>>(initial ?? {
    po_no: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    po_date: now, vendor_id: vendors[0]?.id ?? 0, vendor: vendors[0]?.name ?? "",
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 18 }],
    status: "draft" as const,
  });
  const items = form.items ?? [];

  function recalc(next: POItem[]) {
    const subtotal = next.reduce((s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0), 0);
    const tax = next.reduce((s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0) * (Number(it.tax_rate ?? 0) / 100), 0);
    return { subtotal, tax_amount: tax, total: subtotal + tax };
  }

  function updateItem(idx: number, patch: Partial<POItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    setForm({ ...form, items: next, ...recalc(next) });
  }
  function addItem() {
    const next = [...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 18 }];
    setForm({ ...form, items: next, ...recalc(next) });
  }
  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setForm({ ...form, items: next, ...recalc(next) });
  }

  async function save() {
    if (!form.vendor_id) return toast.error("Select vendor");
    if (!(form.items ?? []).some((it) => it.description)) return toast.error("Add at least one item");
    const payload = { ...form, ...recalc(form.items!) } as any;
    if (initial) await poApi.update(initial.id, payload);
    else await poApi.create(payload);
    toast.success(initial ? "PO updated" : "PO created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.po_no}` : "New Purchase Order"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>PO Number</Label><Input value={form.po_no ?? ""} onChange={(e) => setForm({ ...form, po_no: e.target.value })} /></div>
          <div><Label>PO Date</Label><Input type="date" value={form.po_date ?? ""} onChange={(e) => setForm({ ...form, po_date: e.target.value })} /></div>
          <div><Label>Expected Date</Label><Input type="date" value={form.expected_date ?? ""} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
          <div>
            <Label>Vendor</Label>
            <Select value={String(form.vendor_id ?? "")} onValueChange={(v) => {
              const ven = vendors.find((x) => x.id === Number(v));
              setForm({ ...form, vendor_id: Number(v), vendor: ven?.name ?? "" });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "draft"} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "approved", "partial", "received", "closed", "cancelled"].map((s) =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Line Items</Label>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-16 text-right">Qty</TableHead>
                <TableHead className="w-24 text-right">Rate</TableHead>
                <TableHead className="w-16 text-right">Tax%</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const amt = Number(it.quantity) * Number(it.unit_price) * (1 + Number(it.tax_rate ?? 0) / 100);
                  return (
                    <TableRow key={idx}>
                      <TableCell><Input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input type="number" className="text-right" value={it.tax_rate} onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })} /></TableCell>
                      <TableCell className="text-right font-medium">{fmtPKR(amt)}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
          <div className="text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{fmtPKR(form.subtotal ?? 0)}</span></div>
          <div className="text-muted-foreground">Tax: <span className="font-semibold text-foreground">{fmtPKR(form.tax_amount ?? 0)}</span></div>
          <div className="text-muted-foreground">Total: <span className="font-bold text-primary text-base">{fmtPKR(form.total ?? 0)}</span></div>
        </div>

        <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{initial ? "Update" : "Create PO"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= PO Tab =============
function POTab({ vendors }: { vendors: Vendor[] }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["purchase_orders_v1"], queryFn: poApi.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | undefined>();
  const rows = q.data ?? [];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground", approved: "bg-blue-100 text-blue-800",
      partial: "bg-amber-100 text-amber-800", received: "bg-emerald-100 text-emerald-800",
      closed: "bg-slate-200 text-slate-800", cancelled: "bg-red-100 text-red-800",
    };
    return <Badge className={map[s] ?? ""}>{s}</Badge>;
  };

  async function convertToGRN(po: PurchaseOrder) {
    const grn: any = {
      grn_no: `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      grn_date: new Date().toISOString().slice(0, 10),
      po_no: po.po_no, vendor: po.vendor, vendor_id: po.vendor_id,
      warehouse: "Head Office Store",
      items: po.items.map((it) => ({ description: it.description, quantity: it.quantity, received: it.quantity, unit_price: it.unit_price })),
      landed_cost: 0, total_value: po.subtotal, status: "posted",
    };
    await grnApi.create(grn);
    await poApi.update(po.id, { status: "received" } as any);
    qc.invalidateQueries();
    toast.success(`GRN posted — inventory stocked in for ${po.vendor}`);
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New PO</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PO #</TableHead><TableHead>Date</TableHead><TableHead>Vendor</TableHead>
              <TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchase orders yet.</TableCell></TableRow>}
              {rows.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.po_no}</TableCell>
                  <TableCell>{po.po_date}</TableCell>
                  <TableCell>{po.vendor}</TableCell>
                  <TableCell>{po.items?.length ?? 0} lines</TableCell>
                  <TableCell className="text-right font-semibold">{fmtPKR(po.total)}</TableCell>
                  <TableCell>{statusBadge(po.status)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const { downloadPurchaseDoc } = await purchasePdf();
                      await downloadPurchaseDoc({
                      kind: "PURCHASE ORDER", doc_no: po.po_no, doc_date: po.po_date,
                      vendor: po.vendor, items: po.items, subtotal: po.subtotal,
                      tax_amount: po.tax_amount, total: po.total, status: po.status, notes: po.notes,
                      });
                    }}><Download className="h-3.5 w-3.5" /></Button>
                    {po.status === "approved" && (
                      <Button size="sm" variant="ghost" title="Convert to GRN" onClick={() => convertToGRN(po)}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(po); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await poApi.remove(po.id); qc.invalidateQueries(); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <POEditor open={open} onOpenChange={setOpen} initial={editing} vendors={vendors}
        onSaved={() => qc.invalidateQueries({ queryKey: ["purchase_orders_v1"] })} />
    </>
  );
}

// ============= GRN Tab =============
function GRNTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["purchase_grns_v1"], queryFn: grnApi.list });
  const rows = q.data ?? [];

  async function convertToBill(grn: GRN) {
    const subtotal = grn.total_value;
    const tax = subtotal * 0.18;
    const wht = subtotal * 0.045;
    await billsApi.create({
      bill_no: `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      bill_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      vendor_id: grn.vendor_id, vendor: grn.vendor,
      po_reference: grn.po_no, grn_reference: grn.grn_no,
      subtotal, tax_amount: tax, wht_rate: 4.5, wht_amount: wht,
      net_payable: subtotal + tax - wht, amount_paid: 0, balance: subtotal + tax - wht,
      status: "unpaid",
    } as any);
    qc.invalidateQueries();
    toast.success(`Vendor bill created for ${grn.vendor}`);
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>GRN #</TableHead><TableHead>Date</TableHead><TableHead>PO Ref</TableHead>
            <TableHead>Vendor</TableHead><TableHead>Warehouse</TableHead>
            <TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No GRNs. Approve a PO and click convert to post one.</TableCell></TableRow>}
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.grn_no}</TableCell>
                <TableCell>{g.grn_date}</TableCell>
                <TableCell className="font-mono text-xs">{g.po_no}</TableCell>
                <TableCell>{g.vendor}</TableCell>
                <TableCell>{g.warehouse}</TableCell>
                <TableCell className="text-right font-semibold">{fmtPKR(g.total_value)}</TableCell>
                <TableCell><Badge variant="secondary">{g.status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={async () => {
                    const { downloadPurchaseDoc } = await purchasePdf();
                    await downloadPurchaseDoc({
                    kind: "GOODS RECEIPT NOTE", doc_no: g.grn_no, doc_date: g.grn_date,
                    po_reference: g.po_no, warehouse: g.warehouse, vendor: g.vendor,
                    items: g.items.map((it) => ({ description: it.description, quantity: it.received, unit_price: it.unit_price, tax_rate: 0 })),
                    subtotal: g.total_value, tax_amount: 0, total: g.total_value, status: g.status,
                    });
                  }}><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => convertToBill(g)}>
                    <ArrowRight className="h-3.5 w-3.5 mr-1" />Bill
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============= Bills Tab =============
function BillsTab({ vendors }: { vendors: Vendor[] }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vendor_bills_v1"], queryFn: billsApi.list });
  const [payOpen, setPayOpen] = useState<VendorBill | null>(null);
  const [payAmt, setPayAmt] = useState(0);
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payBank, setPayBank] = useState("Meezan Bank");

  const rows = q.data ?? [];

  async function pay() {
    if (!payOpen) return;
    if (payAmt <= 0 || payAmt > payOpen.balance) return toast.error("Invalid amount");
    await paymentsApi.create({
      payment_no: `VPY-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      payment_date: new Date().toISOString().slice(0, 10),
      vendor_id: payOpen.vendor_id, vendor: payOpen.vendor, bill_no: payOpen.bill_no,
      amount: payAmt, method: payMethod, bank: payBank,
    } as any);
    const newPaid = payOpen.amount_paid + payAmt;
    const newBal = payOpen.net_payable - newPaid;
    await billsApi.update(payOpen.id, {
      amount_paid: newPaid, balance: newBal,
      status: newBal <= 0 ? "paid" : "partially_paid",
    } as any);
    qc.invalidateQueries();
    toast.success(`Payment of ${fmtPKR(payAmt)} recorded for ${payOpen.vendor}`);
    setPayOpen(null); setPayAmt(0);
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Bill #</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead>
              <TableHead>Vendor</TableHead><TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Tax</TableHead><TableHead className="text-right">WHT</TableHead>
              <TableHead className="text-right">Net</TableHead><TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No bills yet.</TableCell></TableRow>}
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.bill_no}</TableCell>
                  <TableCell>{b.bill_date}</TableCell>
                  <TableCell>{b.due_date}</TableCell>
                  <TableCell>{b.vendor}</TableCell>
                  <TableCell className="text-right">{fmtPKR(b.subtotal)}</TableCell>
                  <TableCell className="text-right">{fmtPKR(b.tax_amount)}</TableCell>
                  <TableCell className="text-right text-amber-600">-{fmtPKR(b.wht_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtPKR(b.net_payable)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{fmtPKR(b.balance)}</TableCell>
                  <TableCell><Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const { downloadPurchaseDoc } = await purchasePdf();
                      await downloadPurchaseDoc({
                      kind: "VENDOR BILL", doc_no: b.bill_no, doc_date: b.bill_date, due_date: b.due_date,
                      po_reference: b.po_reference, vendor: b.vendor,
                      items: [{ description: `Charges as per ${b.po_reference ?? "invoice"}`, quantity: 1, unit_price: b.subtotal, tax_rate: 18 }],
                      subtotal: b.subtotal, tax_amount: b.tax_amount, wht_amount: b.wht_amount, total: b.net_payable, status: b.status,
                      });
                    }}><Download className="h-3.5 w-3.5" /></Button>
                    {b.balance > 0 && (
                      <Button size="sm" variant="outline" onClick={() => { setPayOpen(b); setPayAmt(b.balance); }}>
                        Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Bill {payOpen?.bill_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Vendor: <span className="font-medium text-foreground">{payOpen?.vendor}</span></div>
            <div className="text-sm text-muted-foreground">Balance: <span className="font-bold text-primary">{fmtPKR(payOpen?.balance ?? 0)}</span></div>
            <div><Label>Amount</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(Number(e.target.value))} /></div>
            <div><Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cash", "bank_transfer", "cheque", "raast", "wallet"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Bank / Account</Label>
              <Select value={payBank} onValueChange={setPayBank}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PK_BANKS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={pay}><CheckCircle2 className="h-4 w-4 mr-1" />Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============= Aging Tab =============
function AgingTab({ bills, vendors }: { bills: VendorBill[]; vendors: Vendor[] }) {
  const today = new Date();
  const buckets = useMemo(() => {
    const byVendor: Record<number, { vendor: string; b0_30: number; b31_60: number; b61_90: number; b90p: number; total: number }> = {};
    bills.filter((b) => b.balance > 0 && b.status !== "cancelled").forEach((b) => {
      const due = new Date(b.due_date);
      const days = Math.floor((today.getTime() - due.getTime()) / 864e5);
      const row = byVendor[b.vendor_id] ?? { vendor: b.vendor, b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0, total: 0 };
      if (days <= 30) row.b0_30 += b.balance;
      else if (days <= 60) row.b31_60 += b.balance;
      else if (days <= 90) row.b61_90 += b.balance;
      else row.b90p += b.balance;
      row.total += b.balance;
      byVendor[b.vendor_id] = row;
    });
    return Object.values(byVendor);
  }, [bills, today]);

  const totals = buckets.reduce((s, r) => ({
    b0_30: s.b0_30 + r.b0_30, b31_60: s.b31_60 + r.b31_60,
    b61_90: s.b61_90 + r.b61_90, b90p: s.b90p + r.b90p, total: s.total + r.total,
  }), { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0, total: 0 });

  void vendors;
  return (
    <Card>
      <CardHeader><CardTitle>Payables Aging</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Current (0-30)</TableHead>
            <TableHead className="text-right">31-60</TableHead>
            <TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right text-destructive">90+</TableHead>
            <TableHead className="text-right">Total Outstanding</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {buckets.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No outstanding payables.</TableCell></TableRow>}
            {buckets.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.vendor}</TableCell>
                <TableCell className="text-right">{fmtPKR(r.b0_30)}</TableCell>
                <TableCell className="text-right">{fmtPKR(r.b31_60)}</TableCell>
                <TableCell className="text-right">{fmtPKR(r.b61_90)}</TableCell>
                <TableCell className="text-right text-destructive font-semibold">{fmtPKR(r.b90p)}</TableCell>
                <TableCell className="text-right font-bold">{fmtPKR(r.total)}</TableCell>
              </TableRow>
            ))}
            {buckets.length > 0 && (
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{fmtPKR(totals.b0_30)}</TableCell>
                <TableCell className="text-right">{fmtPKR(totals.b31_60)}</TableCell>
                <TableCell className="text-right">{fmtPKR(totals.b61_90)}</TableCell>
                <TableCell className="text-right text-destructive">{fmtPKR(totals.b90p)}</TableCell>
                <TableCell className="text-right text-primary">{fmtPKR(totals.total)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============= Ledger Tab =============
function LedgerTab({ vendors, bills, payments }: { vendors: Vendor[]; bills: VendorBill[]; payments: VendorPayment[] }) {
  const [vid, setVid] = useState<number>(vendors[0]?.id ?? 0);
  const vendor = vendors.find((v) => v.id === vid);
  const entries = useMemo(() => {
    if (!vendor) return [];
    const ops: { date: string; ref: string; desc: string; debit: number; credit: number }[] = [];
    if (vendor.opening_balance) ops.push({ date: "opening", ref: "OPEN", desc: "Opening Balance", debit: 0, credit: vendor.opening_balance });
    bills.filter((b) => b.vendor_id === vid).forEach((b) => ops.push({
      date: b.bill_date, ref: b.bill_no, desc: `Bill ${b.po_reference ?? ""}`, debit: 0, credit: b.net_payable,
    }));
    payments.filter((p) => p.vendor_id === vid).forEach((p) => ops.push({
      date: p.payment_date, ref: p.payment_no, desc: `Payment (${p.method})${p.bank ? ` — ${p.bank}` : ""}`, debit: p.amount, credit: 0,
    }));
    ops.sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return ops.map((o) => { bal += o.credit - o.debit; return { ...o, balance: bal }; });
  }, [vendor, bills, payments, vid]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Vendor Ledger</CardTitle>
          <Select value={String(vid)} onValueChange={(v) => setVid(Number(v))}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead>
            <TableHead className="text-right">Debit (Payment)</TableHead>
            <TableHead className="text-right">Credit (Bill)</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions.</TableCell></TableRow>}
            {entries.map((e, i) => (
              <TableRow key={i}>
                <TableCell>{e.date}</TableCell>
                <TableCell className="font-mono text-xs">{e.ref}</TableCell>
                <TableCell>{e.desc}</TableCell>
                <TableCell className="text-right text-emerald-600">{e.debit ? fmtPKR(e.debit) : "—"}</TableCell>
                <TableCell className="text-right text-amber-700">{e.credit ? fmtPKR(e.credit) : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmtPKR(e.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============= Main Page =============
function PurchasePage() {
  const vendorsQ = useQuery({ queryKey: ["purchase_vendors_v1"], queryFn: vendorsApi.list });
  const poQ = useQuery({ queryKey: ["purchase_orders_v1"], queryFn: poApi.list });
  const billsQ = useQuery({ queryKey: ["vendor_bills_v1"], queryFn: billsApi.list });
  const paymentsQ = useQuery({ queryKey: ["vendor_payments_v1"], queryFn: paymentsApi.list });

  const vendors = vendorsQ.data ?? [];
  const pos = poQ.data ?? [];
  const bills = billsQ.data ?? [];
  const payments = paymentsQ.data ?? [];

  const activeVendors = vendors.filter((v) => v.status === "active").length;
  const openPOs = pos.filter((p) => ["draft", "approved", "partial"].includes(p.status)).length;
  const outstanding = bills.reduce((s, b) => s + Number(b.balance ?? 0), 0);
  const monthlySpend = bills.filter((b) => b.bill_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, b) => s + Number(b.net_payable ?? 0), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Purchase & Vendors"
        description="Vendor master, purchase orders, goods receipts, bills and payables — integrated with inventory and financials."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "purchase",
              moduleLabel: "Purchase & Vendors",
              title: "Purchase & Vendors Report",
              subtitle: `${vendors.length} vendor(s) · ${pos.length} PO(s) · ${bills.length} bill(s)`,
              meta: [
                { label: "Active Vendors", value: String(activeVendors) },
                { label: "Open POs", value: String(openPOs) },
                { label: "Payables", value: fmtPKR(outstanding) },
                { label: "Month Spend", value: fmtPKR(monthlySpend) },
              ],
              sections: [
                {
                  title: "Vendors",
                  columns: [
                    { key: "code", label: "Code" },
                    { key: "name", label: "Name" },
                    { key: "category", label: "Category" },
                    { key: "contact_person", label: "Contact" },
                    { key: "phone", label: "Phone" },
                    { key: "ntn", label: "NTN" },
                    { key: "city", label: "City" },
                    { key: "payment_terms", label: "Terms" },
                    { key: "status", label: "Status" },
                  ],
                  rows: vendors,
                },
                {
                  title: "Purchase Orders",
                  columns: [
                    { key: "po_no", label: "PO #" },
                    { key: "vendor_name", label: "Vendor" },
                    { key: "po_date", label: "Date" },
                    { key: "total", label: "Total", format: (v) => fmtPKR(v ?? 0) },
                    { key: "status", label: "Status" },
                  ],
                  rows: pos,
                },
                {
                  title: "Bills / Payables",
                  columns: [
                    { key: "bill_no", label: "Bill #" },
                    { key: "vendor_name", label: "Vendor" },
                    { key: "bill_date", label: "Date" },
                    { key: "due_date", label: "Due" },
                    { key: "net_payable", label: "Amount", format: (v) => fmtPKR(v ?? 0) },
                    { key: "balance", label: "Balance", format: (v) => fmtPKR(v ?? 0) },
                    { key: "status", label: "Status" },
                  ],
                  rows: bills,
                },
              ],
            })}
          />
        }
      />
      <StatsCards stats={[
        { label: "Active Vendors", value: activeVendors, hint: `${vendors.length} total`, icon: Building2 },
        { label: "Open POs", value: openPOs, hint: "Awaiting delivery", icon: ShoppingCart, tint: "oklch(0.72 0.18 55)" },
        { label: "Payables", value: fmtPKR(outstanding), hint: "Total outstanding", icon: TrendingDown, tint: "oklch(0.65 0.2 25)" },
        { label: "This Month Spend", value: fmtPKR(monthlySpend), hint: "Bills posted", icon: ReceiptText },
      ]} />

      <Tabs defaultValue="vendors" className="mt-4">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="vendors"><Building2 className="h-3.5 w-3.5 mr-1" />Vendors</TabsTrigger>
          <TabsTrigger value="pos"><ShoppingCart className="h-3.5 w-3.5 mr-1" />POs</TabsTrigger>
          <TabsTrigger value="grns"><PackageCheck className="h-3.5 w-3.5 mr-1" />GRN</TabsTrigger>
          <TabsTrigger value="bills"><ReceiptText className="h-3.5 w-3.5 mr-1" />Bills</TabsTrigger>
          <TabsTrigger value="aging"><TrendingDown className="h-3.5 w-3.5 mr-1" />Aging</TabsTrigger>
          <TabsTrigger value="ledger"><BookOpen className="h-3.5 w-3.5 mr-1" />Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-4">
          <CrudTable<Vendor> title="Vendor" fields={vendorFields} api={vendorsApi} queryKey="purchase_vendors_v1"
            searchable={["name", "code", "ntn", "city"]}
            defaults={{ status: "active", opening_balance: 0, payment_terms: "Net 30", category: "goods" }} />
        </TabsContent>
        <TabsContent value="pos" className="mt-4"><POTab vendors={vendors} /></TabsContent>
        <TabsContent value="grns" className="mt-4"><GRNTab /></TabsContent>
        <TabsContent value="bills" className="mt-4"><BillsTab vendors={vendors} /></TabsContent>
        <TabsContent value="aging" className="mt-4"><AgingTab bills={bills} vendors={vendors} /></TabsContent>
        <TabsContent value="ledger" className="mt-4"><LedgerTab vendors={vendors} bills={bills} payments={payments} /></TabsContent>
      </Tabs>
      <ModuleReportsCard module="purchase" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/purchase")({
  head: () => ({ meta: [{ title: "Purchase & Vendors — Devionic ERP" }] }),
  component: PurchasePage,
});
