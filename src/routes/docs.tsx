import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, AlertTriangle, Lock, Sparkles, Download, Printer, Eye, Trash2 } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const letterheadPdf = () => import("@/lib/letterhead-pdf");

type Doc = {
  id: number;
  doc_no: string;
  title: string;
  category: "policy" | "contract" | "invoice" | "report" | "sop" | "noc" | "tax" | "legal" | "hr_letter" | "other";
  reference_no?: string;
  party?: string;
  owner: string;
  department?: string;
  language?: "en" | "ur" | "both";
  effective_date?: string;
  expiry_date?: string;
  lifetime?: "yes" | "no";
  updated: string;
  file_url?: string;
  confidentiality?: "public" | "internal" | "confidential" | "restricted";
  status: "draft" | "review" | "active" | "expired" | "archived";
  notes?: string;
};

const api = localCrud<Doc>("docs", [
  { doc_no: "DOC-001", title: "Employee Handbook 2026", category: "policy", owner: "HR", department: "HR & Admin", language: "both", effective_date: "2026-01-01", updated: "2026-06-01", confidentiality: "internal", status: "active" },
  { doc_no: "DOC-002", title: "MSA - Nexus Fintech", category: "contract", reference_no: "MSA-NX-2026-01", party: "Nexus Fintech (Pvt) Ltd", owner: "Legal", department: "Legal & Compliance", language: "en", effective_date: "2026-07-01", expiry_date: "2027-06-30", updated: "2026-07-10", confidentiality: "confidential", status: "active" },
  { doc_no: "DOC-003", title: "SECP Form-A 2025", category: "legal", reference_no: "SECP-FORM-A-2025", owner: "Company Secretary", department: "Legal & Compliance", language: "en", updated: "2026-03-31", confidentiality: "restricted", status: "active" },
]);

const fields: FieldDef<Doc>[] = [
  { name: "doc_no", label: "Document #", required: true, section: "Identification" },
  { name: "title", label: "Title", required: true, section: "Identification", fullWidth: true },
  { name: "category", label: "Category", type: "select", required: true, section: "Identification", options: [
    { value: "policy", label: "Policy" },
    { value: "contract", label: "Contract / Agreement" },
    { value: "invoice", label: "Invoice" },
    { value: "report", label: "Report" },
    { value: "sop", label: "SOP / Procedure" },
    { value: "noc", label: "NOC" },
    { value: "tax", label: "Tax Document (FBR / SRB / PRA)" },
    { value: "legal", label: "Legal / SECP" },
    { value: "hr_letter", label: "HR Letter (Offer/Experience)" },
    { value: "other", label: "Other" },
  ] },
  { name: "reference_no", label: "Reference / Registration #", section: "Identification" },
  { name: "language", label: "Language", type: "select", section: "Identification", options: [
    { value: "en", label: "English" },
    { value: "ur", label: "Urdu" },
    { value: "both", label: "Bilingual (EN + UR)" },
  ] },

  { name: "party", label: "Related party", section: "Ownership" },
  { name: "owner", label: "Owner", required: true, section: "Ownership" },
  { name: "department", label: "Department", section: "Ownership" },
  { name: "confidentiality", label: "Confidentiality", type: "select", section: "Ownership", options: [
    { value: "public", label: "Public" },
    { value: "internal", label: "Internal" },
    { value: "confidential", label: "Confidential" },
    { value: "restricted", label: "Restricted" },
  ] },

  { name: "effective_date", label: "Effective date", type: "date", section: "Validity" },
  { name: "lifetime", label: "Lifetime (no expiry)", type: "select", section: "Validity", options: [
    { value: "no", label: "No — has expiry" },
    { value: "yes", label: "Yes — lifetime / never expires" },
  ] },
  { name: "expiry_date", label: "Expiry date", type: "date", section: "Validity" },
  { name: "updated", label: "Last updated", type: "date", required: true, section: "Validity" },
  { name: "file_url", label: "Attachment", type: "file_attachment", uploadFolder: "docs", section: "Validity", hideInTable: true },
  { name: "status", label: "Status", type: "select", required: true, section: "Validity", options: [
    { value: "draft", label: "Draft" },
    { value: "review", label: "Under Review" },
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "archived", label: "Archived" },
  ] },
  { name: "notes", label: "Notes", type: "textarea", section: "Validity", hideInTable: true },
];

function DocsPage() {
  const q = useQuery({ queryKey: ["docs"], queryFn: api.list });

  const rows = q.data ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const now = Date.now();
  const expiringOrExpired = rows.filter((r) => r.lifetime !== "yes" && (r.status === "expired" || (r.expiry_date && new Date(r.expiry_date).getTime() < now))).length;
  const restricted = rows.filter((r) => r.confidentiality === "confidential" || r.confidentiality === "restricted").length;

  return (
    <AppLayout>
      <PageHeader title="Docs & Records" description="Contracts, SECP forms, FBR filings, NOCs, HR letters (English/Urdu). System-generated letters are archived automatically." />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Documents", value: rows.length, hint: "Manual uploads", icon: FileText },
        { label: "Active", value: active, hint: "Currently in force", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Expired", value: expiringOrExpired, hint: "Needs renewal", icon: AlertTriangle, tint: "oklch(0.65 0.2 25)" },
        { label: "Confidential", value: restricted, hint: "Restricted access", icon: Lock },
      ]} />

      <CrudTable<Doc> title="Document" fields={fields} api={api} queryKey="docs"
        searchable={["doc_no", "title", "owner", "category", "reference_no", "party"]}
        defaults={{ status: "draft", category: "other", language: "en", confidentiality: "internal" }} />
    </AppLayout>
  );
}

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Docs & Records — Devionic DMS" }] }),
  component: DocsPage,
});
