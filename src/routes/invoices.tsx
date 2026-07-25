import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Receipt, CheckCircle2, AlertCircle, Wallet, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { CatalogPicker } from "@/components/dms/CatalogPicker";
import { catalogToInvoiceDefaults } from "@/lib/catalog";
import { localCrud } from "@/lib/local-store";
import { resources } from "@/lib/api";
import { PK_BANKS, PK_PAYMENT_METHODS, PK_TAX_STATUS, fmtPKR } from "@/lib/pk";
import { toast } from "sonner";

const invoicePdf = () => import("@/lib/pdf-docs");



type Invoice = {
  id: number;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  client: string;
  project?: string;

  client_ntn?: string;
  client_strn?: string;
  client_address?: string;
  po_reference?: string;
  currency: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  wht_rate: number;
  wht_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method?: string;
  bank?: string;
  tax_status?: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  notes?: string;
  terms?: string;
};

const api = localCrud<Invoice>("invoices", [
  {
    invoice_no: "INV-2026-001", invoice_date: "2026-07-01", due_date: "2026-07-31",
    client: "Zeta Retail (Pvt) Ltd", client_ntn: "9876543-2", client_strn: "17-99-8877-002-33",
    client_address: "Plot 12, Gulberg III, Lahore",
    po_reference: "PO-ZR-4421", currency: "PKR",
    item_description: "ERP customization — Q3 retainer", quantity: 1, unit_price: 1200000,
    subtotal: 1200000, discount: 0, gst_rate: 18, gst_amount: 216000,
    wht_rate: 3, wht_amount: 36000, total: 1380000, amount_paid: 1380000, balance_due: 0,
    payment_method: "bank_transfer", bank: "Meezan Bank", tax_status: "filer",
    status: "paid", terms: "Net 30. Late fee 2% per month.",
  },
  {
    invoice_no: "INV-2026-002", invoice_date: "2026-07-08", due_date: "2026-08-07",
    client: "Alpha Textiles", client_ntn: "1122334-5",
    client_address: "SITE Area, Karachi", currency: "PKR",
    item_description: "Mobile app development — Milestone 2", quantity: 1, unit_price: 850000,
    subtotal: 850000, discount: 25000, gst_rate: 18, gst_amount: 148500,
    wht_rate: 3, wht_amount: 24750, total: 948750, amount_paid: 400000, balance_due: 548750,
    payment_method: "bank_transfer", bank: "HBL", tax_status: "filer",
    status: "partially_paid", terms: "Net 30.",
  },
]);

const buildFields = (projectOpts: { value: string; label: string }[]): FieldDef<Invoice>[] => [
  { name: "invoice_no", label: "Invoice #", required: true, section: "Invoice" },
  { name: "invoice_date", label: "Invoice Date", type: "date", required: true, section: "Invoice" },
  { name: "due_date", label: "Due Date", type: "date", section: "Invoice" },
  { name: "po_reference", label: "PO Reference", section: "Invoice" },
  { name: "currency", label: "Currency", section: "Invoice" },
  { name: "status", label: "Status", type: "select", required: true, section: "Invoice", options: [
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "partially_paid", label: "Partially Paid" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
    { value: "cancelled", label: "Cancelled" },
  ] },

  { name: "project", label: "Project", type: "select", section: "Invoice", options: projectOpts, placeholder: projectOpts.length ? "Select an in-progress project" : "No in-progress projects" },
  { name: "client", label: "Client / Bill To", required: true, section: "Client" },

  { name: "client_ntn", label: "Client NTN", section: "Client", hideInTable: true },
  { name: "client_strn", label: "Client STRN (Sales Tax)", section: "Client", hideInTable: true },
  { name: "tax_status", label: "Tax Status", type: "select", options: PK_TAX_STATUS, section: "Client", hideInTable: true },
  { name: "client_address", label: "Client Address", type: "textarea", section: "Client", hideInTable: true, fullWidth: true },

  { name: "item_description", label: "Item / Service Description", type: "textarea", required: true, section: "Line Item", fullWidth: true, hideInTable: true },
  { name: "quantity", label: "Quantity", type: "number", required: true, section: "Line Item", hideInTable: true },
  { name: "unit_price", label: "Unit Price (PKR)", type: "number", required: true, section: "Line Item", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "discount", label: "Discount (PKR)", type: "number", section: "Line Item", hideInTable: true,
    render: (v) => fmtPKR(v) },

  { name: "subtotal", label: "Subtotal", type: "number", required: true, section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "gst_rate", label: "GST Rate (%)", type: "number", section: "Totals", hideInTable: true },
  { name: "gst_amount", label: "GST Amount", type: "number", section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "wht_rate", label: "WHT Rate (%)", type: "number", section: "Totals", hideInTable: true },
  { name: "wht_amount", label: "WHT Amount", type: "number", section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "total", label: "Total (PKR)", type: "number", required: true, section: "Totals",
    render: (v) => fmtPKR(v) },
  { name: "amount_paid", label: "Amount Paid", type: "number", section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "balance_due", label: "Balance Due", type: "number", section: "Totals",
    render: (v) => fmtPKR(v) },

  { name: "payment_method", label: "Payment Method", type: "select", options: PK_PAYMENT_METHODS, section: "Payment", hideInTable: true },
  { name: "bank", label: "Bank / Wallet", type: "select", options: PK_BANKS, section: "Payment", hideInTable: true },

  { name: "terms", label: "Terms & Conditions", type: "textarea", section: "Notes", fullWidth: true, hideInTable: true },
  { name: "notes", label: "Internal Notes", type: "textarea", section: "Notes", fullWidth: true, hideInTable: true },
];

function InvoicesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["invoices"], queryFn: api.list });
  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: resources.projects.list });
  const [pickerOpen, setPickerOpen] = useState(false);
  const rows = q.data ?? [];
  const paidAmt = rows.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const remaining = rows.reduce((s, r) => s + Number(r.balance_due ?? 0), 0);
  const total = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const overdue = rows.filter((r) => r.status === "overdue").length;

  const fields = useMemo(() => {
    const started = (projectsQ.data ?? []).filter((p: any) => p.status === "in_progress");
    const opts = started.map((p: any) => ({ value: p.name, label: p.name }));
    return buildFields(opts);
  }, [projectsQ.data]);

  const handleCatalogPick = async (item: any, qty: number) => {
    const line = catalogToInvoiceDefaults(item, qty);
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const next = (rows[0]?.id ?? 0) + 1;
    const invoice_no = `INV-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
    await api.create({
      invoice_no, invoice_date: today, due_date: due,
      client: "", status: "draft" as const,
      ...line,
      payment_method: "bank_transfer", bank: "Meezan Bank", tax_status: "filer",
    } as any);
    qc.invalidateQueries({ queryKey: ["invoices"] });
    toast.success(`Draft invoice created from ${item.name}. Edit to add client details.`);
  };

  return (
    <AppLayout>
      <PageHeader title="Invoices"
        description="Client invoices with GST, WHT and Pakistan-ready tax fields (NTN/STRN)."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "invoices",
                moduleLabel: "Invoices",
                title: "Invoices Report",
                subtitle: `${rows.length} invoice(s) · Overdue: ${overdue}`,
                meta: [
                  { label: "Invoiced", value: fmtPKR(total) },
                  { label: "Paid", value: fmtPKR(paidAmt) },
                  { label: "Outstanding", value: fmtPKR(remaining) },
                  { label: "Overdue", value: String(overdue) },
                ],
                sections: [
                  {
                    title: "All Invoices",
                    columns: [
                      { key: "invoice_no", label: "Invoice #" },
                      { key: "invoice_date", label: "Date" },
                      { key: "client", label: "Client" },
                      { key: "total", label: "Total", format: (v) => fmtPKR(v) },
                      { key: "amount_paid", label: "Paid", format: (v) => fmtPKR(v) },
                      { key: "balance_due", label: "Balance", format: (v) => fmtPKR(v) },
                      { key: "status", label: "Status" },
                    ],
                    rows,
                  },
                  {
                    title: "Overdue",
                    columns: [
                      { key: "invoice_no", label: "Invoice #" },
                      { key: "client", label: "Client" },
                      { key: "due_date", label: "Due" },
                      { key: "balance_due", label: "Balance", format: (v) => fmtPKR(v) },
                    ],
                    rows: rows.filter((r) => r.status === "overdue"),
                  },
                ],
              })}
            />
            <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-1.5">
              <PackageSearch className="h-4 w-4" /> New from Catalog
            </Button>
          </div>
        } />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Invoiced", value: fmtPKR(total), hint: `${rows.length} invoices`, icon: Receipt },
        { label: "Total Paid", value: fmtPKR(paidAmt), hint: "Received", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Remaining", value: fmtPKR(remaining), hint: "Outstanding balance", icon: Wallet, tint: "oklch(0.72 0.18 55)" },
        { label: "Overdue", value: overdue, hint: "Past due date", icon: AlertCircle, tint: "oklch(0.65 0.2 25)" },
      ]} />
      <CrudTable<Invoice> title="Invoice" fields={fields} api={api} queryKey="invoices"
        searchable={["invoice_no", "client", "po_reference", "status"]}
        rowActions={(row) => (
          <Button size="sm" variant="ghost" title="Download PDF"
            onClick={async () => {
              const { downloadInvoicePdf } = await invoicePdf();
              downloadInvoicePdf(row).catch((e) => toast.error(e?.message ?? "PDF failed"));
            }}>
            <Download className="h-4 w-4" />
          </Button>
        )}
        defaults={{ status: "draft", currency: "PKR", quantity: 1, unit_price: 0, subtotal: 0, discount: 0, gst_rate: 18, gst_amount: 0, wht_rate: 3, wht_amount: 0, total: 0, amount_paid: 0, balance_due: 0 }} />
      <ModuleReportsCard module="invoices" />
      <CatalogPicker open={pickerOpen} onOpenChange={setPickerOpen}
        onPick={handleCatalogPick} title="New Invoice from Catalog" />
    </AppLayout>
  );
}


export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Devionic DMS" }] }),
  component: InvoicesPage,
});
