import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Download, Printer, Plus, Pencil, Trash2, Ban, CheckCircle2, Search } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { CustomCertificate } from "@/lib/custom-certificate-pdf";

const customCertificatePdf = () => import("@/lib/custom-certificate-pdf");

const LS_KEY = "dms:custom_certificates_v1";

const CERT_TYPES = [
  "Certificate of Appreciation",
  "Certificate of Achievement",
  "Certificate of Excellence",
  "Certificate of Completion",
  "Certificate of Participation",
  "Certificate of Recognition",
  "Certificate of Training",
  "Certificate of Employment",
  "Certificate of Merit",
  "Experience Certificate",
  "Internship Certificate",
  "Custom Certificate",
];

function loadCerts(): CustomCertificate[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveCerts(rows: CustomCertificate[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

const emptyForm = (rows: CustomCertificate[]): CustomCertificate => {
  const nextNum = (rows[0]?.id ?? 0) + 1;
  return {
    id: 0,
    cert_no: `CERT-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`,
    cert_type: "Certificate of Appreciation",
    recipient: "",
    title: "Certificate of Appreciation",
    body: "in recognition of outstanding contribution, dedication, and remarkable performance.",
    issue_date: new Date().toISOString().slice(0, 10),
    issued_by: "Muhammad Usman",
    signer_designation: "Chief Executive Officer",
    reference: "",
    status: "active",
  };
};

function CertificatesPage() {
  const [rows, setRows] = useState<CustomCertificate[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomCertificate | null>(null);

  useEffect(() => { setRows(loadCerts()); }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [r.cert_no, r.recipient, r.title, r.cert_type, r.issued_by].some((v) => v?.toLowerCase().includes(q));
  });

  const startCreate = () => { setEditing(emptyForm(rows)); setOpen(true); };
  const startEdit = (row: CustomCertificate) => { setEditing({ ...row }); setOpen(true); };

  const save = () => {
    if (!editing) return;
    if (!editing.recipient.trim()) return toast.error("Recipient name is required");
    if (!editing.title.trim()) return toast.error("Certificate title is required");
    const now = new Date().toISOString();
    let next: CustomCertificate[];
    if (editing.id === 0) {
      const newRow: CustomCertificate = { ...editing, id: Date.now(), created_at: now };
      next = [newRow, ...rows];
      toast.success(`Certificate ${newRow.cert_no} issued to ${newRow.recipient}`);
    } else {
      next = rows.map((r) => (r.id === editing.id ? { ...editing } : r));
      toast.success("Certificate updated");
    }
    setRows(next); saveCerts(next); setOpen(false); setEditing(null);
  };

  const remove = (row: CustomCertificate) => {
    if (!confirm(`Delete certificate ${row.cert_no} issued to ${row.recipient}?`)) return;
    const next = rows.filter((r) => r.id !== row.id);
    setRows(next); saveCerts(next);
    toast.success("Certificate deleted");
  };

  const toggleRevoke = (row: CustomCertificate) => {
    const next = rows.map((r) => r.id === row.id ? { ...r, status: r.status === "active" ? "revoked" as const : "active" as const } : r);
    setRows(next); saveCerts(next);
    toast.success(row.status === "active" ? "Certificate revoked" : "Certificate reactivated");
  };

  const downloadCertificate = async (row: CustomCertificate) => {
    try {
      const { downloadCustomCertificate } = await customCertificatePdf();
      await downloadCustomCertificate(row);
    } catch (e: any) { toast.error(e?.message ?? "PDF failed"); }
  };

  const printCertificate = async (row: CustomCertificate) => {
    try {
      const { printCustomCertificate } = await customCertificatePdf();
      await printCustomCertificate(row);
    } catch (e: any) { toast.error(e?.message ?? "Print failed"); }
  };

  const active = rows.filter((r) => r.status === "active").length;
  const revoked = rows.filter((r) => r.status === "revoked").length;
  const thisMonth = rows.filter((r) => r.issue_date?.startsWith(new Date().toISOString().slice(0, 7))).length;

  return (
    <AppLayout>
      <PageHeader
        title="Certificate Issuance"
        description="Issue, manage & verify custom company certificates with QR-based authenticity."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "certificates",
                moduleLabel: "Certificates",
                title: "Certificate Issuance Report",
                subtitle: `${rows.length} certificate(s) · ${active} active · ${revoked} revoked`,
                meta: [
                  { label: "This Month", value: String(thisMonth) },
                  { label: "Active", value: String(active) },
                  { label: "Revoked", value: String(revoked) },
                ],
                sections: [{
                  title: "Issued Certificates",
                  columns: [
                    { key: "cert_no", label: "Cert #" },
                    { key: "recipient_name", label: "Recipient" },
                    { key: "title", label: "Title" },
                    { key: "issue_date", label: "Issued" },
                    { key: "valid_until", label: "Valid Until" },
                    { key: "status", label: "Status" },
                  ],
                  rows,
                }],
              })}
            />
            <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" />Issue Certificate</Button>
          </div>
        }
      />

      <StatsCards stats={[
        { label: "Total Issued", value: rows.length, hint: "All time", icon: Award },
        { label: "Active", value: active, hint: "Valid certificates", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "This Month", value: thisMonth, hint: new Date().toISOString().slice(0, 7), icon: Award, tint: "oklch(0.72 0.18 55)" },
        { label: "Revoked", value: revoked, hint: "Cancelled certificates", icon: Ban, tint: "oklch(0.65 0.2 25)" },
      ]} />

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search cert #, recipient, title…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="revoked">Revoked only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cert #</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type / Title</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-52">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No certificates yet. Click <b>Issue Certificate</b> to create one.
                  </TableCell></TableRow>
                )}
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.cert_no}</TableCell>
                    <TableCell className="font-medium">{row.recipient}</TableCell>
                    <TableCell>
                      <div className="text-sm">{row.title}</div>
                      <div className="text-[11px] text-muted-foreground">{row.cert_type}</div>
                    </TableCell>
                    <TableCell className="text-sm">{row.issued_by}<div className="text-[11px] text-muted-foreground">{row.signer_designation}</div></TableCell>
                    <TableCell>{row.issue_date}</TableCell>
                    <TableCell>
                      {row.status === "active"
                        ? <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                        : <Badge variant="destructive">Revoked</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Download PDF" onClick={() => downloadCertificate(row)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Print" onClick={() => printCertificate(row)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => startEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title={row.status === "active" ? "Revoke" : "Reactivate"} onClick={() => toggleRevoke(row)}>
                          <Ban className={`h-4 w-4 ${row.status === "revoked" ? "text-emerald-600" : "text-amber-600"}`} />
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => remove(row)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id === 0 ? "Issue New Certificate" : `Edit ${editing?.cert_no}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Certificate #</Label>
                <Input value={editing.cert_no} onChange={(e) => setEditing({ ...editing, cert_no: e.target.value })} />
              </div>
              <div>
                <Label>Certificate Type</Label>
                <Select value={editing.cert_type} onValueChange={(v) => setEditing({ ...editing, cert_type: v, title: editing.title || v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CERT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Recipient Name *</Label>
                <Input value={editing.recipient} onChange={(e) => setEditing({ ...editing, recipient: e.target.value })} placeholder="e.g. Ahmed Hassan" />
              </div>
              <div className="col-span-2">
                <Label>Certificate Title (large heading on PDF) *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Body Text</Label>
                <Textarea rows={4} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="in recognition of…" />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={editing.issue_date} onChange={(e) => setEditing({ ...editing, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input value={editing.reference ?? ""} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} placeholder="Project / Course / Event" />
              </div>
              <div>
                <Label>Issued By (Signatory)</Label>
                <Input value={editing.issued_by} onChange={(e) => setEditing({ ...editing, issued_by: e.target.value })} />
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={editing.signer_designation ?? ""} onChange={(e) => setEditing({ ...editing, signer_designation: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {editing && editing.id !== 0 && (
              <Button variant="secondary" onClick={() => editing && downloadCertificate(editing)}>
                <Download className="h-4 w-4 mr-1" />Preview PDF
              </Button>
            )}
            <Button onClick={save}>{editing?.id === 0 ? "Issue Certificate" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="certificates" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certificate Issuance — Devionic ERP" }] }),
  component: CertificatesPage,
});
