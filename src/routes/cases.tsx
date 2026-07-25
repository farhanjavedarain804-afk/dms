import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { seedDummyCases } from "@/lib/cases-seed";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Scale, Plus, Trash2, Eye, Gavel, Building2, ShieldAlert, Users, CalendarClock, FileText, UserPlus, Paperclip, Search, X,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { StatsCards } from "@/components/dms/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileAttachment } from "@/components/dms/FileAttachment";
import { resources } from "@/lib/api";
import { localCrud } from "@/lib/local-store";
import { InternalCaseWorkspace } from "@/components/cases/InternalCaseWorkspace";


export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Case Management — Devionic DMS" },
      { name: "description", content: "Track external, filed, and internal disciplinary cases." },
    ],
  }),
  component: CasesPage,
});

// ============================================================
// Types
// ============================================================

type CaseType = "against" | "by" | "internal";

type Lawyer = {
  name: string;
  contact?: string;
  cnic?: string;
  license_no?: string;
  address?: string;
  firm?: string;
  email?: string;
};

type CaseAttachment = {
  title: string;
  description?: string;
  from?: string;
  to?: string;
  date?: string;
  file?: string | null; // "path::name"
};

type CaseHearing = {

  date: string;
  time?: string;
  stage?: string;
  venue?: string;
  judge_name?: string;
  judge_remarks?: string;
  our_argument?: string;
  outcome?: string;
  next_date?: string;
  next_time?: string;
  next_stage?: string;
  recorded_by?: string;
};

type Case = {
  id: number;
  case_no: string;
  type: CaseType;
  category?: string;
  title: string;
  status: string;
  filed_on?: string;

  // Professional / governance
  priority?: "low" | "medium" | "high" | "critical";
  confidentiality?: "normal" | "restricted" | "confidential";
  risk_exposure?: "low" | "medium" | "high";
  internal_manager?: string;   // In-house responsible person
  referred_by?: string;
  tags?: string[];

  // External (against / by)
  court?: string;
  bench?: string;
  city?: string;
  province?: string;
  suit_no?: string;             // Formal suit / petition number
  diary_no?: string;
  year_of_institution?: string;
  jurisdiction?: string;
  cause_of_action_date?: string;
  limitation_date?: string;
  court_fee_paid?: number;
  reliefs_sought?: string;
  estimated_legal_cost?: number;
  actual_legal_cost?: number;
  insurance_covered?: boolean;
  insurance_details?: string;
  opposing_party?: string; // legacy
  opposing_parties?: string[];
  our_lawyers?: Lawyer[];
  opposing_lawyers?: Lawyer[];
  claim_amount?: number;
  fir_no?: string;
  police_station?: string;

  // Internal
  employee_id?: number | null;
  employee_name?: string;
  employee_designation?: string;
  employee_department?: string;
  allegation?: string;
  policy_violated?: string;
  severity?: "minor" | "major" | "gross";
  previous_offences?: string;
  witnesses?: string[];
  suspension_status?: "none" | "suspended" | "reinstated";
  suspension_from?: string;
  suspension_to?: string;
  appeal_authority?: string;
  hr_officer?: string;
  incident_date?: string;
  incident_location?: string;
  reported_by?: string;
  committee_members?: string[];
  committee?: string;
  penalty?: string;

  // Common
  description?: string;
  next_hearing?: string;
  next_hearing_time?: string;
  next_stage?: string;
  hearings?: CaseHearing[];
  attachments?: CaseAttachment[];

  // Internal case workspace
  filings?: import("@/components/cases/InternalCaseWorkspace").CaseFiling[];
  notices?: import("@/components/cases/InternalCaseWorkspace").CaseNotice[];
  arguments_list?: import("@/components/cases/InternalCaseWorkspace").CaseArgumentItem[];
  orders?: import("@/components/cases/InternalCaseWorkspace").CaseOrder[];
  reports?: import("@/components/cases/InternalCaseWorkspace").CaseReport[];

  created_at?: string;
};


const casesApi = localCrud<Case>("cases_v1");

// ============================================================
// Constants
// ============================================================

const CASE_CATEGORIES = [
  "Civil", "Criminal", "Corporate", "Tax / Revenue", "Banking / Financial",
  "Family", "Labor / Industrial", "Constitutional / Writ", "Cybercrime (PECA)",
  "Intellectual Property", "Rent / Tenancy", "Consumer Protection",
  "Anti-Corruption (NAB)", "Anti-Narcotics", "Customs / FBR", "Environmental",
  "Arbitration", "Appeal / Revision", "Other",
];

const PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "Islamabad Capital", "AJK", "Gilgit-Baltistan"];

const EXTERNAL_STAGES = [
  "Filing", "Notice Issued", "Written Statement", "Framing of Issues",
  "Evidence (Plaintiff)", "Evidence (Defendant)", "Cross-Examination",
  "Final Arguments", "Judgment Reserved", "Judgment Pronounced",
  "Execution", "Appeal Filed", "Stay Granted", "Adjourned",
];

const INTERNAL_STAGES = [
  "Notice Issued", "Show Cause Sent", "Reply Received", "Committee Hearing",
  "Statement Recording", "Witness Recording", "Decision Reserved",
  "Decision Pronounced", "Appeal", "Closed",
];

const STATUS_PRESETS = [
  "open", "in_hearing", "adjourned", "closed", "won", "lost", "settled",
  "penalized", "dismissed", "stay_granted", "under_investigation",
  "notice_issued", "evidence_stage", "arguments_stage", "reserved_for_judgment",
  "appeal_filed",
];

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const CONFIDENTIALITY = ["normal", "restricted", "confidential"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const SEVERITY = ["minor", "major", "gross"] as const;
const SUSPENSION_STATES = ["none", "suspended", "reinstated"] as const;

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700",
};

const STATUS_TONE_MAP: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_hearing: "bg-amber-100 text-amber-700",
  adjourned: "bg-slate-100 text-slate-700",
  closed: "bg-zinc-100 text-zinc-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  settled: "bg-teal-100 text-teal-700",
  penalized: "bg-orange-100 text-orange-700",
  dismissed: "bg-gray-100 text-gray-700",
  stay_granted: "bg-purple-100 text-purple-700",
  under_investigation: "bg-yellow-100 text-yellow-700",
  notice_issued: "bg-cyan-100 text-cyan-700",
  evidence_stage: "bg-indigo-100 text-indigo-700",
  arguments_stage: "bg-fuchsia-100 text-fuchsia-700",
  reserved_for_judgment: "bg-violet-100 text-violet-700",
  appeal_filed: "bg-sky-100 text-sky-700",
};
const statusTone = (s: string) => STATUS_TONE_MAP[s] ?? "bg-neutral-100 text-neutral-700";

const TYPE_META: Record<CaseType, { label: string; icon: any }> = {
  against: { label: "Cases Against Devionic", icon: ShieldAlert },
  by: { label: "Cases Filed by Devionic", icon: Gavel },
  internal: { label: "Internal Disciplinary Cases", icon: Building2 },
};

const partiesLabel = (c: Case) =>
  c.opposing_parties && c.opposing_parties.length > 0
    ? c.opposing_parties.filter(Boolean).join(", ")
    : c.opposing_party ?? "—";


function nextCaseNo(rows: Case[], type: CaseType) {
  const prefix = type === "against" ? "CA" : type === "by" ? "CB" : "CI";
  const year = new Date().getFullYear();
  const n = rows.filter((r) => r.type === type).length + 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

// ============================================================
// Reusable atoms
// ============================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 mt-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h4>
      <Separator className="mt-1" />
    </div>
  );
}

function MultiText({
  values, onChange, placeholder,
}: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const list = values.length > 0 ? values : [""];
  return (
    <div className="space-y-2">
      {list.map((val, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={val}
            onChange={(e) => { const arr = [...list]; arr[i] = e.target.value; onChange(arr); }}
            placeholder={placeholder}
          />
          <Button type="button" variant="ghost" size="icon"
            onClick={() => { const arr = [...list]; arr.splice(i, 1); onChange(arr.length ? arr : [""]); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...list, ""])}>
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  );
}

function LawyerBlock({
  title, lawyers, onChange,
}: { title: string; lawyers: Lawyer[]; onChange: (l: Lawyer[]) => void }) {
  const list = lawyers.length > 0 ? lawyers : [];
  const update = (i: number, patch: Partial<Lawyer>) => {
    const arr = [...list]; arr[i] = { ...arr[i], ...patch }; onChange(arr);
  };
  return (
    <div className="col-span-2 border rounded-md p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-semibold flex items-center gap-1"><UserPlus className="h-4 w-4" /> {title}</h5>
        <Button type="button" size="sm" variant="outline"
          onClick={() => onChange([...list, { name: "" }])}>
          <Plus className="h-3 w-3 mr-1" /> Add Lawyer
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">No lawyer added yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((lw, i) => (
            <div key={i} className="border rounded p-2 bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Lawyer #{i + 1}</span>
                <Button type="button" variant="ghost" size="icon"
                  onClick={() => { const arr = [...list]; arr.splice(i, 1); onChange(arr); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={lw.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Firm / Chamber</Label>
                  <Input value={lw.firm ?? ""} onChange={(e) => update(i, { firm: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Contact #</Label>
                  <Input value={lw.contact ?? ""} onChange={(e) => update(i, { contact: e.target.value })} placeholder="+92 3XX XXXXXXX" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={lw.email ?? ""} onChange={(e) => update(i, { email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">CNIC</Label>
                  <Input value={lw.cnic ?? ""} onChange={(e) => update(i, { cnic: e.target.value })} placeholder="XXXXX-XXXXXXX-X" />
                </div>
                <div>
                  <Label className="text-xs">Bar License #</Label>
                  <Input value={lw.license_no ?? ""} onChange={(e) => update(i, { license_no: e.target.value })} placeholder="e.g. PBC/LHR/1234" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Address</Label>
                  <Input value={lw.address ?? ""} onChange={(e) => update(i, { address: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentsBlock({
  attachments, onChange,
}: { attachments: CaseAttachment[]; onChange: (a: CaseAttachment[]) => void }) {
  const list = attachments ?? [];
  const update = (i: number, patch: Partial<CaseAttachment>) => {
    const arr = [...list]; arr[i] = { ...arr[i], ...patch }; onChange(arr);
  };
  return (
    <div className="col-span-2 border rounded-md p-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-semibold flex items-center gap-1"><Paperclip className="h-4 w-4" /> Case Attachments</h5>
        <Button type="button" size="sm" variant="outline"
          onClick={() => onChange([...list, { title: "", date: new Date().toISOString().slice(0, 10) }])}>
          <Plus className="h-3 w-3 mr-1" /> Add Attachment
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments added yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((a, i) => (
            <div key={i} className="border rounded p-2 bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Attachment #{i + 1}</span>
                <Button type="button" variant="ghost" size="icon"
                  onClick={() => { const arr = [...list]; arr.splice(i, 1); onChange(arr); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Title *</Label>
                  <Input value={a.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="e.g. FIR Copy, Notice, Reply, Evidence Photo" />
                </div>
                <div>
                  <Label className="text-xs">From (Sender)</Label>
                  <Input value={a.from ?? ""} onChange={(e) => update(i, { from: e.target.value })} placeholder="e.g. SHO Police Station Layyah" />
                </div>
                <div>
                  <Label className="text-xs">To (Recipient)</Label>
                  <Input value={a.to ?? ""} onChange={(e) => update(i, { to: e.target.value })} placeholder="e.g. Devionic (Pvt) Ltd" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={a.date ?? ""} onChange={(e) => update(i, { date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={a.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} placeholder="Brief description / contents of this document" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">File</Label>
                  <FileAttachment value={a.file ?? null} onChange={(v) => update(i, { file: v })} folder="cases" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusField({ value, onChange }: { value: string; onChange: (v: string) => void }) {

  return (
    <div>
      <Label>Status (type your own or pick)</Label>
      <Input
        list="case-status-presets" value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. open, stay_granted, custom..."
      />
      <datalist id="case-status-presets">
        {STATUS_PRESETS.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

function CasesPage() {
  const qc = useQueryClient();
  const { data: cases = [] } = useQuery({ queryKey: ["cases"], queryFn: () => casesApi.list() });
  useEffect(() => { seedDummyCases(casesApi).then((added) => { if (added) qc.invalidateQueries({ queryKey: ["cases"] }); }); }, [qc]);
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => resources.employees.list() });

  const [tab, setTab] = useState<CaseType>("against");
  const [openType, setOpenType] = useState<CaseType | null>(null);
  const [viewing, setViewing] = useState<Case | null>(null);
  const [hearingOpen, setHearingOpen] = useState(false);
  const [search, setSearch] = useState("");

  const create = useMutation({
    mutationFn: (body: Omit<Case, "id">) => casesApi.create(body),
    onSuccess: () => {
      toast.success("Case recorded");
      qc.invalidateQueries({ queryKey: ["cases"] });
      setOpenType(null);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Case> }) => casesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => casesApi.remove(id),
    onSuccess: () => { toast.success("Case removed"); qc.invalidateQueries({ queryKey: ["cases"] }); },
  });

  const filtered = useMemo(() => cases.filter((c) => c.type === tab), [cases, tab]);

  const stats = useMemo(() => {
    const total = cases.length;
    const open = cases.filter((c) => ["open", "in_hearing", "adjourned"].includes(c.status)).length;
    const upcoming = cases.filter((c) => c.next_hearing && new Date(c.next_hearing) >= new Date()).length;
    const closed = cases.filter((c) => ["closed", "won", "lost", "settled", "dismissed", "penalized"].includes(c.status)).length;
    const against = cases.filter((c) => c.type === "against").length;
    const by = cases.filter((c) => c.type === "by").length;
    const internal = cases.filter((c) => c.type === "internal").length;
    const won = cases.filter((c) => c.status === "won").length;
    return [
      { label: "Total Cases", value: String(total), icon: Scale },
      { label: "Open / Active", value: String(open), icon: Gavel },
      { label: "Upcoming Hearings", value: String(upcoming), icon: CalendarClock },
      { label: "Closed", value: String(closed), icon: FileText },
      { label: "Against Devionic", value: String(against), icon: ShieldAlert },
      { label: "Filed by Devionic", value: String(by), icon: Gavel },
      { label: "Internal Cases", value: String(internal), icon: Building2 },
      { label: "Won by Devionic", value: String(won), icon: Users },
    ];
  }, [cases]);

  const addHearing = (data: CaseHearing) => {
    if (!viewing) return;
    const hearings = [...(viewing.hearings ?? []), data];
    const patch: Partial<Case> = {
      hearings,
      next_hearing: data.next_date ?? viewing.next_hearing,
      next_hearing_time: data.next_time ?? viewing.next_hearing_time,
      next_stage: data.next_stage ?? viewing.next_stage,
    };
    update.mutate(
      { id: viewing.id, body: patch },
      { onSuccess: () => { setViewing({ ...viewing, ...patch } as Case); setHearingOpen(false); toast.success("Hearing added"); } },
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Case Management"
        description="Track legal cases against Devionic, filed by Devionic, and internal disciplinary matters."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "cases",
                moduleLabel: "Case Management",
                title: "Case Management Report",
                subtitle: `${cases.length} case(s)`,
                sections: [{
                  title: "All Cases",
                  columns: [
                    { key: "case_no", label: "Case #" },
                    { key: "type", label: "Type" },
                    { key: "title", label: "Title" },
                    { key: "party", label: "Party" },
                    { key: "stage", label: "Stage" },
                    { key: "status", label: "Status" },
                    { key: "next_hearing", label: "Next Hearing" },
                  ],
                  rows: cases,
                }],
              })}
            />
            <Button onClick={() => setOpenType(tab)} className="gap-2">
              <Plus className="h-4 w-4" /> New {tab === "against" ? "Case Against" : tab === "by" ? "Case By Devionic" : "Internal Case"}
            </Button>
          </div>
        }
      />

      <StatsCards stats={stats} className="grid grid-cols-2 lg:grid-cols-4 gap-3" />

      <CaseStatusSearch cases={cases} search={search} setSearch={setSearch} onView={setViewing} onJumpTab={setTab} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as CaseType)} className="mt-4">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="against" className="gap-2"><ShieldAlert className="h-4 w-4" /> Against Devionic</TabsTrigger>
          <TabsTrigger value="by" className="gap-2"><Gavel className="h-4 w-4" /> By Devionic</TabsTrigger>
          <TabsTrigger value="internal" className="gap-2"><Building2 className="h-4 w-4" /> Internal</TabsTrigger>
        </TabsList>

        {(["against", "by", "internal"] as CaseType[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{TYPE_META[k].label}</CardTitle>
                <Badge variant="outline">{filtered.length} case(s)</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case #</TableHead>
                      <TableHead>Title</TableHead>
                      {k === "internal" ? <TableHead>Employee</TableHead> : <TableHead>Opposing Party</TableHead>}
                      {k === "internal" ? <TableHead>Committee</TableHead> : <TableHead>Court</TableHead>}
                      <TableHead>Filed</TableHead>
                      <TableHead>Next Hearing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No cases yet.</TableCell></TableRow>
                    ) : filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.case_no}</TableCell>
                        <TableCell className="font-medium">
                          {c.title}
                          {c.category && <div className="text-xs text-muted-foreground">{c.category}</div>}
                        </TableCell>
                        <TableCell>{k === "internal" ? (c.employee_name ?? "—") : partiesLabel(c)}</TableCell>
                        <TableCell>{k === "internal" ? (c.committee ?? "—") : (c.court ?? "—")}</TableCell>
                        <TableCell>{c.filed_on ?? "—"}</TableCell>
                        <TableCell>
                          {c.next_hearing ? (
                            <div className="text-xs">
                              <div>{c.next_hearing}{c.next_hearing_time ? ` • ${c.next_hearing_time}` : ""}</div>
                              {c.next_stage && <div className="text-muted-foreground">{c.next_stage}</div>}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell><Badge className={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setViewing(c)}><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this case?")) remove.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dedicated create dialogs per section */}
      {openType === "against" && (
        <ExternalCaseDialog
          type="against"
          existing={cases}
          onClose={() => setOpenType(null)}
          onSave={(b) => create.mutate(b)}
          saving={create.isPending}
        />
      )}
      {openType === "by" && (
        <ExternalCaseDialog
          type="by"
          existing={cases}
          onClose={() => setOpenType(null)}
          onSave={(b) => create.mutate(b)}
          saving={create.isPending}
        />
      )}
      {openType === "internal" && (
        <InternalCaseDialog
          existing={cases}
          employees={employees}
          onClose={() => setOpenType(null)}
          onSave={(b) => create.mutate(b)}
          saving={create.isPending}
        />
      )}

      {/* View */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{viewing.case_no}</span>
                  {viewing.title}
                  <Badge className={statusTone(viewing.status)}>{viewing.status.replace(/_/g, " ")}</Badge>
                  {viewing.category && <Badge variant="outline">{viewing.category}</Badge>}
                  {viewing.priority && <Badge className={PRIORITY_TONE[viewing.priority] ?? ""}>Priority: {viewing.priority}</Badge>}
                  {viewing.confidentiality && viewing.confidentiality !== "normal" && <Badge variant="outline">🔒 {viewing.confidentiality}</Badge>}
                  {viewing.risk_exposure && <Badge variant="outline">Risk: {viewing.risk_exposure}</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {TYPE_META[viewing.type].label}</div>
                <div><span className="text-muted-foreground">Filed:</span> {viewing.filed_on ?? "—"}</div>

                {viewing.type !== "internal" ? (
                  <>
                    <div><span className="text-muted-foreground">Court:</span> {viewing.court ?? "—"}</div>
                    <div><span className="text-muted-foreground">Bench / Room:</span> {viewing.bench ?? "—"}</div>
                    <div><span className="text-muted-foreground">Suit / Petition #:</span> {viewing.suit_no ?? "—"}</div>
                    <div><span className="text-muted-foreground">Diary #:</span> {viewing.diary_no ?? "—"}</div>
                    <div><span className="text-muted-foreground">Year:</span> {viewing.year_of_institution ?? "—"}</div>
                    <div><span className="text-muted-foreground">Jurisdiction:</span> {viewing.jurisdiction ?? "—"}</div>
                    <div><span className="text-muted-foreground">City:</span> {viewing.city ?? "—"}</div>
                    <div><span className="text-muted-foreground">Province:</span> {viewing.province ?? "—"}</div>
                    <div><span className="text-muted-foreground">Cause of Action:</span> {viewing.cause_of_action_date ?? "—"}</div>
                    <div><span className="text-muted-foreground">Limitation:</span> {viewing.limitation_date ?? "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Opposing Parties:</span> {partiesLabel(viewing)}</div>
                    {viewing.fir_no && <div><span className="text-muted-foreground">FIR #:</span> {viewing.fir_no}</div>}
                    {viewing.police_station && <div><span className="text-muted-foreground">Police Station:</span> {viewing.police_station}</div>}
                    <div><span className="text-muted-foreground">Claim:</span> {viewing.claim_amount ? `PKR ${viewing.claim_amount.toLocaleString()}` : "—"}</div>
                    <div><span className="text-muted-foreground">Court Fee Paid:</span> {viewing.court_fee_paid ? `PKR ${viewing.court_fee_paid.toLocaleString()}` : "—"}</div>
                    <div><span className="text-muted-foreground">Est. Legal Cost:</span> {viewing.estimated_legal_cost ? `PKR ${viewing.estimated_legal_cost.toLocaleString()}` : "—"}</div>
                    <div><span className="text-muted-foreground">Actual Legal Cost:</span> {viewing.actual_legal_cost ? `PKR ${viewing.actual_legal_cost.toLocaleString()}` : "—"}</div>
                    <div><span className="text-muted-foreground">Insurance:</span> {viewing.insurance_covered ? `Yes${viewing.insurance_details ? ` — ${viewing.insurance_details}` : ""}` : "No"}</div>
                    <div><span className="text-muted-foreground">Case Manager:</span> {viewing.internal_manager ?? "—"}</div>
                    <div><span className="text-muted-foreground">Referred By:</span> {viewing.referred_by ?? "—"}</div>
                    {viewing.reliefs_sought && <div className="col-span-2"><span className="text-muted-foreground">Reliefs / Prayer:</span> {viewing.reliefs_sought}</div>}

                    <LawyerReadonly title="Our Lawyers" list={viewing.our_lawyers ?? []} />
                    <LawyerReadonly title="Opposing Lawyers" list={viewing.opposing_lawyers ?? []} />
                  </>
                ) : (
                  <>
                    <div><span className="text-muted-foreground">Employee:</span> {viewing.employee_name ?? "—"}{viewing.employee_designation ? `, ${viewing.employee_designation}` : ""}</div>
                    <div><span className="text-muted-foreground">Department:</span> {viewing.employee_department ?? "—"}</div>
                    <div><span className="text-muted-foreground">Incident Date:</span> {viewing.incident_date ?? "—"}</div>
                    <div><span className="text-muted-foreground">Incident Location:</span> {viewing.incident_location ?? "—"}</div>
                    <div><span className="text-muted-foreground">Reported By:</span> {viewing.reported_by ?? "—"}</div>
                    <div><span className="text-muted-foreground">HR Officer:</span> {viewing.hr_officer ?? "—"}</div>
                    <div><span className="text-muted-foreground">Committee:</span> {viewing.committee ?? "—"}</div>
                    <div><span className="text-muted-foreground">Appeal Authority:</span> {viewing.appeal_authority ?? "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Committee Members:</span> {(viewing.committee_members ?? []).filter(Boolean).join(", ") || "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Allegation:</span> {viewing.allegation ?? "—"}</div>
                    {viewing.policy_violated && <div className="col-span-2"><span className="text-muted-foreground">Policy Violated:</span> {viewing.policy_violated}</div>}
                    {viewing.severity && <div><span className="text-muted-foreground">Severity:</span> {viewing.severity}</div>}
                    <div><span className="text-muted-foreground">Proposed Penalty:</span> {viewing.penalty ?? "—"}</div>
                    {viewing.witnesses && viewing.witnesses.length > 0 && (
                      <div className="col-span-2"><span className="text-muted-foreground">Witnesses:</span> {viewing.witnesses.filter(Boolean).join(", ")}</div>
                    )}
                    {viewing.suspension_status && viewing.suspension_status !== "none" && (
                      <div className="col-span-2 rounded bg-rose-50 border border-rose-200 p-2">
                        <b>Suspension:</b> {viewing.suspension_status}
                        {viewing.suspension_from ? ` — from ${viewing.suspension_from}` : ""}
                        {viewing.suspension_to ? ` to ${viewing.suspension_to}` : ""}
                      </div>
                    )}
                    {viewing.previous_offences && <div className="col-span-2"><span className="text-muted-foreground">Previous Offences:</span> {viewing.previous_offences}</div>}
                  </>
                )}
                {viewing.tags && viewing.tags.length > 0 && (
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {viewing.tags.map((t, i) => <Badge key={i} variant="outline" className="text-xs">#{t}</Badge>)}
                  </div>
                )}
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {viewing.description ?? "—"}</div>
                {viewing.next_hearing && (
                  <div className="col-span-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-sm">
                    <b>Next Hearing:</b> {viewing.next_hearing}
                    {viewing.next_hearing_time ? ` • ${viewing.next_hearing_time}` : ""}
                    {viewing.next_stage ? ` — ${viewing.next_stage}` : ""}
                  </div>
                )}
              </div>

              {viewing.type === "internal" && (
                <InternalCaseWorkspace
                  ctx={{
                    case_no: viewing.case_no,
                    title: viewing.title,
                    employee_name: viewing.employee_name,
                    allegation: viewing.allegation,
                    incident_date: viewing.incident_date,
                    committee: viewing.committee,
                    committee_members: viewing.committee_members,
                    reported_by: viewing.reported_by,
                    filed_on: viewing.filed_on,
                    ...({ status: viewing.status, hearings: viewing.hearings } as any),
                  }}
                  data={{
                    filings: viewing.filings,
                    notices: viewing.notices,
                    arguments_list: viewing.arguments_list,
                    orders: viewing.orders,
                    reports: viewing.reports,
                  }}
                  onChange={(patch) => {
                    update.mutate(
                      { id: viewing.id, body: patch },
                      { onSuccess: () => setViewing({ ...viewing, ...patch } as Case) },
                    );
                  }}
                />
              )}

              <div className="mt-4">

                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Hearing History</h4>
                  <Button size="sm" onClick={() => setHearingOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add Hearing</Button>
                </div>
                {(!viewing.hearings || viewing.hearings.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No hearings recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {viewing.hearings.map((h, i) => (
                      <div key={i} className="border rounded p-3 text-sm bg-muted/20">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{h.date}{h.time ? ` • ${h.time}` : ""}</span>
                            {h.stage && <Badge variant="outline" className="text-xs">{h.stage}</Badge>}
                          </div>
                          {h.next_date && (
                            <span className="text-xs text-muted-foreground">
                              Next: {h.next_date}{h.next_time ? ` • ${h.next_time}` : ""}{h.next_stage ? ` — ${h.next_stage}` : ""}
                            </span>
                          )}
                        </div>
                        {h.venue && <div className="text-xs text-muted-foreground mt-1">Venue: {h.venue}</div>}
                        {h.judge_name && <div className="text-xs mt-1"><b>Judge/Chair:</b> {h.judge_name}</div>}
                        {h.judge_remarks && <div className="mt-1"><b>Remarks:</b> {h.judge_remarks}</div>}
                        {h.our_argument && <div className="mt-1"><b>Our Argument:</b> {h.our_argument}</div>}
                        {h.outcome && <div className="mt-1"><b>Outcome:</b> {h.outcome}</div>}
                        {h.recorded_by && <div className="text-xs text-muted-foreground mt-1">Recorded by: {h.recorded_by}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1"><Paperclip className="h-4 w-4" /> Attachments</h4>
                  <Button size="sm" variant="outline" onClick={() => {
                    const next = [...(viewing.attachments ?? []), { title: "", date: new Date().toISOString().slice(0, 10) } as CaseAttachment];
                    update.mutate({ id: viewing.id, body: { attachments: next } }, {
                      onSuccess: () => setViewing({ ...viewing, attachments: next }),
                    });
                  }}><Plus className="h-3 w-3 mr-1" /> Add Attachment</Button>
                </div>
                {(!viewing.attachments || viewing.attachments.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No attachments yet.</p>
                ) : (
                  <div className="space-y-2">
                    <AttachmentsBlock
                      attachments={viewing.attachments}
                      onChange={(a) => {
                        update.mutate({ id: viewing.id, body: { attachments: a } }, {
                          onSuccess: () => setViewing({ ...viewing, attachments: a }),
                        });
                      }}
                    />
                  </div>
                )}
              </div>

            </>
          )}
        </DialogContent>
      </Dialog>

      <HearingDialog
        open={hearingOpen}
        onOpenChange={setHearingOpen}
        onSave={addHearing}
        stages={viewing?.type === "internal" ? INTERNAL_STAGES : EXTERNAL_STAGES}
      />
      <ModuleReportsCard module="cases" />
    </AppLayout>
  );
}

// ============================================================
// External case dialog (against / by)
// ============================================================

function ExternalCaseDialog({
  type, existing, onClose, onSave, saving,
}: {
  type: "against" | "by";
  existing: Case[];
  onClose: () => void;
  onSave: (c: Omit<Case, "id">) => void;
  saving: boolean;
}) {
  const [f, setF] = useState<Partial<Case>>({
    type, status: "open",
    filed_on: new Date().toISOString().slice(0, 10),
    opposing_parties: [""],
    our_lawyers: [],
    opposing_lawyers: [],
    attachments: [],
  });


  const title = type === "against"
    ? "New Case — Against Devionic"
    : "New Case — Filed by Devionic";

  const submit = () => {
    if (!f.title) return toast.error("Title required");
    onSave({
      case_no: f.case_no || nextCaseNo(existing, type),
      type,
      category: f.category,
      title: f.title!,
      status: f.status ?? "open",
      filed_on: f.filed_on,
      priority: f.priority, confidentiality: f.confidentiality, risk_exposure: f.risk_exposure,
      internal_manager: f.internal_manager, referred_by: f.referred_by,
      tags: (f.tags ?? []).filter((t) => t && t.trim().length > 0),
      court: f.court, bench: f.bench, city: f.city, province: f.province,
      suit_no: f.suit_no, diary_no: f.diary_no, year_of_institution: f.year_of_institution,
      jurisdiction: f.jurisdiction, cause_of_action_date: f.cause_of_action_date,
      limitation_date: f.limitation_date,
      court_fee_paid: f.court_fee_paid ? Number(f.court_fee_paid) : undefined,
      reliefs_sought: f.reliefs_sought,
      estimated_legal_cost: f.estimated_legal_cost ? Number(f.estimated_legal_cost) : undefined,
      actual_legal_cost: f.actual_legal_cost ? Number(f.actual_legal_cost) : undefined,
      insurance_covered: f.insurance_covered, insurance_details: f.insurance_details,
      opposing_parties: (f.opposing_parties ?? []).filter((s) => s && s.trim().length > 0),
      our_lawyers: (f.our_lawyers ?? []).filter((l) => l.name && l.name.trim().length > 0),
      opposing_lawyers: (f.opposing_lawyers ?? []).filter((l) => l.name && l.name.trim().length > 0),
      claim_amount: f.claim_amount ? Number(f.claim_amount) : undefined,
      fir_no: f.fir_no, police_station: f.police_station,
      description: f.description,
      next_hearing: f.next_hearing,
      next_hearing_time: f.next_hearing_time,
      next_stage: f.next_stage,
      hearings: [],
      attachments: (f.attachments ?? []).filter((a) => a.title && a.title.trim().length > 0),

      created_at: new Date().toISOString(),
    });
  };


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <SectionTitle>Case Basics</SectionTitle>
          <div>
            <Label>Case # (auto)</Label>
            <Input value={f.case_no ?? ""} onChange={(e) => setF({ ...f, case_no: e.target.value })} placeholder="Auto-generated" />
          </div>
          <div>
            <Label>Case Category</Label>
            <Select value={f.category ?? ""} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CASE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Case Title *</Label>
            <Input value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div>
            <Label>Filed On</Label>
            <Input type="date" value={f.filed_on ?? ""} onChange={(e) => setF({ ...f, filed_on: e.target.value })} />
          </div>
          <StatusField value={f.status ?? "open"} onChange={(v) => setF({ ...f, status: v })} />
          <div>
            <Label>Claim Amount (PKR)</Label>
            <Input type="number" value={f.claim_amount ?? ""} onChange={(e) => setF({ ...f, claim_amount: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          {(f.category === "Criminal" || f.category === "Anti-Narcotics" || f.category === "Cybercrime (PECA)") && (
            <>
              <div>
                <Label>FIR #</Label>
                <Input value={f.fir_no ?? ""} onChange={(e) => setF({ ...f, fir_no: e.target.value })} />
              </div>
              <div>
                <Label>Police Station</Label>
                <Input value={f.police_station ?? ""} onChange={(e) => setF({ ...f, police_station: e.target.value })} />
              </div>
            </>
          )}

          <SectionTitle>Governance & Assignment</SectionTitle>
          <div>
            <Label>Priority</Label>
            <Select value={f.priority ?? ""} onValueChange={(v) => setF({ ...f, priority: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Confidentiality</Label>
            <Select value={f.confidentiality ?? ""} onValueChange={(v) => setF({ ...f, confidentiality: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CONFIDENTIALITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Risk Exposure</Label>
            <Select value={f.risk_exposure ?? ""} onValueChange={(v) => setF({ ...f, risk_exposure: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{RISK_LEVELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>In-house Case Manager</Label>
            <Input value={f.internal_manager ?? ""} onChange={(e) => setF({ ...f, internal_manager: e.target.value })} placeholder="e.g. Legal Head / COO" />
          </div>
          <div>
            <Label>Referred By</Label>
            <Input value={f.referred_by ?? ""} onChange={(e) => setF({ ...f, referred_by: e.target.value })} placeholder="Client / Board / Legal Firm" />
          </div>
          <div>
            <Label>Tags</Label>
            <Input
              value={(f.tags ?? []).join(", ")}
              onChange={(e) => setF({ ...f, tags: e.target.value.split(",").map((s) => s.trim()) })}
              placeholder="comma separated, e.g. urgent, contract, ip"
            />
          </div>

          <SectionTitle>Court Details</SectionTitle>
          <div>
            <Label>Court</Label>
            <Input value={f.court ?? ""} onChange={(e) => setF({ ...f, court: e.target.value })} placeholder="e.g. Civil Court Layyah / LHC Multan Bench" />
          </div>
          <div>
            <Label>Bench / Court Room</Label>
            <Input value={f.bench ?? ""} onChange={(e) => setF({ ...f, bench: e.target.value })} />
          </div>
          <div>
            <Label>Suit / Petition No.</Label>
            <Input value={f.suit_no ?? ""} onChange={(e) => setF({ ...f, suit_no: e.target.value })} placeholder="e.g. Suit No. 214/2026" />
          </div>
          <div>
            <Label>Diary No.</Label>
            <Input value={f.diary_no ?? ""} onChange={(e) => setF({ ...f, diary_no: e.target.value })} />
          </div>
          <div>
            <Label>Year of Institution</Label>
            <Input value={f.year_of_institution ?? ""} onChange={(e) => setF({ ...f, year_of_institution: e.target.value })} placeholder="e.g. 2026" />
          </div>
          <div>
            <Label>Jurisdiction</Label>
            <Input value={f.jurisdiction ?? ""} onChange={(e) => setF({ ...f, jurisdiction: e.target.value })} placeholder="Original / Appellate / Writ" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </div>
          <div>
            <Label>Province</Label>
            <Select value={f.province ?? ""} onValueChange={(v) => setF({ ...f, province: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cause of Action Date</Label>
            <Input type="date" value={f.cause_of_action_date ?? ""} onChange={(e) => setF({ ...f, cause_of_action_date: e.target.value })} />
          </div>
          <div>
            <Label>Limitation / Deadline</Label>
            <Input type="date" value={f.limitation_date ?? ""} onChange={(e) => setF({ ...f, limitation_date: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Reliefs / Prayer Sought</Label>
            <Textarea rows={2} value={f.reliefs_sought ?? ""} onChange={(e) => setF({ ...f, reliefs_sought: e.target.value })} placeholder="e.g. Recovery of PKR 1,250,000 with mark-up; damages; costs of suit; any other relief..." />
          </div>

          <SectionTitle>Financials</SectionTitle>
          <div>
            <Label>Court Fee Paid (PKR)</Label>
            <Input type="number" value={f.court_fee_paid ?? ""} onChange={(e) => setF({ ...f, court_fee_paid: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Estimated Legal Cost (PKR)</Label>
            <Input type="number" value={f.estimated_legal_cost ?? ""} onChange={(e) => setF({ ...f, estimated_legal_cost: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Actual Legal Cost (PKR)</Label>
            <Input type="number" value={f.actual_legal_cost ?? ""} onChange={(e) => setF({ ...f, actual_legal_cost: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label>Insurance Covered?</Label>
            <Select value={f.insurance_covered === true ? "yes" : f.insurance_covered === false ? "no" : ""} onValueChange={(v) => setF({ ...f, insurance_covered: v === "yes" })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
            </Select>
          </div>
          {f.insurance_covered && (
            <div className="col-span-2">
              <Label>Insurance Details</Label>
              <Input value={f.insurance_details ?? ""} onChange={(e) => setF({ ...f, insurance_details: e.target.value })} placeholder="Insurer, policy #, coverage limit" />
            </div>
          )}


          <SectionTitle>Opposing Parties</SectionTitle>
          <div className="col-span-2">
            <MultiText
              values={f.opposing_parties ?? [""]}
              onChange={(v) => setF({ ...f, opposing_parties: v })}
              placeholder="Party full name (e.g. Ali Raza s/o Rehmat)"
            />
          </div>

          <SectionTitle>Our Lawyers (Devionic side)</SectionTitle>
          <LawyerBlock title="Devionic Counsel" lawyers={f.our_lawyers ?? []} onChange={(l) => setF({ ...f, our_lawyers: l })} />

          <SectionTitle>Opposing Lawyers</SectionTitle>
          <LawyerBlock title="Opposing Counsel" lawyers={f.opposing_lawyers ?? []} onChange={(l) => setF({ ...f, opposing_lawyers: l })} />

          <SectionTitle>Next Hearing</SectionTitle>
          <div>
            <Label>Next Hearing Date</Label>
            <Input type="date" value={f.next_hearing ?? ""} onChange={(e) => setF({ ...f, next_hearing: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={f.next_hearing_time ?? ""} onChange={(e) => setF({ ...f, next_hearing_time: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Expected Stage</Label>
            <Input list="ext-stages" value={f.next_stage ?? ""} onChange={(e) => setF({ ...f, next_stage: e.target.value })} placeholder="e.g. Framing of Issues" />
            <datalist id="ext-stages">{EXTERNAL_STAGES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>

          <SectionTitle>Attachments</SectionTitle>
          <AttachmentsBlock attachments={f.attachments ?? []} onChange={(a) => setF({ ...f, attachments: a })} />

          <SectionTitle>Background</SectionTitle>
          <div className="col-span-2">
            <Label>Description / Background</Label>
            <Textarea rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Save Case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Internal case dialog
// ============================================================

function InternalCaseDialog({
  existing, employees, onClose, onSave, saving,
}: {
  existing: Case[];
  employees: any[];
  onClose: () => void;
  onSave: (c: Omit<Case, "id">) => void;
  saving: boolean;
}) {
  const [f, setF] = useState<Partial<Case>>({
    type: "internal", status: "under_investigation",
    filed_on: new Date().toISOString().slice(0, 10),
    committee_members: [""],
    attachments: [],
  });


  const submit = () => {
    if (!f.title) return toast.error("Title required");
    if (!f.employee_id) return toast.error("Employee required");
    onSave({
      case_no: f.case_no || nextCaseNo(existing, "internal"),
      type: "internal",
      title: f.title!,
      status: f.status ?? "under_investigation",
      filed_on: f.filed_on,
      priority: f.priority, confidentiality: f.confidentiality, risk_exposure: f.risk_exposure,
      internal_manager: f.internal_manager, referred_by: f.referred_by,
      tags: (f.tags ?? []).filter((t) => t && t.trim().length > 0),
      employee_id: f.employee_id ?? null,
      employee_name: f.employee_name,
      employee_designation: f.employee_designation,
      employee_department: f.employee_department,
      allegation: f.allegation,
      policy_violated: f.policy_violated,
      severity: f.severity,
      previous_offences: f.previous_offences,
      witnesses: (f.witnesses ?? []).filter((s) => s && s.trim().length > 0),
      suspension_status: f.suspension_status,
      suspension_from: f.suspension_from,
      suspension_to: f.suspension_to,
      appeal_authority: f.appeal_authority,
      hr_officer: f.hr_officer,
      incident_date: f.incident_date,
      incident_location: f.incident_location,
      reported_by: f.reported_by,
      committee: f.committee,
      committee_members: (f.committee_members ?? []).filter((s) => s && s.trim().length > 0),
      penalty: f.penalty,
      description: f.description,
      next_hearing: f.next_hearing,
      next_hearing_time: f.next_hearing_time,
      next_stage: f.next_stage,
      hearings: [],
      attachments: (f.attachments ?? []).filter((a) => a.title && a.title.trim().length > 0),

      created_at: new Date().toISOString(),
    });
  };


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Internal Disciplinary Case</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <SectionTitle>Case Basics</SectionTitle>
          <div>
            <Label>Case # (auto)</Label>
            <Input value={f.case_no ?? ""} onChange={(e) => setF({ ...f, case_no: e.target.value })} placeholder="Auto-generated" />
          </div>
          <div>
            <Label>Filed On</Label>
            <Input type="date" value={f.filed_on ?? ""} onChange={(e) => setF({ ...f, filed_on: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Case Title *</Label>
            <Input value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Misuse of company vehicle" />
          </div>
          <StatusField value={f.status ?? "under_investigation"} onChange={(v) => setF({ ...f, status: v })} />
          <div>
            <Label>Incident Date</Label>
            <Input type="date" value={f.incident_date ?? ""} onChange={(e) => setF({ ...f, incident_date: e.target.value })} />
          </div>

          <SectionTitle>Governance & Assignment</SectionTitle>
          <div>
            <Label>Priority</Label>
            <Select value={f.priority ?? ""} onValueChange={(v) => setF({ ...f, priority: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={f.severity ?? ""} onValueChange={(v) => setF({ ...f, severity: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SEVERITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Confidentiality</Label>
            <Select value={f.confidentiality ?? ""} onValueChange={(v) => setF({ ...f, confidentiality: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{CONFIDENTIALITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Risk Exposure</Label>
            <Select value={f.risk_exposure ?? ""} onValueChange={(v) => setF({ ...f, risk_exposure: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{RISK_LEVELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>HR Officer</Label>
            <Input value={f.hr_officer ?? ""} onChange={(e) => setF({ ...f, hr_officer: e.target.value })} placeholder="Name of HR case owner" />
          </div>
          <div>
            <Label>Appeal Authority</Label>
            <Input value={f.appeal_authority ?? ""} onChange={(e) => setF({ ...f, appeal_authority: e.target.value })} placeholder="e.g. Managing Director" />
          </div>

          <SectionTitle>Employee & Reporting</SectionTitle>
          <div className="col-span-2">
            <Label>Employee *</Label>
            <Select
              value={f.employee_id ? String(f.employee_id) : ""}
              onValueChange={(v) => {
                const emp = employees.find((e: any) => String(e.id) === v);
                setF({
                  ...f,
                  employee_id: Number(v),
                  employee_name: emp?.name,
                  employee_designation: emp?.designation ?? emp?.position,
                  employee_department: emp?.department,
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name} — {e.department ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Designation</Label>
            <Input value={f.employee_designation ?? ""} onChange={(e) => setF({ ...f, employee_designation: e.target.value })} />
          </div>
          <div>
            <Label>Department</Label>
            <Input value={f.employee_department ?? ""} onChange={(e) => setF({ ...f, employee_department: e.target.value })} />
          </div>
          <div>
            <Label>Reported By</Label>
            <Input value={f.reported_by ?? ""} onChange={(e) => setF({ ...f, reported_by: e.target.value })} placeholder="Name / Designation of complainant" />
          </div>
          <div>
            <Label>Incident Location</Label>
            <Input value={f.incident_location ?? ""} onChange={(e) => setF({ ...f, incident_location: e.target.value })} placeholder="e.g. HO Meeting Room 2" />
          </div>
          <div className="col-span-2">
            <Label>Allegation</Label>
            <Textarea rows={2} value={f.allegation ?? ""} onChange={(e) => setF({ ...f, allegation: e.target.value })} placeholder="What is the employee accused of?" />
          </div>
          <div className="col-span-2">
            <Label>Policy / Rule Violated</Label>
            <Input value={f.policy_violated ?? ""} onChange={(e) => setF({ ...f, policy_violated: e.target.value })} placeholder="e.g. Code of Conduct §4.2 — Unauthorized Data Access" />
          </div>
          <div className="col-span-2">
            <Label>Previous Offences / Record</Label>
            <Textarea rows={2} value={f.previous_offences ?? ""} onChange={(e) => setF({ ...f, previous_offences: e.target.value })} placeholder="Any prior warnings / disciplinary actions" />
          </div>
          <div className="col-span-2">
            <Label>Witnesses</Label>
            <MultiText
              values={f.witnesses ?? [""]}
              onChange={(v) => setF({ ...f, witnesses: v })}
              placeholder="Witness name & designation"
            />
          </div>

          <SectionTitle>Suspension</SectionTitle>
          <div>
            <Label>Suspension Status</Label>
            <Select value={f.suspension_status ?? ""} onValueChange={(v) => setF({ ...f, suspension_status: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SUSPENSION_STATES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div />
          <div>
            <Label>Suspension From</Label>
            <Input type="date" value={f.suspension_from ?? ""} onChange={(e) => setF({ ...f, suspension_from: e.target.value })} />
          </div>
          <div>
            <Label>Suspension To</Label>
            <Input type="date" value={f.suspension_to ?? ""} onChange={(e) => setF({ ...f, suspension_to: e.target.value })} />
          </div>

          <SectionTitle>Committee</SectionTitle>
          <div>
            <Label>Committee Name</Label>
            <Input value={f.committee ?? ""} onChange={(e) => setF({ ...f, committee: e.target.value })} placeholder="e.g. HR Disciplinary Committee" />
          </div>
          <div>
            <Label>Proposed Penalty</Label>
            <Input value={f.penalty ?? ""} onChange={(e) => setF({ ...f, penalty: e.target.value })} placeholder="Warning / Fine / Suspension / Termination" />
          </div>
          <div className="col-span-2">
            <Label>Committee Members</Label>
            <MultiText
              values={f.committee_members ?? [""]}
              onChange={(v) => setF({ ...f, committee_members: v })}
              placeholder="Member name & designation"
            />
          </div>


          <SectionTitle>Next Hearing</SectionTitle>
          <div>
            <Label>Next Hearing Date</Label>
            <Input type="date" value={f.next_hearing ?? ""} onChange={(e) => setF({ ...f, next_hearing: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={f.next_hearing_time ?? ""} onChange={(e) => setF({ ...f, next_hearing_time: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Expected Stage</Label>
            <Input list="int-stages" value={f.next_stage ?? ""} onChange={(e) => setF({ ...f, next_stage: e.target.value })} placeholder="e.g. Committee Hearing" />
            <datalist id="int-stages">{INTERNAL_STAGES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>

          <SectionTitle>Attachments</SectionTitle>
          <AttachmentsBlock attachments={f.attachments ?? []} onChange={(a) => setF({ ...f, attachments: a })} />

          <SectionTitle>Background</SectionTitle>
          <div className="col-span-2">
            <Label>Description / Background</Label>
            <Textarea rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Save Case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Hearing dialog
// ============================================================

function HearingDialog({
  open, onOpenChange, onSave, stages,
}: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (h: CaseHearing) => void; stages: string[] }) {
  const [h, setH] = useState<CaseHearing>({ date: new Date().toISOString().slice(0, 10) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Hearing / Status Update</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Hearing Date *</Label>
            <Input type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={h.time ?? ""} onChange={(e) => setH({ ...h, time: e.target.value })} />
          </div>
          <div>
            <Label>Stage</Label>
            <Input list="hearing-stages" value={h.stage ?? ""} onChange={(e) => setH({ ...h, stage: e.target.value })} placeholder="e.g. Framing of Issues" />
            <datalist id="hearing-stages">{stages.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <Label>Venue</Label>
            <Input value={h.venue ?? ""} onChange={(e) => setH({ ...h, venue: e.target.value })} placeholder="Court room / Head Office" />
          </div>
          <div>
            <Label>Judge / Chair Name</Label>
            <Input value={h.judge_name ?? ""} onChange={(e) => setH({ ...h, judge_name: e.target.value })} placeholder="e.g. Hon. Justice XYZ" />
          </div>
          <div>
            <Label>Recorded By</Label>
            <Input value={h.recorded_by ?? ""} onChange={(e) => setH({ ...h, recorded_by: e.target.value })} placeholder="Your name" />
          </div>
          <div className="col-span-2">
            <Label>Remarks by Judge / Chair</Label>
            <Textarea rows={2} value={h.judge_remarks ?? ""} onChange={(e) => setH({ ...h, judge_remarks: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Our Argument / Submission</Label>
            <Textarea rows={2} value={h.our_argument ?? ""} onChange={(e) => setH({ ...h, our_argument: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Outcome / Order</Label>
            <Textarea rows={2} value={h.outcome ?? ""} onChange={(e) => setH({ ...h, outcome: e.target.value })} placeholder="e.g. Adjourned for evidence; Stay granted; Bail rejected; ..." />
          </div>

          <div className="col-span-2 pt-2 border-t">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Schedule Next Hearing</h5>
          </div>
          <div>
            <Label>Next Date</Label>
            <Input type="date" value={h.next_date ?? ""} onChange={(e) => setH({ ...h, next_date: e.target.value })} />
          </div>
          <div>
            <Label>Next Time</Label>
            <Input type="time" value={h.next_time ?? ""} onChange={(e) => setH({ ...h, next_time: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Next Stage</Label>
            <Input list="hearing-stages" value={h.next_stage ?? ""} onChange={(e) => setH({ ...h, next_stage: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (!h.date) return; onSave(h); setH({ date: new Date().toISOString().slice(0, 10) }); }}>Save Hearing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Readonly lawyer render (in view dialog)
// ============================================================

function LawyerReadonly({ title, list }: { title: string; list: Lawyer[] }) {
  if (!list || list.length === 0) {
    return (
      <div className="col-span-2 text-sm">
        <span className="text-muted-foreground">{title}:</span> —
      </div>
    );
  }
  return (
    <div className="col-span-2 text-sm">
      <div className="text-muted-foreground mb-1">{title}:</div>
      <div className="space-y-2">
        {list.map((l, i) => (
          <div key={i} className="border rounded p-2 text-xs bg-muted/20">
            <div className="font-medium text-sm">{l.name}{l.firm ? ` — ${l.firm}` : ""}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
              {l.contact && <div>📞 {l.contact}</div>}
              {l.email && <div>✉ {l.email}</div>}
              {l.cnic && <div>CNIC: {l.cnic}</div>}
              {l.license_no && <div>License: {l.license_no}</div>}
              {l.address && <div className="col-span-2">🏠 {l.address}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseStatusSearch({
  cases, search, setSearch, onView, onJumpTab,
}: {
  cases: Case[];
  search: string;
  setSearch: (v: string) => void;
  onView: (c: Case) => void;
  onJumpTab: (t: CaseType) => void;
}) {
  const q = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [] as Case[];
    return cases.filter((c) => {
      const hay = [
        c.case_no, c.title, c.status, c.category, c.court, c.city, c.province,
        c.employee_name, c.committee, c.suit_no, c.diary_no, c.next_stage,
        partiesLabel(c),
        ...(c.opposing_parties ?? []),
        ...(c.tags ?? []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0, 25);
  }, [cases, q]);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" /> Case Status Lookup
          <Badge variant="outline" className="ml-2 font-normal">Search across all cases</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Case #, title, party, court, employee, status…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              aria-label="Clear"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {q && (
          <div className="mt-3 border rounded-md divide-y max-h-80 overflow-auto">
            {results.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">No cases match "{search}".</div>
            ) : results.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs">{c.case_no}</span>
                    <span className="font-medium truncate">{c.title}</span>
                    <Badge variant="outline" className="text-[10px]">{TYPE_META[c.type].label}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.type === "internal" ? (c.employee_name ?? "—") : partiesLabel(c)}
                    {c.court ? ` • ${c.court}` : ""}
                    {c.next_hearing ? ` • Next: ${c.next_hearing}${c.next_hearing_time ? " " + c.next_hearing_time : ""}` : ""}
                  </div>
                </div>
                <Badge className={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                <Button size="sm" variant="ghost" onClick={() => { onJumpTab(c.type); onView(c); }}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
