import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Send, CheckCircle2, Wallet, PackageSearch, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { CatalogPicker } from "@/components/dms/CatalogPicker";
import { catalogToQuotationDefaults } from "@/lib/catalog";
import { localCrud } from "@/lib/local-store";
import { PK_TAX_STATUS, fmtPKR } from "@/lib/pk";

const quotationPdf = () => import("@/lib/pdf-docs");


type Quotation = {
  id: number;
  quote_no: string;
  quote_date: string;
  valid_until?: string;
  client: string;
  client_ntn?: string;
  client_address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  subject: string;
  scope: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
  currency: string;
  tax_status?: string;
  delivery_time?: string;
  payment_terms?: string;
  warranty?: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  prepared_by?: string;
  notes?: string;
};

const api = localCrud<Quotation>("quotations", [
  {
    quote_no: "QT-2026-014", quote_date: "2026-07-02", valid_until: "2026-08-01",
    client: "Beta Foods (Pvt) Ltd", client_ntn: "5544332-1",
    client_address: "F-11 Markaz, Islamabad",
    contact_person: "Bilal Ahmed", contact_phone: "+92 300 1234567", contact_email: "bilal@betafoods.pk",
    subject: "POS + Inventory Software",
    scope: "Cloud POS for 5 outlets, inventory sync, dashboard, 3 months support.",
    quantity: 1, unit_price: 650000, subtotal: 650000, discount: 25000,
    gst_rate: 18, gst_amount: 112500, total: 737500, currency: "PKR",
    tax_status: "filer",
    delivery_time: "6 weeks from PO",
    payment_terms: "50% advance, 50% on delivery via Raast / IBAN",
    warranty: "6 months free support & bug fixes",
    status: "sent", prepared_by: "Ahmed Hassan",
  },
  {
    quote_no: "QT-2026-015", quote_date: "2026-07-09", valid_until: "2026-08-08",
    client: "Gamma Logistics", client_ntn: "7788990-1",
    client_address: "Korangi Industrial Area, Karachi",
    contact_person: "Sana Malik", contact_phone: "+92 321 9876543",
    subject: "Fleet Tracking Dashboard",
    scope: "Web dashboard, driver app, geofence alerts, monthly reports.",
    quantity: 1, unit_price: 1450000, subtotal: 1450000, discount: 0,
    gst_rate: 18, gst_amount: 261000, total: 1711000, currency: "PKR",
    tax_status: "filer",
    delivery_time: "10 weeks",
    payment_terms: "30% advance, 40% mid-milestone, 30% on delivery",
    warranty: "12 months",
    status: "accepted", prepared_by: "Fatima Noor",
  },
]);

const fields: FieldDef<Quotation>[] = [
  { name: "quote_no", label: "Quotation #", required: true, section: "Quotation" },
  { name: "quote_date", label: "Date", type: "date", required: true, section: "Quotation" },
  { name: "valid_until", label: "Valid Until", type: "date", section: "Quotation" },
  { name: "currency", label: "Currency", section: "Quotation", hideInTable: true },
  { name: "prepared_by", label: "Prepared By", section: "Quotation", hideInTable: true },
  { name: "status", label: "Status", type: "select", required: true, section: "Quotation", options: [
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent to Client" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" },
    { value: "converted", label: "Converted to Invoice" },
  ] },

  { name: "client", label: "Client", required: true, section: "Client" },
  { name: "client_ntn", label: "Client NTN", section: "Client", hideInTable: true },
  { name: "tax_status", label: "Tax Status", type: "select", options: PK_TAX_STATUS, section: "Client", hideInTable: true },
  { name: "contact_person", label: "Contact Person", section: "Client", hideInTable: true },
  { name: "contact_phone", label: "Contact Phone", type: "tel", section: "Client", hideInTable: true },
  { name: "contact_email", label: "Contact Email", type: "email", section: "Client", hideInTable: true },
  { name: "client_address", label: "Client Address", type: "textarea", section: "Client", fullWidth: true, hideInTable: true },

  { name: "subject", label: "Subject", required: true, section: "Scope", fullWidth: true, hideInTable: true },
  { name: "scope", label: "Scope of Work", type: "textarea", required: true, section: "Scope", fullWidth: true, hideInTable: true },
  { name: "quantity", label: "Quantity", type: "number", required: true, section: "Scope", hideInTable: true },
  { name: "unit_price", label: "Unit Price (PKR)", type: "number", required: true, section: "Scope", hideInTable: true,
    render: (v) => fmtPKR(v) },

  { name: "subtotal", label: "Subtotal", type: "number", required: true, section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "discount", label: "Discount (PKR)", type: "number", section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "gst_rate", label: "GST Rate (%)", type: "number", section: "Totals", hideInTable: true },
  { name: "gst_amount", label: "GST Amount", type: "number", section: "Totals", hideInTable: true,
    render: (v) => fmtPKR(v) },
  { name: "total", label: "Total (PKR)", type: "number", required: true, section: "Totals",
    render: (v) => fmtPKR(v) },

  { name: "delivery_time", label: "Delivery Time", section: "Terms", hideInTable: true },
  { name: "payment_terms", label: "Payment Terms", type: "textarea", section: "Terms", fullWidth: true, hideInTable: true },
  { name: "warranty", label: "Warranty / Support", section: "Terms", hideInTable: true },
  { name: "notes", label: "Internal Notes", type: "textarea", section: "Terms", fullWidth: true, hideInTable: true },
];

function QuotationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["quotations"], queryFn: api.list });
  const [pickerOpen, setPickerOpen] = useState(false);
  const rows = q.data ?? [];
  const sent = rows.filter((r) => r.status === "sent").length;
  const accepted = rows.filter((r) => r.status === "accepted" || r.status === "converted");
  const acceptedValue = accepted.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const totalValue = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);

  const handleCatalogPick = async (item: any, qtyN: number) => {
    const line = catalogToQuotationDefaults(item, qtyN);
    const today = new Date().toISOString().slice(0, 10);
    const valid = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const next = (rows[0]?.id ?? 0) + 1;
    const quote_no = `QT-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
    await api.create({
      quote_no, quote_date: today, valid_until: valid,
      client: "", status: "draft" as const, tax_status: "filer",
      ...line,
    } as any);
    qc.invalidateQueries({ queryKey: ["quotations"] });
    toast.success(`Draft quotation created from ${item.name}. Edit to add client details.`);
  };

  return (
    <AppLayout>
      <PageHeader title="Quotations"
        description="Client proposals with scope, GST, validity and terms — ready for Pakistan market."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "quotations",
                moduleLabel: "Quotations",
                title: "Quotations Report",
                subtitle: `${rows.length} quotation(s) · ${accepted.length} accepted`,
                meta: [
                  { label: "Sent", value: String(sent) },
                  { label: "Accepted", value: String(accepted.length) },
                  { label: "Total Value", value: fmtPKR(totalValue) },
                  { label: "Accepted Value", value: fmtPKR(acceptedValue) },
                ],
                sections: [{
                  title: "All Quotations",
                  columns: [
                    { key: "quote_no", label: "Quote #" },
                    { key: "quote_date", label: "Date" },
                    { key: "client", label: "Client" },
                    { key: "total", label: "Total", format: (v) => fmtPKR(v ?? 0) },
                    { key: "validity", label: "Validity" },
                    { key: "status", label: "Status" },
                  ],
                  rows,
                }],
              })}
            />
            <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-1.5">
              <PackageSearch className="h-4 w-4" /> New from Catalog
            </Button>
          </div>
        } />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Quotations", value: rows.length, hint: "All proposals", icon: FileSpreadsheet },
        { label: "Sent to Client", value: sent, hint: "Awaiting response", icon: Send, tint: "oklch(0.72 0.18 55)" },
        { label: "Accepted", value: accepted.length, hint: fmtPKR(acceptedValue), icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Total Value", value: fmtPKR(totalValue), hint: "Quoted pipeline", icon: Wallet },
      ]} />
      <CrudTable<Quotation> title="Quotation" fields={fields} api={api} queryKey="quotations"
        searchable={["quote_no", "client", "subject", "status"]}
        rowActions={(row) => (
          <>
            <Button size="sm" variant="ghost" title="Download PDF"
              onClick={async () => {
                const { downloadQuotationPdf } = await quotationPdf();
                downloadQuotationPdf(row).catch((e) => toast.error(e?.message ?? "PDF failed"));
              }}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Convert to Invoice"
              disabled={row.status === "converted"}
              onClick={async () => {
                try {
                  const existing = JSON.parse(localStorage.getItem("dms:invoices") ?? "[]") as any[];
                  const nextId = (existing[0]?.id ?? 0) + 1;
                  const invoice_no = `INV-${new Date().getFullYear()}-${String(nextId).padStart(3, "0")}`;
                  const today = new Date().toISOString().slice(0, 10);
                  const due = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);
                  const subtotal = Number(row.subtotal ?? 0) - Number(row.discount ?? 0);
                  const gst_amount = Number(row.gst_amount ?? subtotal * (row.gst_rate ?? 18) / 100);
                  const wht_rate = row.tax_status === "non_filer" ? 9 : 4.5;
                  const wht_amount = subtotal * wht_rate / 100;
                  const total = subtotal + gst_amount - wht_amount;
                  const newInv = {
                    id: Date.now(), invoice_no, invoice_date: today, due_date: due,
                    client: row.client, client_ntn: row.client_ntn, client_address: row.client_address,
                    subject: row.subject, description: row.scope,
                    subtotal, gst_rate: row.gst_rate ?? 18, gst_amount,
                    wht_rate, wht_amount, total, currency: row.currency ?? "PKR",
                    tax_status: row.tax_status, status: "unpaid",
                    quote_ref: row.quote_no,
                  };
                  localStorage.setItem("dms:invoices", JSON.stringify([newInv, ...existing]));
                  await api.update(row.id, { status: "converted" as const });
                  qc.invalidateQueries({ queryKey: ["quotations"] });
                  toast.success(`Invoice ${invoice_no} created from ${row.quote_no}`);
                } catch (e: any) { toast.error(e?.message ?? "Conversion failed"); }
              }}>
              <ArrowRightCircle className="h-4 w-4" />
            </Button>
          </>
        )}
        defaults={{ status: "draft", currency: "PKR", quantity: 1, unit_price: 0, subtotal: 0, discount: 0, gst_rate: 18, gst_amount: 0, total: 0 }} />
      <CatalogPicker open={pickerOpen} onOpenChange={setPickerOpen}
        onPick={handleCatalogPick} title="New Quotation from Catalog" />
      <ModuleReportsCard module="quotations" />
    </AppLayout>
  );
}


export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — Devionic DMS" }] }),
  component: QuotationsPage,
});
