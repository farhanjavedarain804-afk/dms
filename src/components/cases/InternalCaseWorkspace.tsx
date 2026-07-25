import { useState } from "react";
import { Plus, Trash2, FileText, Printer, Download, Gavel, FileSignature, Megaphone, MessageSquare, ClipboardList, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileAttachment } from "@/components/dms/FileAttachment";
import type { CaseCtx } from "@/lib/case-pdf";
import { toast } from "sonner";

const casePdfLib = () => import("@/lib/case-pdf");

export type CaseFiling = { title: string; filed_by?: string; date?: string; description?: string; file?: string | null };
export type CaseNotice = { ref_no?: string; kind?: string; to?: string; subject?: string; body?: string; issued_on?: string; response_due?: string; response?: string; response_on?: string; file?: string | null };
export type CaseArgumentItem = { party?: string; name?: string; date?: string; content?: string; file?: string | null };
export type CaseOrder = { order_no?: string; kind?: string; date?: string; issued_by?: string; content?: string; penalty?: string; effective_from?: string; file?: string | null };
export type CaseReport = { title?: string; prepared_by?: string; date?: string; findings?: string; recommendations?: string; file?: string | null };

export type InternalCaseData = {
  filings?: CaseFiling[];
  notices?: CaseNotice[];
  arguments_list?: CaseArgumentItem[];
  orders?: CaseOrder[];
  reports?: CaseReport[];
};

const NOTICE_KINDS = ["Show-Cause Notice", "Appearance Notice", "Warning Notice", "Suspension Notice", "Final Notice", "Termination Notice"];
const ORDER_KINDS = ["Interim Order", "Final Order", "Penalty Order", "Dismissal Order", "Reinstatement Order", "Closure Order"];
const PARTY_KINDS = ["Complainant", "Respondent", "Witness", "Committee", "Legal Counsel"];
const FILING_KINDS = ["Complaint", "Reply / Written Statement", "Evidence", "Witness Statement", "Supporting Document", "Appeal", "Other"];

export function InternalCaseWorkspace({
  ctx,
  data,
  onChange,
}: {
  ctx: CaseCtx;
  data: InternalCaseData;
  onChange: (patch: Partial<InternalCaseData>) => void;
}) {
  const filings = data.filings ?? [];
  const notices = data.notices ?? [];
  const args = data.arguments_list ?? [];
  const orders = data.orders ?? [];
  const reports = data.reports ?? [];

  const generateFull = async (mode: "download" | "print") => {
    try {
      const { casePdf } = await casePdfLib();
      const payload = {
        filings, notices, orders, reports,
        argumentsList: args,
        status: (ctx as any).status,
        hearings: (ctx as any).hearings ?? [],
      };
      if (mode === "download") await casePdf.downloadFullReport(ctx, payload);
      else await casePdf.printFullReport(ctx, payload);
    } catch (e: any) { toast.error(e.message ?? "PDF failed"); }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-semibold text-sm flex items-center gap-2"><FileArchive className="h-4 w-4" /> Internal Case Workspace</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => generateFull("download")}><Download className="h-3.5 w-3.5 mr-1" /> Full Case Report</Button>
          <Button size="sm" variant="outline" onClick={() => generateFull("print")}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
        </div>
      </div>

      <Tabs defaultValue="filings">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="filings" className="gap-1 text-xs"><ClipboardList className="h-3.5 w-3.5" /> Filings <Badge variant="outline" className="ml-1 text-[10px]">{filings.length}</Badge></TabsTrigger>
          <TabsTrigger value="notices" className="gap-1 text-xs"><Megaphone className="h-3.5 w-3.5" /> Notices <Badge variant="outline" className="ml-1 text-[10px]">{notices.length}</Badge></TabsTrigger>
          <TabsTrigger value="args" className="gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" /> Arguments <Badge variant="outline" className="ml-1 text-[10px]">{args.length}</Badge></TabsTrigger>
          <TabsTrigger value="orders" className="gap-1 text-xs"><Gavel className="h-3.5 w-3.5" /> Orders <Badge variant="outline" className="ml-1 text-[10px]">{orders.length}</Badge></TabsTrigger>
          <TabsTrigger value="reports" className="gap-1 text-xs"><FileSignature className="h-3.5 w-3.5" /> Reports <Badge variant="outline" className="ml-1 text-[10px]">{reports.length}</Badge></TabsTrigger>
        </TabsList>

        {/* FILINGS */}
        <TabsContent value="filings" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => onChange({ filings: [...filings, { title: "", date: new Date().toISOString().slice(0, 10) }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add Filing
          </Button>
          {filings.length === 0 && <EmptyNote label="No filings recorded." />}
          {filings.map((f, i) => (
            <ItemCard title={`Filing #${i + 1}`} onDelete={() => onChange({ filings: filings.filter((_, j) => j !== i) })}>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Title *">
                  <Input list="filing-kinds" value={f.title} onChange={(e) => patch(filings, i, { title: e.target.value }, (v) => onChange({ filings: v }))} />
                  <datalist id="filing-kinds">{FILING_KINDS.map((k) => <option key={k} value={k} />)}</datalist>
                </Field>
                <Field label="Filed By"><Input value={f.filed_by ?? ""} onChange={(e) => patch(filings, i, { filed_by: e.target.value }, (v) => onChange({ filings: v }))} /></Field>
                <Field label="Date"><Input type="date" value={f.date ?? ""} onChange={(e) => patch(filings, i, { date: e.target.value }, (v) => onChange({ filings: v }))} /></Field>
                <div />
                <div className="col-span-2"><Field label="Description"><Textarea rows={2} value={f.description ?? ""} onChange={(e) => patch(filings, i, { description: e.target.value }, (v) => onChange({ filings: v }))} /></Field></div>
                <div className="col-span-2"><Field label="File"><FileAttachment folder="cases" value={f.file ?? null} onChange={(v) => patch(filings, i, { file: v }, (arr) => onChange({ filings: arr }))} /></Field></div>
              </div>
            </ItemCard>
          ))}
        </TabsContent>

        {/* NOTICES */}
        <TabsContent value="notices" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => onChange({ notices: [...notices, { kind: "Show-Cause Notice", issued_on: new Date().toISOString().slice(0, 10), ref_no: `${ctx.case_no}/N-${notices.length + 1}` }] })}>
            <Plus className="h-3 w-3 mr-1" /> Issue New Notice
          </Button>
          {notices.length === 0 && <EmptyNote label="No notices issued." />}
          {notices.map((n, i) => (
            <ItemCard
              title={`Notice #${i + 1} — ${n.kind || "Notice"}`}
              badge={n.ref_no}
              onDelete={() => onChange({ notices: notices.filter((_, j) => j !== i) })}
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.downloadNotice(ctx, n); }}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.printNotice(ctx, n); }}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                </>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Notice Type">
                  <Select value={n.kind ?? ""} onValueChange={(v) => patch(notices, i, { kind: v }, (a) => onChange({ notices: a }))}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>{NOTICE_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Ref No."><Input value={n.ref_no ?? ""} onChange={(e) => patch(notices, i, { ref_no: e.target.value }, (a) => onChange({ notices: a }))} /></Field>
                <Field label="Addressed To"><Input value={n.to ?? ctx.employee_name ?? ""} onChange={(e) => patch(notices, i, { to: e.target.value }, (a) => onChange({ notices: a }))} /></Field>
                <Field label="Issued On"><Input type="date" value={n.issued_on ?? ""} onChange={(e) => patch(notices, i, { issued_on: e.target.value }, (a) => onChange({ notices: a }))} /></Field>
                <div className="col-span-2"><Field label="Subject"><Input value={n.subject ?? ""} onChange={(e) => patch(notices, i, { subject: e.target.value }, (a) => onChange({ notices: a }))} /></Field></div>
                <div className="col-span-2"><Field label="Body / Contents"><Textarea rows={4} value={n.body ?? ""} onChange={(e) => patch(notices, i, { body: e.target.value }, (a) => onChange({ notices: a }))} placeholder="Detailed body of the notice…" /></Field></div>
                <Field label="Reply Due"><Input type="date" value={n.response_due ?? ""} onChange={(e) => patch(notices, i, { response_due: e.target.value }, (a) => onChange({ notices: a }))} /></Field>
                <Field label="Reply Received On"><Input type="date" value={n.response_on ?? ""} onChange={(e) => patch(notices, i, { response_on: e.target.value }, (a) => onChange({ notices: a }))} /></Field>
                <div className="col-span-2"><Field label="Reply / Response"><Textarea rows={2} value={n.response ?? ""} onChange={(e) => patch(notices, i, { response: e.target.value }, (a) => onChange({ notices: a }))} /></Field></div>
                <div className="col-span-2"><Field label="Attached File"><FileAttachment folder="cases" value={n.file ?? null} onChange={(v) => patch(notices, i, { file: v }, (a) => onChange({ notices: a }))} /></Field></div>
              </div>
            </ItemCard>
          ))}
        </TabsContent>

        {/* ARGUMENTS */}
        <TabsContent value="args" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => onChange({ arguments_list: [...args, { party: "Respondent", date: new Date().toISOString().slice(0, 10) }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add Argument / Statement
          </Button>
          {args.length === 0 && <EmptyNote label="No arguments/statements recorded." />}
          {args.map((a, i) => (
            <ItemCard title={`Statement #${i + 1}`} badge={a.party} onDelete={() => onChange({ arguments_list: args.filter((_, j) => j !== i) })}>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Party">
                  <Select value={a.party ?? ""} onValueChange={(v) => patch(args, i, { party: v }, (arr) => onChange({ arguments_list: arr }))}>
                    <SelectTrigger><SelectValue placeholder="Party" /></SelectTrigger>
                    <SelectContent>{PARTY_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Name"><Input value={a.name ?? ""} onChange={(e) => patch(args, i, { name: e.target.value }, (arr) => onChange({ arguments_list: arr }))} /></Field>
                <Field label="Date"><Input type="date" value={a.date ?? ""} onChange={(e) => patch(args, i, { date: e.target.value }, (arr) => onChange({ arguments_list: arr }))} /></Field>
                <div />
                <div className="col-span-2"><Field label="Argument / Statement Contents"><Textarea rows={4} value={a.content ?? ""} onChange={(e) => patch(args, i, { content: e.target.value }, (arr) => onChange({ arguments_list: arr }))} /></Field></div>
                <div className="col-span-2"><Field label="Attached File"><FileAttachment folder="cases" value={a.file ?? null} onChange={(v) => patch(args, i, { file: v }, (arr) => onChange({ arguments_list: arr }))} /></Field></div>
              </div>
            </ItemCard>
          ))}
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => onChange({ orders: [...orders, { kind: "Interim Order", date: new Date().toISOString().slice(0, 10), order_no: `${ctx.case_no}/O-${orders.length + 1}` }] })}>
            <Plus className="h-3 w-3 mr-1" /> Issue New Order
          </Button>
          {orders.length === 0 && <EmptyNote label="No orders issued." />}
          {orders.map((o, i) => (
            <ItemCard
              title={`Order #${i + 1} — ${o.kind || "Order"}`}
              badge={o.order_no}
              onDelete={() => onChange({ orders: orders.filter((_, j) => j !== i) })}
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.downloadOrder(ctx, o); }}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.printOrder(ctx, o); }}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                </>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Order Type">
                  <Select value={o.kind ?? ""} onValueChange={(v) => patch(orders, i, { kind: v }, (a) => onChange({ orders: a }))}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>{ORDER_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Order No."><Input value={o.order_no ?? ""} onChange={(e) => patch(orders, i, { order_no: e.target.value }, (a) => onChange({ orders: a }))} /></Field>
                <Field label="Date"><Input type="date" value={o.date ?? ""} onChange={(e) => patch(orders, i, { date: e.target.value }, (a) => onChange({ orders: a }))} /></Field>
                <Field label="Issued By"><Input value={o.issued_by ?? ""} onChange={(e) => patch(orders, i, { issued_by: e.target.value }, (a) => onChange({ orders: a }))} placeholder="e.g. Committee Chair" /></Field>
                <div className="col-span-2"><Field label="Findings / Order Contents"><Textarea rows={4} value={o.content ?? ""} onChange={(e) => patch(orders, i, { content: e.target.value }, (a) => onChange({ orders: a }))} /></Field></div>
                <Field label="Penalty"><Input value={o.penalty ?? ""} onChange={(e) => patch(orders, i, { penalty: e.target.value }, (a) => onChange({ orders: a }))} placeholder="e.g. Warning / Fine PKR 5,000 / Suspension 7 days" /></Field>
                <Field label="Effective From"><Input type="date" value={o.effective_from ?? ""} onChange={(e) => patch(orders, i, { effective_from: e.target.value }, (a) => onChange({ orders: a }))} /></Field>
                <div className="col-span-2"><Field label="Signed Order File"><FileAttachment folder="cases" value={o.file ?? null} onChange={(v) => patch(orders, i, { file: v }, (a) => onChange({ orders: a }))} /></Field></div>
              </div>
            </ItemCard>
          ))}
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-3 space-y-3">
          <Button size="sm" onClick={() => onChange({ reports: [...reports, { title: "Inquiry Committee Report", date: new Date().toISOString().slice(0, 10) }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add Committee Report
          </Button>
          {reports.length === 0 && <EmptyNote label="No reports authored." />}
          {reports.map((r, i) => (
            <ItemCard
              title={`Report #${i + 1}`}
              badge={r.title}
              onDelete={() => onChange({ reports: reports.filter((_, j) => j !== i) })}
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.downloadReport(ctx, r); }}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const { casePdf } = await casePdfLib(); await casePdf.printReport(ctx, r); }}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                </>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Title"><Input value={r.title ?? ""} onChange={(e) => patch(reports, i, { title: e.target.value }, (a) => onChange({ reports: a }))} /></Field>
                <Field label="Prepared By"><Input value={r.prepared_by ?? ""} onChange={(e) => patch(reports, i, { prepared_by: e.target.value }, (a) => onChange({ reports: a }))} /></Field>
                <Field label="Date"><Input type="date" value={r.date ?? ""} onChange={(e) => patch(reports, i, { date: e.target.value }, (a) => onChange({ reports: a }))} /></Field>
                <div />
                <div className="col-span-2"><Field label="Findings"><Textarea rows={4} value={r.findings ?? ""} onChange={(e) => patch(reports, i, { findings: e.target.value }, (a) => onChange({ reports: a }))} /></Field></div>
                <div className="col-span-2"><Field label="Recommendations"><Textarea rows={3} value={r.recommendations ?? ""} onChange={(e) => patch(reports, i, { recommendations: e.target.value }, (a) => onChange({ reports: a }))} /></Field></div>
                <div className="col-span-2"><Field label="Signed Report File"><FileAttachment folder="cases" value={r.file ?? null} onChange={(v) => patch(reports, i, { file: v }, (a) => onChange({ reports: a }))} /></Field></div>
              </div>
            </ItemCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function patch<T>(arr: T[], i: number, p: Partial<T>, cb: (v: T[]) => void) {
  const next = [...arr];
  next[i] = { ...next[i], ...p } as T;
  cb(next);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function EmptyNote({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground py-3 text-center border rounded bg-muted/20">{label}</p>;
}

function ItemCard({
  title, badge, onDelete, actions, children,
}: {
  title: string; badge?: string; onDelete?: () => void; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" /> {title}
          {badge && <Badge variant="outline" className="text-[10px] font-mono">{badge}</Badge>}
        </CardTitle>
        <div className="flex items-center gap-1">
          {actions}
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this item?")) onDelete(); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
