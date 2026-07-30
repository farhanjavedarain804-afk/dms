import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserMinus, Building2, FileText, Download, Printer, FilePlus } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { resources, type Employee } from "@/lib/api";
import { PK_PROVINCES, PK_DEPARTMENTS } from "@/lib/pk";
import { EmployeeCsvImport } from "@/components/dms/EmployeeCsvImport";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmployeesHistoryTab } from "@/components/dms/EmployeesHistoryTab";

const employeeFormPdf = () => import("@/lib/employee-form-pdf");
const employeeCertificatePdf = () => import("@/lib/employee-certificate-pdf");

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Devionic DMS" }] }),
  component: EmployeesPage,
});

const calcAge = (dob?: string) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return age > 0 ? `${age} years` : "";
};

const fields: FieldDef<Employee>[] = [
  { name: "name", label: "Full Name", required: true, placeholder: "Your full name", section: "Personal Information" },
  { name: "father_husband_name", label: "Father / Husband Name", required: true, placeholder: "Father / Husband name", section: "Personal Information", hideInTable: true },
  { name: "cnic", label: "CNIC", required: true, placeholder: "XXXXX-XXXXXXX-X", section: "Personal Information" },
  { name: "date_of_birth", label: "Date of Birth", type: "date", required: true, section: "Personal Information", hideInTable: true },
  { name: "age" as any, label: "Age (auto-calculated)", type: "computed", placeholder: "Auto-calculated from DOB",
    section: "Personal Information", hideInTable: true,
    compute: (v) => calcAge(v.date_of_birth) },
  { name: "nationality", label: "Nationality", required: true, placeholder: "Pakistani", section: "Personal Information", hideInTable: true },
  { name: "mother_name" as any, label: "Mother's Name", placeholder: "Mother's full name", section: "Personal Information", hideInTable: true },
  { name: "gender" as any, label: "Gender", type: "select", section: "Personal Information", hideInTable: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ] },
  { name: "marital_status" as any, label: "Marital Status", type: "select", section: "Personal Information", hideInTable: true,
    options: [
      { value: "married", label: "Married" },
      { value: "unmarried", label: "Unmarried" },
    ] },
  { name: "religion" as any, label: "Religion", placeholder: "e.g. Islam", section: "Personal Information", hideInTable: true },
  { name: "residence_status" as any, label: "Residence Status", type: "select", section: "Personal Information", hideInTable: true,
    options: [
      { value: "resident", label: "Resident" },
      { value: "non_resident", label: "Non-Resident" },
    ] },
  { name: "passport_no" as any, label: "Passport No.", placeholder: "e.g. AB1234567", section: "Personal Information", hideInTable: true },
  { name: "driving_licence" as any, label: "Driving Licence No.", placeholder: "Licence number", section: "Personal Information", hideInTable: true },

  { name: "city", label: "City", required: true, placeholder: "City", section: "Address Information" },
  { name: "tehsil", label: "Tehsil", required: true, placeholder: "Tehsil", section: "Address Information", hideInTable: true },
  { name: "district", label: "District", required: true, placeholder: "District", section: "Address Information", hideInTable: true },
  { name: "province", label: "Province", type: "select", required: true, options: PK_PROVINCES, section: "Address Information", hideInTable: true },
  { name: "postal_address", label: "Complete Postal Address", type: "textarea", required: true, placeholder: "Complete postal address", section: "Address Information", hideInTable: true },
  { name: "permanent_address", label: "Permanent Address", type: "textarea", required: true, placeholder: "Permanent address", section: "Address Information", hideInTable: true },

  { name: "email", label: "Email", type: "email", required: true, placeholder: "your@email.com", section: "Contact Information" },
  { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "+92 XXX-XXXXXXX", section: "Contact Information" },
  { name: "phone2", label: "Phone Number 2", type: "tel", required: true, placeholder: "+92 XXX-XXXXXXX", section: "Contact Information", hideInTable: true },
  { name: "whatsapp", label: "WhatsApp Number", type: "tel", required: true, placeholder: "+92 XXX-XXXXXXX", section: "Contact Information", hideInTable: true },

  { name: "emergency_name", label: "Contact Name", required: true, placeholder: "Emergency contact name", section: "Emergency Contact", hideInTable: true },
  { name: "emergency_relation", label: "Relation", required: true, placeholder: "e.g. Father, Brother", section: "Emergency Contact", hideInTable: true },
  { name: "emergency_phone", label: "Contact Number", type: "tel", required: true, placeholder: "+92 XXX-XXXXXXX", section: "Emergency Contact", hideInTable: true },
  { name: "emergency_whatsapp", label: "WhatsApp Number", type: "tel", required: true, placeholder: "+92 XXX-XXXXXXX", section: "Emergency Contact", hideInTable: true },

  { name: "education", label: "Education", type: "textarea", required: true, placeholder: "List your educational qualifications...", section: "Education & Experience", hideInTable: true },
  { name: "work_experience", label: "Work Experience", type: "textarea", required: true, placeholder: "List your work experience...", section: "Education & Experience", hideInTable: true },

  { name: "documents", label: "Merged Documents PDF", type: "document_upload", uploadFolder: "employees",
    section: "Documents", hideInTable: true, fullWidth: true },

  { name: "department", label: "Department", type: "select", options: PK_DEPARTMENTS, section: "Employment" },
  { name: "position", label: "Designation", section: "Employment", hideInTable: true },
  { name: "join_date", label: "Join date", type: "date", section: "Employment", hideInTable: true },
  { name: "status", label: "Status", type: "select", required: true, section: "Employment",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "on_leave", label: "On leave" },
    ] },

  // ============ For Office Use Only ============
  { name: "employee_code", label: "Employee Code / ID", placeholder: "e.g. DEV-2026-001", section: "For Office Use Only", hideInTable: true },
  { name: "reporting_manager", label: "Reporting Manager", placeholder: "Manager name", section: "For Office Use Only", hideInTable: true },
  { name: "work_location", label: "Work Location", placeholder: "e.g. Head Office, Lahore", section: "For Office Use Only", hideInTable: true },
  { name: "employment_type", label: "Employment Type", type: "select", section: "For Office Use Only", hideInTable: true,
    options: [
      { value: "permanent", label: "Permanent" },
      { value: "contract", label: "Contract" },
      { value: "probation", label: "Probation" },
      { value: "internship", label: "Internship" },
      { value: "part_time", label: "Part-time" },
    ] },
  { name: "probation_period", label: "Probation Period", placeholder: "e.g. 3 months", section: "For Office Use Only", hideInTable: true },
  { name: "confirmation_date", label: "Confirmation Date", type: "date", section: "For Office Use Only", hideInTable: true },
  { name: "contract_type", label: "Contract Type", placeholder: "e.g. Full-time, Fixed-term", section: "For Office Use Only", hideInTable: true },
  { name: "gross_salary", label: "Gross Salary (PKR)", type: "number", placeholder: "e.g. 75000", section: "For Office Use Only", hideInTable: true },
  { name: "bank_name", label: "Bank Name", placeholder: "e.g. HBL, Meezan", section: "For Office Use Only", hideInTable: true },
  { name: "bank_account", label: "Bank Account / IBAN", placeholder: "PKxx XXXX XXXX XXXX XXXX XXXX", section: "For Office Use Only", hideInTable: true },
  { name: "tax_number", label: "NTN / Tax Number", placeholder: "NTN number", section: "For Office Use Only", hideInTable: true },
  { name: "verified_by", label: "Verified By (HR)", placeholder: "HR officer name", section: "For Office Use Only", hideInTable: true },
  { name: "approval_status", label: "Approval Status", type: "select", section: "For Office Use Only", hideInTable: true,
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
    ] },
  { name: "approved_by", label: "Approved By", placeholder: "Approving authority", section: "For Office Use Only", hideInTable: true },
  { name: "approval_date", label: "Approval Date", type: "date", section: "For Office Use Only", hideInTable: true },
  { name: "office_remarks", label: "Office Remarks / Notes", type: "textarea", placeholder: "Internal HR notes...", section: "For Office Use Only", hideInTable: true, fullWidth: true },

  // ============ Salary Breakdown ============
  { name: "basic_salary", label: "Basic Salary (PKR)", type: "number", placeholder: "e.g. 40000", section: "Salary Breakdown", hideInTable: true },
  { name: "house_rent_allowance", label: "House Rent Allowance (PKR)", type: "number", placeholder: "e.g. 15000", section: "Salary Breakdown", hideInTable: true },
  { name: "medical_allowance", label: "Medical Allowance (PKR)", type: "number", placeholder: "e.g. 3000", section: "Salary Breakdown", hideInTable: true },
  { name: "conveyance_allowance", label: "Conveyance Allowance (PKR)", type: "number", placeholder: "e.g. 5000", section: "Salary Breakdown", hideInTable: true },
  { name: "other_allowances", label: "Other Allowances (PKR)", type: "number", placeholder: "e.g. 2000", section: "Salary Breakdown", hideInTable: true },
  { name: "income_tax", label: "Income Tax (PKR)", type: "number", placeholder: "e.g. 1500", section: "Salary Breakdown", hideInTable: true },
  { name: "eobi", label: "EOBI (PKR)", type: "number", placeholder: "e.g. 370", section: "Salary Breakdown", hideInTable: true },
  { name: "provident_fund", label: "Provident Fund (PKR)", type: "number", placeholder: "e.g. 3000", section: "Salary Breakdown", hideInTable: true },
  { name: "other_deductions", label: "Other Deductions (PKR)", type: "number", placeholder: "e.g. 500", section: "Salary Breakdown", hideInTable: true },
  { name: "net_salary", label: "Net Salary (PKR)", type: "number", placeholder: "Take-home pay", section: "Salary Breakdown", hideInTable: true },

  // ============ Document Checklist ============
  ...([
    ["chk_cnic_copy", "CNIC (front & back) copy"],
    ["chk_photograph", "Recent passport photograph"],
    ["chk_edu_certs", "Educational certificates"],
    ["chk_exp_letters", "Experience letters"],
    ["chk_reference_letters", "Reference letters (2)"],
    ["chk_bank_details", "Bank account / IBAN details"],
    ["chk_ntn_cert", "NTN / Tax certificate"],
    ["chk_offer_letter", "Signed offer / appointment letter"],
    ["chk_nda", "Signed NDA / confidentiality"],
    ["chk_medical", "Medical fitness certificate"],
    ["chk_police", "Police character certificate"],
    ["chk_emergency_form", "Emergency contact form"],
  ] as const).map(([name, label]) => ({
    name: name as any, label, type: "select" as const, section: "Document Checklist", hideInTable: true,
    options: [
      { value: "yes", label: "Received" },
      { value: "no", label: "Missing" },
      { value: "na", label: "N/A" },
    ],
  })),

  // ============ HR Verification & Approval Record ============
  { name: "received_by" as any, label: "Received By", placeholder: "Officer name", section: "HR Verification & Approval", hideInTable: true },
  { name: "received_date" as any, label: "Received Date", type: "date", section: "HR Verification & Approval", hideInTable: true },
  { name: "cnic_verified" as any, label: "CNIC Verified", type: "select", section: "HR Verification & Approval", hideInTable: true,
    options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  { name: "documents_verified" as any, label: "Documents Verified", type: "select", section: "HR Verification & Approval", hideInTable: true,
    options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  { name: "references_checked" as any, label: "References Checked", type: "select", section: "HR Verification & Approval", hideInTable: true,
    options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  { name: "background_check" as any, label: "Background Check", type: "select", section: "HR Verification & Approval", hideInTable: true,
    options: [{ value: "cleared", label: "Cleared" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }] },
  { name: "medical_check" as any, label: "Medical Check", type: "select", section: "HR Verification & Approval", hideInTable: true,
    options: [{ value: "cleared", label: "Cleared" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }] },
  { name: "hr_verification_remarks" as any, label: "HR Verification Remarks", type: "textarea", placeholder: "HR verification notes...", section: "HR Verification & Approval", hideInTable: true, fullWidth: true },

  // ============ Signatures ============
  { name: "applicant_signature_date" as any, label: "Applicant Signature Date", type: "date", section: "Signatures", hideInTable: true },
  { name: "hr_officer_name" as any, label: "HR Officer Name", placeholder: "HR officer full name", section: "Signatures", hideInTable: true },
  { name: "hr_officer_date" as any, label: "HR Officer Sign Date", type: "date", section: "Signatures", hideInTable: true },
  { name: "head_of_hr_name" as any, label: "Head of HR Name", placeholder: "Head of HR full name", section: "Signatures", hideInTable: true },
  { name: "head_of_hr_date" as any, label: "Head of HR Sign Date", type: "date", section: "Signatures", hideInTable: true },
  { name: "md_name" as any, label: "Managing Director Name", placeholder: "MD full name", section: "Signatures", hideInTable: true },
  { name: "md_date" as any, label: "Managing Director Sign Date", type: "date", section: "Signatures", hideInTable: true },
];

function EmployeesPage() {
  const [activeTab, setActiveTab] = useState("directory");
  const q = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const rows = q.data ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const onLeave = rows.filter((r) => r.status === "on_leave").length;
  const depts = new Set(rows.map((r) => r.department).filter(Boolean)).size;

  const [formFor, setFormFor] = useState<Employee | null>(null);
  const [busy, setBusy] = useState<null | "download" | "download_docs" | "print" | "print_docs" | "cert_download" | "cert_print">(null);

  const run = async (kind: NonNullable<typeof busy>) => {
    if (!formFor) return;
    setBusy(kind);
    try {
      if (kind === "cert_download") {
        const { downloadEmployeeCertificate } = await employeeCertificatePdf();
        await downloadEmployeeCertificate(formFor);
      } else if (kind === "cert_print") {
        const { printEmployeeCertificate } = await employeeCertificatePdf();
        await printEmployeeCertificate(formFor);
      } else {
        const { downloadEmployeeForm, printEmployeeForm } = await employeeFormPdf();
        const withDocs = kind === "download_docs" || kind === "print_docs";
        if (kind.startsWith("print")) await printEmployeeForm(formFor, withDocs);
        else await downloadEmployeeForm(formFor, withDocs);
        if (withDocs && !formFor.documents) {
          toast.info("No uploaded documents found — downloaded form only.");
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate PDF");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Employees"
        description="Complete Pakistan-compliant employee registration (CNIC, address, contacts, education)."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "employees",
              moduleLabel: "Employees",
              title: "Employees Report",
              subtitle: `${rows.length} employee(s) · ${active} active · ${onLeave} on leave`,
              meta: [
                { label: "Active", value: String(active) },
                { label: "On Leave", value: String(onLeave) },
                { label: "Departments", value: String(depts) },
              ],
              sections: [{
                title: "All Employees",
                columns: [
                  { key: "employee_code", label: "Code" },
                  { key: "name", label: "Name" },
                  { key: "designation", label: "Designation" },
                  { key: "department", label: "Department" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "cnic", label: "CNIC" },
                  { key: "employment_type", label: "Type" },
                  { key: "status", label: "Status" },
                  { key: "join_date", label: "Joined" },
                ],
                rows,
              }],
            })}
          />
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="directory">Directory & Records</TabsTrigger>
          <TabsTrigger value="history">History & 360 View</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="space-y-6">

      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Employees", value: rows.length, hint: "All records", icon: Users },
        { label: "Active", value: active, hint: `${rows.length ? Math.round((active / rows.length) * 100) : 0}% of workforce`, icon: UserCheck },
        { label: "On Leave", value: onLeave, hint: "Currently unavailable", icon: UserMinus },
        { label: "Departments", value: depts, hint: "Unique departments", icon: Building2 },
      ]} />
      <div className="flex justify-end">
        <EmployeeCsvImport />
      </div>
      <CrudTable<Employee>
        title="Employee"
        fields={fields}
        api={resources.employees}
        queryKey="employees"
        searchable={["name", "email", "department", "position", "cnic", "city", "district"]}
        defaults={{
          status: "active",
          nationality: "Pakistani",
          // For Office Use Only — dummy/sample defaults (editable)
          employee_code: `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`,
          reporting_manager: "Muhammad Bilal",
          work_location: "Head Office — Chowk Azam, Layyah",
          employment_type: "permanent",
          probation_period: "3 months",
          contract_type: "Full-time",
          gross_salary: 60000,
          bank_name: "Meezan Bank Limited",
          bank_account: "PK00 MEZN 0000 0000 0000 0000",
          tax_number: "0000000-0",
          verified_by: "HR Department",
          approval_status: "pending",
          approved_by: "Chief Executive Officer",
          office_remarks: "Application received and under review by HR.",

          // Salary breakdown defaults (sum ≈ gross_salary 60,000)
          basic_salary: 35000,
          house_rent_allowance: 15000,
          medical_allowance: 3000,
          conveyance_allowance: 5000,
          other_allowances: 2000,
          income_tax: 1500,
          eobi: 370,
          provident_fund: 3000,
          other_deductions: 0,
          net_salary: 55130,

          // Document checklist defaults
          chk_cnic_copy: "yes",
          chk_photograph: "yes",
          chk_edu_certs: "yes",
          chk_exp_letters: "yes",
          chk_reference_letters: "no",
          chk_bank_details: "yes",
          chk_ntn_cert: "yes",
          chk_offer_letter: "no",
          chk_nda: "no",
          chk_medical: "no",
          chk_police: "no",
          chk_emergency_form: "yes",

          // HR verification defaults
          received_by: "HR Officer",
          cnic_verified: "yes",
          documents_verified: "yes",
          references_checked: "no",
          background_check: "pending",
          medical_check: "pending",
          hr_verification_remarks: "Verification in progress; awaiting reference and medical clearance.",

          // Signatures
          hr_officer_name: "HR Officer",
          head_of_hr_name: "Head of HR",
          md_name: "Managing Director",
        }}
        onAfterCreate={(row) => setFormFor(row)}
        rowActions={(row) => (
          <Button size="sm" variant="ghost" title="Registration form"
            onClick={() => setFormFor(row)}>
            <FileText className="h-4 w-4" />
          </Button>
        )}
      />

      <Dialog open={formFor !== null} onOpenChange={(o) => { if (!o) setFormFor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" />
              Employee Registration Form
            </DialogTitle>
            <DialogDescription>
              {formFor?.name
                ? <>A4 registration form for <span className="font-medium text-foreground">{formFor.name}</span>. Choose an option below.</>
                : "Generate the A4 employee registration form."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("download")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" /> Download form only
              </div>
              <p className="mt-1 text-xs text-muted-foreground">A4 PDF with complete employee details.</p>
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("download_docs")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" /> Download with documents
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Form + uploaded documents merged into one PDF.
              </p>
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("print")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Printer className="h-4 w-4 text-primary" /> Print form only
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Opens the print dialog for the form.</p>
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("print_docs")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Printer className="h-4 w-4 text-primary" /> Print with documents
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Prints the full packet.</p>
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("cert_download")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Download className="h-4 w-4 text-primary" /> Download certificate
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Certificate of Registration & Records Verification.
              </p>
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => run("cert_print")}
              className="rounded-xl border p-4 text-left hover:border-primary hover:bg-muted/40 transition disabled:opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Printer className="h-4 w-4 text-primary" /> Print certificate
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Opens print dialog for the certificate.
              </p>
            </button>
          </div>

          {busy && <p className="text-xs text-muted-foreground">Generating PDF…</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormFor(null)} disabled={!!busy}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="employees" />
        </TabsContent>
        <TabsContent value="history">
          <EmployeesHistoryTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
