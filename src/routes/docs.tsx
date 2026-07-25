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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generatedDocs, type GeneratedDoc } from "@/lib/generated-docs";
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

const CAT_LABEL: Record<GeneratedDoc["category"], string> = {
  hr_letter: "HR Letter",
  contract: "Client Document",
  notification: "Notification",
  report: "AI Report",
  other: "Other",
};

function GeneratedDocsCard() {
  const [rows, setRows] = useState<GeneratedDoc[]>(() => generatedDocs.list());
  const [q, setQ] = useState("");

  useEffect(() => {
    const refresh = () => setRows(generatedDocs.list());
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === "dms:generated_docs") refresh(); };
    window.addEventListener("dms:generated_docs:changed", refresh as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("dms:generated_docs:changed", refresh as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.doc_no.toLowerCase().includes(s) ||
      r.title.toLowerCase().includes(s) ||
      r.template_name.toLowerCase().includes(s) ||
      (r.party ?? "").toLowerCase().includes(s) ||
      r.owner.toLowerCase().includes(s)
    );
  });

  const isModuleReport = (r: any) => r?.template_id === "module_report" && typeof r?.pdfDataUrl === "string";

  const onPreview = async (r: GeneratedDoc) => {
    try {
      if (isModuleReport(r)) {
        window.open((r as any).pdfDataUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const { previewLetterheadUrl } = await letterheadPdf();
      const url = await previewLetterheadUrl(r.opts);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) { toast.error(e?.message ?? "Preview failed"); }
  };
  const onDownload = async (r: GeneratedDoc) => {
    try {
      if (isModuleReport(r)) {
        const { downloadSavedReport } = await import("@/lib/module-report");
        downloadSavedReport({
          id: r.doc_no,
          module: (r as any).module ?? "report",
          moduleLabel: r.template_name,
          title: r.title,
          filename: `${r.doc_no}.pdf`,
          date: r.date,
          created_at: r.created_at,
          pdfDataUrl: (r as any).pdfDataUrl,
          totalRows: 0,
        });
        return;
      }
      const { downloadLetterhead } = await letterheadPdf();
      await downloadLetterhead(`${r.template_id}_${r.party || r.doc_no}`, r.opts);
    } catch (e: any) { toast.error(e?.message ?? "Download failed"); }
  };
  const onPrint = async (r: GeneratedDoc) => {
    try {
      if (isModuleReport(r)) {
        const w = window.open((r as any).pdfDataUrl, "_blank");
        setTimeout(() => { try { w?.print(); } catch { /* noop */ } }, 500);
        return;
      }
      const { printLetterhead } = await letterheadPdf();
      await printLetterhead(r.opts);
    }
    catch (e: any) { toast.error(e?.message ?? "Print failed"); }
  };
  const onDelete = (r: GeneratedDoc) => {
    generatedDocs.remove(r.id);
    setRows(generatedDocs.list());
    toast.success("Removed from Docs & Records");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              System generated Documents
              <Badge variant="outline" className="ml-1 text-[10px]">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>
              Letters &amp; documents created from the Document Center are automatically archived here.
            </CardDescription>
          </div>
          <div className="w-64 max-w-full">
            <Input placeholder="Search generated…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ref #</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="mx-auto flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No generated documents yet</p>
                      <p className="text-xs">Generate a letter from the Document Center — it will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">{r.doc_no}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{CAT_LABEL[r.category]}</Badge>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.template_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.party || "—"}</TableCell>
                  <TableCell className="text-sm">{r.owner}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{r.date}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" title="Preview" onClick={() => onPreview(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Download" onClick={() => onDownload(r)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Print" onClick={() => onPrint(r)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Remove" onClick={() => onDelete(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DocsPage() {
  const q = useQuery({ queryKey: ["docs"], queryFn: api.list });
  const [genCount, setGenCount] = useState(() => generatedDocs.list().length);
  useEffect(() => {
    const refresh = () => setGenCount(generatedDocs.list().length);
    window.addEventListener("dms:generated_docs:changed", refresh as EventListener);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("dms:generated_docs:changed", refresh as EventListener);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const rows = q.data ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const now = Date.now();
  const expiringOrExpired = rows.filter((r) => r.lifetime !== "yes" && (r.status === "expired" || (r.expiry_date && new Date(r.expiry_date).getTime() < now))).length;
  const restricted = rows.filter((r) => r.confidentiality === "confidential" || r.confidentiality === "restricted").length;

  return (
    <AppLayout>
      <PageHeader title="Docs & Records" description="Contracts, SECP forms, FBR filings, NOCs, HR letters (English/Urdu). System-generated letters are archived automatically." />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Documents", value: rows.length + genCount, hint: `${rows.length} manual · ${genCount} generated`, icon: FileText },
        { label: "Active", value: active, hint: "Currently in force", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "Expired", value: expiringOrExpired, hint: "Needs renewal", icon: AlertTriangle, tint: "oklch(0.65 0.2 25)" },
        { label: "Confidential", value: restricted, hint: "Restricted access", icon: Lock },
      ]} />

      <Tabs defaultValue="generated" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generated" className="gap-2">
            System generated
            <Badge variant="outline" className="ml-1 text-[10px]">{genCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="h-4 w-4" /> Manual Documents
            <Badge variant="outline" className="ml-1 text-[10px]">{rows.length}</Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="generated" className="mt-0">
          <GeneratedDocsCard />
        </TabsContent>
        <TabsContent value="manual" className="mt-0">
          <CrudTable<Doc> title="Document" fields={fields} api={api} queryKey="docs"
            searchable={["doc_no", "title", "owner", "category", "reference_no", "party"]}
            defaults={{ status: "draft", category: "other", language: "en", confidentiality: "internal" }} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export const Route = createFileRoute("/docs")({
  head: () => ({ meta: [{ title: "Docs & Records — Devionic DMS" }] }),
  component: DocsPage,
});
