import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck, Download, Printer, Plus, Pencil, Trash2, Ban, CheckCircle2, Search, RefreshCw,
} from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

const letterheadPdf = () => import("@/lib/letterhead-pdf");

const LS_KEY = "dms:record_verifications_v1";

type RecordType =
  | "Employee" | "Intern" | "Client" | "Project" | "Invoice"
  | "Quotation" | "Transaction" | "Certificate" | "Case" | "Purchase Order" | "Custom";

const RECORD_TYPES: RecordType[] = [
  "Employee","Intern","Client","Project","Invoice","Quotation","Transaction","Certificate","Case","Purchase Order","Custom",
];

type Verification = {
  id: number;
  ver_no: string;
  record_type: RecordType;
  record_ref: string;    // reference/ID entered by user
  subject: string;       // headline for the letter
  entity_name: string;   // person/entity being verified
  details: string;       // multi-line details rendered in body
  remarks: string;
  verified_by: string;
  designation: string;
  issue_date: string;
  status: "active" | "revoked";
  created_at?: string;
};

function loadRows(): Verification[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveRows(rows: Verification[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

const emptyForm = (rows: Verification[]): Verification => {
  const nextNum = rows.length + 1;
  return {
    id: 0,
    ver_no: `VER-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`,
    record_type: "Employee",
    record_ref: "",
    subject: "Record Verification Report",
    entity_name: "",
    details: "",
    remarks: "This record has been verified against official company data and is found genuine and accurate.",
    verified_by: "Muhammad Usman",
    designation: "Chief Executive Officer",
    issue_date: new Date().toISOString().slice(0, 10),
    status: "active",
  };
};

function fmt(v: any) { return v === null || v === undefined || v === "" ? "—" : String(v); }

async function lookupRecord(type: RecordType, ref: string): Promise<{ entity: string; details: string } | null> {
  const q = ref.trim();
  if (!q) return null;
  try {
    if (type === "Employee") {
      const { data } = await supabase.from("employees")
        .select("*")
        .or(`name.ilike.%${q}%,employee_code.ilike.%${q}%,cnic.ilike.%${q}%,email.ilike.%${q}%`).limit(1).maybeSingle();
      if (!data) return null;
      const d = data as any;
      return {
        entity: d.name,
        details:
`Employee Code : ${fmt(d.employee_code)}
Full Name     : ${fmt(d.name)}
CNIC          : ${fmt(d.cnic)}
Designation   : ${fmt(d.designation ?? d.job_title ?? d.position)}
Department    : ${fmt(d.department)}
Email         : ${fmt(d.email)}
Phone         : ${fmt(d.phone)}
Joining Date  : ${fmt(d.joining_date ?? d.date_of_joining)}
Status        : ${fmt(d.status)}`
      };
    }
    if (type === "Intern") {
      const { data } = await supabase.from("employees")
        .select("*")
        .or(`name.ilike.%${q}%,employee_code.ilike.%${q}%,email.ilike.%${q}%`).limit(1).maybeSingle();
      if (!data) return null;
      const d = data as any;
      return {
        entity: d.name,
        details:
`Intern Code   : ${fmt(d.employee_code)}
Full Name     : ${fmt(d.name)}
Program       : ${fmt(d.designation ?? d.job_title ?? d.position)}
Department    : ${fmt(d.department)}
Email         : ${fmt(d.email)}
Phone         : ${fmt(d.phone)}
Joining Date  : ${fmt(d.joining_date ?? d.date_of_joining)}
Status        : ${fmt(d.status)}`
      };
    }

    // Non-DB modules use LocalStorage; try there
    if (type === "Client") {
      const arr = JSON.parse(localStorage.getItem("dms:clients_v1") || "[]");
      const r = arr.find((x: any) => String(x.id) === q || (x.name || "").toLowerCase().includes(q.toLowerCase()));
      if (!r) return null;
      return { entity: r.name || r.company || "Client", details:
`Client Name   : ${fmt(r.name)}
Company       : ${fmt(r.company)}
Email         : ${fmt(r.email)}
Phone         : ${fmt(r.phone)}
Country       : ${fmt(r.country)}
Stage         : ${fmt(r.stage)}
Value         : ${fmt(r.value)}` };
    }
    if (type === "Project") {
      const arr = JSON.parse(localStorage.getItem("dms:projects_v1") || "[]");
      const r = arr.find((x: any) => String(x.id) === q || (x.title || x.name || "").toLowerCase().includes(q.toLowerCase()));
      if (!r) return null;
      return { entity: r.title || r.name || "Project", details:
`Project       : ${fmt(r.title || r.name)}
Client        : ${fmt(r.client)}
Status        : ${fmt(r.status)}
Start Date    : ${fmt(r.start_date)}
Due Date      : ${fmt(r.due_date)}
Budget        : ${fmt(r.budget)}` };
    }
    if (type === "Invoice") {
      const arr = JSON.parse(localStorage.getItem("dms:invoices_v1") || "[]");
      const r = arr.find((x: any) => String(x.number || x.id) === q);
      if (!r) return null;
      return { entity: r.client || "Invoice", details:
`Invoice #     : ${fmt(r.number || r.id)}
Client        : ${fmt(r.client)}
Date          : ${fmt(r.date)}
Amount        : ${fmt(r.total || r.amount)}
Status        : ${fmt(r.status)}` };
    }
    if (type === "Quotation") {
      const arr = JSON.parse(localStorage.getItem("dms:quotations_v1") || "[]");
      const r = arr.find((x: any) => String(x.number || x.id) === q);
      if (!r) return null;
      return { entity: r.client || "Quotation", details:
`Quotation #   : ${fmt(r.number || r.id)}
Client        : ${fmt(r.client)}
Date          : ${fmt(r.date)}
Amount        : ${fmt(r.total || r.amount)}
Status        : ${fmt(r.status)}` };
    }
    if (type === "Transaction") {
      const arr = JSON.parse(localStorage.getItem("dms:transactions_v1") || "[]");
      const r = arr.find((x: any) => String(x.txn_no || x.id) === q);
      if (!r) return null;
      return { entity: r.party || "Transaction", details:
`Txn #         : ${fmt(r.txn_no || r.id)}
Date          : ${fmt(r.date)}
Type          : ${fmt(r.type)}
Party         : ${fmt(r.party)}
Amount        : ${fmt(r.amount)}
Account       : ${fmt(r.account)}
Reference     : ${fmt(r.reference)}` };
    }
    if (type === "Certificate") {
      const arr = JSON.parse(localStorage.getItem("dms:custom_certificates_v1") || "[]");
      const r = arr.find((x: any) => x.cert_no === q || String(x.id) === q);
      if (!r) return null;
      return { entity: r.recipient, details:
`Certificate # : ${fmt(r.cert_no)}
Type          : ${fmt(r.cert_type)}
Recipient     : ${fmt(r.recipient)}
Issued By     : ${fmt(r.issued_by)}
Issue Date    : ${fmt(r.issue_date)}
Status        : ${fmt(r.status)}` };
    }
    if (type === "Case") {
      const arr = JSON.parse(localStorage.getItem("dms:cases_v1") || "[]");
      const r = arr.find((x: any) => String(x.case_no || x.id) === q);
      if (!r) return null;
      return { entity: r.title || r.case_no || "Case", details:
`Case #        : ${fmt(r.case_no)}
Title         : ${fmt(r.title)}
Court/Forum   : ${fmt(r.court)}
Party         : ${fmt(r.party)}
Status        : ${fmt(r.status)}` };
    }
    if (type === "Purchase Order") {
      const arr = JSON.parse(localStorage.getItem("dms:purchase_orders_v1") || "[]");
      const r = arr.find((x: any) => String(x.po_no || x.id) === q);
      if (!r) return null;
      return { entity: r.vendor || "PO", details:
`PO #          : ${fmt(r.po_no)}
Vendor        : ${fmt(r.vendor)}
Date          : ${fmt(r.date)}
Amount        : ${fmt(r.total)}
Status        : ${fmt(r.status)}` };
    }
    return null;
  } catch {
    return null;
  }
}

function buildLetterBody(v: Verification) {
  const stampLine = v.status === "revoked"
    ? "STATUS  : REVOKED - This verification has been cancelled and must not be relied upon."
    : "STATUS  : VERIFIED - This record is genuine and reflects official company data as of the date above.";

  const rule = "----------------------------------------------";

  return [
    "TO WHOM IT MAY CONCERN",
    "",
    `This letter certifies that the following record maintained by Devionic (Private) Limited has been verified through our internal management system:`,
    "",
    `RECORD TYPE   : ${v.record_type}`,
    `REFERENCE     : ${v.record_ref || "-"}`,
    `ENTITY        : ${v.entity_name || "-"}`,
    `VERIFICATION #: ${v.ver_no}`,
    `ISSUED ON     : ${v.issue_date}`,
    "",
    "RECORD DETAILS",
    rule,
    v.details || "-",
    "",
    "REMARKS",
    rule,
    v.remarks || "-",
    "",
    stampLine,
    "",
    "This document is generated electronically from the Devionic ERP and does not require a physical stamp. For authenticity, cross-check the verification number above with our records department at info@devionic.com.",

  ].join("\n");
}

async function issuePdf(v: Verification, mode: "download" | "print") {
  const opts = {
    refNo: v.ver_no,
    date: v.issue_date,
    subject: `${v.subject} — ${v.record_type}`,
    body: buildLetterBody(v),
    closing: "For Devionic (Private) Limited",
    signatoryName: v.verified_by,
    signatoryTitle: v.designation,
  };
  const { downloadLetterhead, printLetterhead } = await letterheadPdf();
  if (mode === "download") await downloadLetterhead(`${v.ver_no}_${v.entity_name || v.record_type}`, opts);
  else await printLetterhead(opts);
}

function VerificationPage() {
  const [rows, setRows] = useState<Verification[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Verification | null>(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => { setRows(loadRows()); }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [r.ver_no, r.entity_name, r.record_ref, r.record_type, r.subject].some((v) => v?.toLowerCase().includes(q));
  });

  const startCreate = () => { setEditing(emptyForm(rows)); setOpen(true); };
  const startEdit = (row: Verification) => { setEditing({ ...row }); setOpen(true); };

  async function autoFill() {
    if (!editing) return;
    setLooking(true);
    try {
      const res = await lookupRecord(editing.record_type, editing.record_ref);
      if (!res) { toast.error("No matching record found"); return; }
      setEditing({ ...editing, entity_name: res.entity, details: res.details });
      toast.success("Record found & details auto-filled");
    } catch (e: any) { toast.error(e?.message ?? "Lookup failed"); }
    finally { setLooking(false); }
  }

  const save = () => {
    if (!editing) return;
    if (!editing.entity_name.trim()) return toast.error("Entity name is required");
    if (!editing.details.trim()) return toast.error("Details are required — use Auto-Fill or type them");
    const now = new Date().toISOString();
    let next: Verification[];
    if (editing.id === 0) {
      const newRow: Verification = { ...editing, id: Date.now(), created_at: now };
      next = [newRow, ...rows];
      toast.success(`Verification ${newRow.ver_no} issued`);
    } else {
      next = rows.map((r) => (r.id === editing.id ? { ...editing } : r));
      toast.success("Verification updated");
    }
    setRows(next); saveRows(next); setOpen(false); setEditing(null);
  };

  const remove = (row: Verification) => {
    if (!confirm(`Delete verification ${row.ver_no}?`)) return;
    const next = rows.filter((r) => r.id !== row.id);
    setRows(next); saveRows(next);
    toast.success("Verification deleted");
  };

  const toggleRevoke = (row: Verification) => {
    const next = rows.map((r) => r.id === row.id ? { ...r, status: r.status === "active" ? "revoked" as const : "active" as const } : r);
    setRows(next); saveRows(next);
    toast.success(row.status === "active" ? "Marked as revoked" : "Reactivated");
  };

  const active = rows.filter((r) => r.status === "active").length;
  const revoked = rows.filter((r) => r.status === "revoked").length;
  const thisMonth = rows.filter((r) => r.issue_date?.startsWith(new Date().toISOString().slice(0, 7))).length;

  return (
    <AppLayout>
      <PageHeader
        title="Record Verification"
        description="Verify any company record and issue a signed verification report on official letterhead."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "verification",
                moduleLabel: "Record Verification",
                title: "Record Verification Report",
                subtitle: `${rows.length} verification(s) · ${active} active · ${revoked} revoked`,
                meta: [
                  { label: "This Month", value: String(thisMonth) },
                  { label: "Active", value: String(active) },
                ],
                sections: [{
                  title: "Verifications",
                  columns: [
                    { key: "verification_no", label: "Ref #" },
                    { key: "entity_type", label: "Type" },
                    { key: "entity_name", label: "Entity" },
                    { key: "reference", label: "Reference" },
                    { key: "issue_date", label: "Issued" },
                    { key: "status", label: "Status" },
                  ],
                  rows,
                }],
              })}
            />
            <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" />New Verification</Button>
          </div>
        }
      />

      <StatsCards stats={[
        { label: "Total Issued", value: rows.length, hint: "All time", icon: BadgeCheck },
        { label: "Active", value: active, hint: "Valid reports", icon: CheckCircle2, tint: "oklch(0.68 0.18 155)" },
        { label: "This Month", value: thisMonth, hint: new Date().toISOString().slice(0, 7), icon: BadgeCheck, tint: "oklch(0.72 0.18 55)" },
        { label: "Revoked", value: revoked, hint: "Cancelled reports", icon: Ban, tint: "oklch(0.65 0.2 25)" },
      ]} />

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search verification #, entity, reference…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
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
                  <TableHead>Verification #</TableHead>
                  <TableHead>Record Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-52">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No verification reports yet. Click <b>New Verification</b> to create one.
                  </TableCell></TableRow>
                )}
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.ver_no}</TableCell>
                    <TableCell>{row.record_type}</TableCell>
                    <TableCell className="font-medium">{row.entity_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.record_ref || "—"}</TableCell>
                    <TableCell className="text-sm">{row.verified_by}<div className="text-[11px] text-muted-foreground">{row.designation}</div></TableCell>
                    <TableCell>{row.issue_date}</TableCell>
                    <TableCell>
                      {row.status === "active"
                        ? <Badge className="bg-emerald-100 text-emerald-800">Verified</Badge>
                        : <Badge variant="destructive">Revoked</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Download PDF" onClick={() => issuePdf(row, "download").catch((e) => toast.error(e?.message ?? "PDF failed"))}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Print" onClick={() => issuePdf(row, "print").catch((e) => toast.error(e?.message ?? "Print failed"))}>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id === 0 ? "Issue New Verification" : `Edit ${editing?.ver_no}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Verification #</Label>
                <Input value={editing.ver_no} onChange={(e) => setEditing({ ...editing, ver_no: e.target.value })} />
              </div>
              <div>
                <Label>Record Type</Label>
                <Select value={editing.record_type} onValueChange={(v) => setEditing({ ...editing, record_type: v as RecordType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECORD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Reference / ID / Code (name, employee code, invoice # etc.)</Label>
                <div className="flex gap-2">
                  <Input value={editing.record_ref} onChange={(e) => setEditing({ ...editing, record_ref: e.target.value })} placeholder="e.g. EMP-0007 or INV-2026-0012 or Ahmed Hassan" />
                  <Button type="button" variant="secondary" onClick={autoFill} disabled={looking}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${looking ? "animate-spin" : ""}`} /> Auto-Fill
                  </Button>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Entity / Person Being Verified *</Label>
                <Input value={editing.entity_name} onChange={(e) => setEditing({ ...editing, entity_name: e.target.value })} placeholder="Auto-filled from record, or enter manually" />
              </div>
              <div className="col-span-2">
                <Label>Subject (letter heading)</Label>
                <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Record Details *</Label>
                <Textarea rows={8} className="font-mono text-xs" value={editing.details} onChange={(e) => setEditing({ ...editing, details: e.target.value })} placeholder="One field per line — use Auto-Fill or type manually" />
              </div>
              <div className="col-span-2">
                <Label>Verifier Remarks</Label>
                <Textarea rows={3} value={editing.remarks} onChange={(e) => setEditing({ ...editing, remarks: e.target.value })} />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={editing.issue_date} onChange={(e) => setEditing({ ...editing, issue_date: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Verified</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verified By (Signatory)</Label>
                <Input value={editing.verified_by} onChange={(e) => setEditing({ ...editing, verified_by: e.target.value })} />
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={editing.designation} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {editing && editing.id !== 0 && (
              <Button variant="secondary" onClick={() => editing && issuePdf(editing, "download").catch((e) => toast.error(e?.message ?? "PDF failed"))}>
                <Download className="h-4 w-4 mr-1" />Preview PDF
              </Button>
            )}
            <Button onClick={save}>{editing?.id === 0 ? "Issue Verification" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="verification" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [{ title: "Record Verification — Devionic ERP" }] }),
  component: VerificationPage,
});
