import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, CheckCircle2, Clock, Wallet, FileText, Download, Printer } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { resources } from "@/lib/api";
import { PK_BANKS, PK_DEPARTMENTS, PK_PAYMENT_METHODS, fmtPKR } from "@/lib/pk";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const payslipPdf = () => import("@/lib/payslip-pdf");

type Payroll = {
  id: number;
  employee: string;
  cnic?: string;
  department?: string;
  designation?: string;
  month: string;
  basic: number;
  house_rent: number;
  medical: number;
  conveyance: number;
  bonus: number;
  overtime: number;
  gross: number;
  income_tax: number;
  eobi: number;
  pessi_sessi: number;
  provident_fund: number;
  loan_deduction: number;
  other_deductions: number;
  deductions: number;
  net: number;
  bank?: string;
  iban?: string;
  payment_method?: string;
  paid_on?: string;
  status: "pending" | "processed" | "paid" | "on_hold";
  remarks?: string;
};

const api = localCrud<Payroll>("hr", [
  { employee: "Farhan Javed", cnic: "35202-1234567-1", department: "Executive / C-Suite", designation: "CEO", month: "2026-07-01", basic: 150000, house_rent: 60000, medical: 15000, conveyance: 15000, bonus: 10000, overtime: 0, gross: 250000, income_tax: 12500, eobi: 370, pessi_sessi: 0, provident_fund: 1500, loan_deduction: 0, other_deductions: 630, deductions: 15000, net: 235000, bank: "Meezan Bank", iban: "PK36MEZN0001230012345678", payment_method: "bank_transfer", paid_on: "2026-07-01", status: "paid" },
  { employee: "Ayesha Khan", cnic: "42101-9876543-2", department: "Finance & Accounts", designation: "Accounts Manager", month: "2026-07-01", basic: 110000, house_rent: 44000, medical: 11000, conveyance: 10000, bonus: 5000, overtime: 0, gross: 180000, income_tax: 9000, eobi: 370, pessi_sessi: 0, provident_fund: 1100, loan_deduction: 0, other_deductions: 1530, deductions: 12000, net: 168000, bank: "HBL", iban: "PK24HABB0001230098765432", payment_method: "bank_transfer", status: "processed" },
]);

const num = (v: any) => (v === "" || v == null ? 0 : Number(v) || 0);
const sumEarnings = (v: Record<string, any>) =>
  num(v.basic) + num(v.house_rent) + num(v.medical) + num(v.conveyance) + num(v.bonus) + num(v.overtime);
const sumDeductions = (v: Record<string, any>) =>
  num(v.income_tax) + num(v.eobi) + num(v.pessi_sessi) + num(v.provident_fund) + num(v.loan_deduction) + num(v.other_deductions);

function HRPage() {
  const q = useQuery({ queryKey: ["hr"], queryFn: api.list });
  const empQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const employees = empQ.data ?? [];

  const fields = useMemo<FieldDef<Payroll>[]>(() => {
    const empByName = new Map(employees.map((e) => [e.name, e]));
    const lookup = (v: Record<string, any>, key: string) => {
      const emp = empByName.get(v.employee) as any;
      return (emp?.[key] as any) ?? "";
    };
    return [
      {
        name: "employee", label: "Employee", required: true, section: "Employee", type: "select",
        options: employees.map((e) => ({ value: e.name, label: e.name })),
      },
      { name: "cnic", label: "CNIC", section: "Employee", type: "computed",
        compute: (v) => v.employee ? (lookup(v, "cnic") || "—") : "" },
      { name: "department", label: "Department", section: "Employee", type: "computed",
        compute: (v) => v.employee ? (lookup(v, "department") || "—") : "" },
      { name: "designation", label: "Designation", section: "Employee", type: "computed",
        compute: (v) => v.employee ? (lookup(v, "position") || "—") : "" },
      { name: "month", label: "Payroll month", type: "date", required: true, section: "Employee" },

      { name: "basic", label: "Basic salary", type: "number", required: true, section: "Earnings",
        render: (v) => fmtPKR(v) },
      { name: "house_rent", label: "House rent (HRA)", type: "number", section: "Earnings" },
      { name: "medical", label: "Medical allowance", type: "number", section: "Earnings" },
      { name: "conveyance", label: "Conveyance", type: "number", section: "Earnings" },
      { name: "bonus", label: "Bonus / Eid bonus", type: "number", section: "Earnings" },
      { name: "overtime", label: "Overtime", type: "number", section: "Earnings" },
      { name: "gross", label: "Gross pay", type: "computed", section: "Earnings",
        compute: (v) => fmtPKR(sumEarnings(v)), render: (_v, r) => fmtPKR(sumEarnings(r as any)) },

      { name: "income_tax", label: "Income tax (FBR)", type: "number", section: "Deductions" },
      { name: "eobi", label: "EOBI contribution", type: "number", section: "Deductions" },
      { name: "pessi_sessi", label: "PESSI / SESSI", type: "number", section: "Deductions" },
      { name: "provident_fund", label: "Provident fund", type: "number", section: "Deductions" },
      { name: "loan_deduction", label: "Loan / advance", type: "number", section: "Deductions" },
      { name: "other_deductions", label: "Other deductions", type: "number", section: "Deductions" },
      { name: "deductions", label: "Total deductions", type: "computed", section: "Deductions",
        compute: (v) => fmtPKR(sumDeductions(v)), render: (_v, r) => fmtPKR(sumDeductions(r as any)) },
      { name: "net", label: "Net payable", type: "computed", section: "Deductions",
        compute: (v) => fmtPKR(sumEarnings(v) - sumDeductions(v)),
        render: (_v, r) => fmtPKR(sumEarnings(r as any) - sumDeductions(r as any)) },

      { name: "bank", label: "Bank", type: "select", options: PK_BANKS, section: "Payment" },
      { name: "iban", label: "IBAN", placeholder: "PK00XXXX0000000000000000", section: "Payment" },
      { name: "payment_method", label: "Payment method", type: "select", options: PK_PAYMENT_METHODS, section: "Payment" },
      { name: "paid_on", label: "Paid on", type: "date", section: "Payment" },
      { name: "status", label: "Status", type: "select", required: true, section: "Payment", options: [
        { value: "pending", label: "Pending" },
        { value: "processed", label: "Processed" },
        { value: "paid", label: "Paid" },
        { value: "on_hold", label: "On Hold" },
      ] },
      { name: "remarks", label: "Remarks", type: "textarea", section: "Payment", hideInTable: true },
    ];
  }, [employees]);

  const rows = q.data ?? [];
  const withTotals = rows.map((r) => {
    const gross = sumEarnings(r as any) || Number(r.gross ?? 0);
    const deductions = sumDeductions(r as any) || Number(r.deductions ?? 0);
    const net = (gross - deductions) || Number(r.net ?? 0);
    return { ...r, gross, deductions, net };
  });
  const paid = withTotals.filter((r) => r.status === "paid");
  const pending = withTotals.filter((r) => r.status === "pending" || r.status === "processed").length;
  const paidAmt = paid.reduce((s, r) => s + Number(r.net ?? 0), 0);
  const totalNet = withTotals.reduce((s, r) => s + Number(r.net ?? 0), 0);

  const [slipFor, setSlipFor] = useState<Payroll | null>(null);
  const [busy, setBusy] = useState<null | "download" | "print">(null);

  const run = async (kind: "download" | "print") => {
    if (!slipFor) return;
    setBusy(kind);
    try {
      const gross = sumEarnings(slipFor as any);
      const deductions = sumDeductions(slipFor as any);
      const net = gross - deductions;
      const payload = { ...slipFor, gross, deductions, net };
      const { downloadPayslip, printPayslip } = await payslipPdf();
      if (kind === "download") await downloadPayslip(payload);
      else await printPayslip(payload);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate payslip");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="HR & Payroll"
        description="Pakistan-compliant payroll: EOBI, PESSI/SESSI, FBR income tax, IBAN payments."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "hr",
              moduleLabel: "HR & Payroll",
              title: "Payroll Report",
              subtitle: `${withTotals.length} payslip(s) — ${paid.length} paid, ${pending} pending.`,
              meta: [
                { label: "Total payslips", value: String(withTotals.length) },
                { label: "Paid", value: fmtPKR(paidAmt) },
                { label: "Pending", value: String(pending) },
                { label: "Net payroll", value: fmtPKR(totalNet) },
              ],
              sections: [
                {
                  title: "All Payslips",
                  columns: [
                    { key: "employee", label: "Employee" },
                    { key: "department", label: "Department" },
                    { key: "month", label: "Month" },
                    { key: "gross", label: "Gross", format: (v) => fmtPKR(v) },
                    { key: "deductions", label: "Deductions", format: (v) => fmtPKR(v) },
                    { key: "net", label: "Net", format: (v) => fmtPKR(v) },
                    { key: "status", label: "Status" },
                    { key: "bank", label: "Bank" },
                    { key: "paid_on", label: "Paid on" },
                  ],
                  rows: withTotals,
                },
                {
                  title: "Paid",
                  columns: [
                    { key: "employee", label: "Employee" },
                    { key: "month", label: "Month" },
                    { key: "net", label: "Net", format: (v) => fmtPKR(v) },
                    { key: "paid_on", label: "Paid on" },
                  ],
                  rows: withTotals.filter((r) => r.status === "paid"),
                },
                {
                  title: "Pending / Processed",
                  columns: [
                    { key: "employee", label: "Employee" },
                    { key: "month", label: "Month" },
                    { key: "net", label: "Net", format: (v) => fmtPKR(v) },
                    { key: "status", label: "Status" },
                  ],
                  rows: withTotals.filter((r) => r.status === "pending" || r.status === "processed"),
                },
              ],
            })}
          />
        }
      />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Payslips", value: rows.length, hint: "All records", icon: Users },
        { label: "Paid", value: paid.length, hint: fmtPKR(paidAmt), icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Pending", value: pending, hint: "Awaiting payment", icon: Clock, tint: "oklch(0.72 0.18 55)" },
        { label: "Total Payroll", value: fmtPKR(totalNet), hint: "Net payable", icon: Wallet },
      ]} />
      <CrudTable<Payroll> title="Payroll" fields={fields} api={api} queryKey="hr"
        searchable={["employee", "cnic", "month", "status", "department"]}
        defaults={{ status: "pending", basic: 0, house_rent: 0, medical: 0, conveyance: 0, bonus: 0, overtime: 0, income_tax: 0, eobi: 370, pessi_sessi: 0, provident_fund: 0, loan_deduction: 0, other_deductions: 0, deductions: 0, net: 0, gross: 0 }}
        rowActions={(row) => (
          <Button size="sm" variant="ghost" title="Payslip" onClick={() => setSlipFor(row)}>
            <FileText className="h-4 w-4" />
          </Button>
        )}
      />
      <ModuleReportsCard module="hr" />

      <Dialog open={slipFor !== null} onOpenChange={(o) => { if (!o) setSlipFor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Salary Payslip
            </DialogTitle>
            <DialogDescription>
              {slipFor?.employee
                ? <>A4 payslip for <span className="font-medium text-foreground">{slipFor.employee}</span>. Choose an option below.</>
                : "Generate the A4 salary payslip."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <button type="button" disabled={!!busy} onClick={() => run("download")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" /> Download payslip
              </div>
              <p className="mt-1 text-xs text-muted-foreground">A4 PDF with full salary breakdown.</p>
            </button>
            <button type="button" disabled={!!busy} onClick={() => run("print")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Printer className="h-4 w-4 text-primary" /> Print payslip
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Opens the print dialog directly.</p>
            </button>
          </div>

          {busy && <p className="text-xs text-muted-foreground">Generating PDF…</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSlipFor(null)} disabled={!!busy}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export const Route = createFileRoute("/hr")({
  head: () => ({ meta: [{ title: "HR & Payroll — Devionic DMS" }] }),
  component: HRPage,
});
