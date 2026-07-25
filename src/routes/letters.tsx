import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, Printer, Eye, RotateCcw, FilePlus2,
  UserRoundCog, Users, Bell, FileSignature, Search, Copy, Sparkles,
  AlertTriangle, History, Save, X,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LETTER_TEMPLATES, fillTemplate, type LetterTemplate } from "@/lib/letter-templates";
import type { LetterhaedPdfOptions } from "@/lib/letterhead-pdf";
import { resources, type Employee } from "@/lib/api";
import { generatedDocs, categoryFromTemplate, type GeneratedDoc } from "@/lib/generated-docs";

const letterheadPdf = () => import("@/lib/letterhead-pdf");

export const Route = createFileRoute("/letters")({
  head: () => ({ meta: [{ title: "Document Center — Devionic DMS" }] }),
  component: LettersPage,
});

type Category = "all" | "hr" | "client" | "notification";

const CAT_LABEL: Record<Exclude<Category, "all">, string> = {
  hr: "HR Letters",
  client: "Client Documents",
  notification: "Notifications",
};

const CAT_ICON: Record<LetterTemplate["category"], any> = {
  hr: Users,
  client: UserRoundCog,
  notification: Bell,
};

type SignatoryPreset = { name: string; title: string };
const SIGNATORY_PRESETS: SignatoryPreset[] = [
  { name: "Muhammad Bilal",  title: "Chief Executive Officer" },
  { name: "Ayesha Malik",    title: "Head of Human Resources" },
  { name: "Umer Khan",       title: "Chief Operating Officer" },
  { name: "Faisal Rehman",   title: "Chief Financial Officer" },
  { name: "Sana Iqbal",      title: "Company Secretary" },
  { name: "Zainab Qureshi",  title: "Legal & Compliance Manager" },
];

function todayGB() {
  return new Date().toLocaleDateString("en-GB");
}

function nextRefNo(id: string) {
  const y = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 900 + 100);
  return `DEV/${id.toUpperCase().slice(0, 3)}/${y}/${seq}`;
}

// Local clients (from Clients & CRM)
type ClientLite = { id: number; name: string; company?: string; address?: string; city?: string; province?: string; ntn?: string; strn?: string; email?: string; phone?: string; stage?: string };
function readClients(): ClientLite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("dms:clients_v2");
    return raw ? (JSON.parse(raw) as ClientLite[]) : [];
  } catch { return []; }
}

function draftKey(templateId: string) {
  return `dms:letter_draft:${templateId}`;
}

function LettersPage() {
  const [category, setCategory] = useState<Category>("all");
  const [templateId, setTemplateId] = useState<string>(LETTER_TEMPLATES[0].id);
  const [templateQuery, setTemplateQuery] = useState("");

  const template = useMemo(
    () => LETTER_TEMPLATES.find((t) => t.id === templateId) ?? LETTER_TEMPLATES[0],
    [templateId],
  );

  const emps = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const employees = emps.data ?? [];

  const clients = useMemo(() => readClients(), [templateId]);

  const [refNo, setRefNo] = useState(() => nextRefNo(template.id));
  const [dateStr, setDateStr] = useState(todayGB());
  const [subject, setSubject] = useState(template.subject);
  const [recipient, setRecipient] = useState("");
  const [salutation, setSalutation] = useState("");
  const [body, setBody] = useState(template.body);
  const [closing, setClosing] = useState(template.closing ?? "For Devionic (Private) Limited");
  const [signatoryName, setSignatoryName] = useState("Muhammad Bilal");
  const [signatoryTitle, setSignatoryTitle] = useState("Chief Executive Officer");
  const [pickedEmpId, setPickedEmpId] = useState<string>("");
  const [pickedClientId, setPickedClientId] = useState<string>("");

  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<GeneratedDoc[]>(() => generatedDocs.list());

  useEffect(() => {
    const refresh = () => setRecent(generatedDocs.list());
    window.addEventListener("dms:generated_docs:changed", refresh as EventListener);
    return () => window.removeEventListener("dms:generated_docs:changed", refresh as EventListener);
  }, []);

  // Reset editable state when template changes (with draft restore).
  useEffect(() => {
    const draftRaw = typeof window !== "undefined" ? window.localStorage.getItem(draftKey(template.id)) : null;
    if (draftRaw) {
      try {
        const d = JSON.parse(draftRaw);
        setSubject(d.subject ?? template.subject);
        setBody(d.body ?? template.body);
        setClosing(d.closing ?? template.closing ?? "For Devionic (Private) Limited");
        setRefNo(d.refNo ?? nextRefNo(template.id));
        setSalutation(d.salutation ?? defaultSalutation(template));
        setRecipient(d.recipient ?? defaultRecipient(template));
        setValues(d.values ?? {});
        setSignatoryName(d.signatoryName ?? "Muhammad Bilal");
        setSignatoryTitle(d.signatoryTitle ?? "Chief Executive Officer");
        setPickedEmpId("");
        setPickedClientId("");
        return;
      } catch { /* fallthrough */ }
    }
    setSubject(template.subject);
    setBody(template.body);
    setClosing(template.closing ?? "For Devionic (Private) Limited");
    setRefNo(nextRefNo(template.id));
    setSalutation(defaultSalutation(template));
    setRecipient(defaultRecipient(template));
    setValues({});
    setPickedEmpId("");
    setPickedClientId("");
  }, [template]);

  // Autosave draft per template (debounced).
  useEffect(() => {
    const h = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(template.id), JSON.stringify({
          refNo, subject, recipient, salutation, body, closing,
          signatoryName, signatoryTitle, values,
        }));
      } catch { /* noop */ }
    }, 500);
    return () => clearTimeout(h);
  }, [template.id, refNo, subject, recipient, salutation, body, closing, signatoryName, signatoryTitle, values]);

  const filtered = useMemo(() => {
    const base = category === "all" ? LETTER_TEMPLATES : LETTER_TEMPLATES.filter((t) => t.category === category);
    if (!templateQuery.trim()) return base;
    const q = templateQuery.toLowerCase();
    return base.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q),
    );
  }, [category, templateQuery]);

  const setValue = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const loadEmployee = (id: string) => {
    setPickedEmpId(id);
    const e = employees.find((x) => String(x.id) === id) as Employee | undefined;
    if (!e) return;
    setValues((s) => ({
      ...s,
      employee_name: e.name ?? "",
      father_name: (e as any).father_husband_name ?? "",
      cnic: e.cnic ?? "",
      designation: (e as any).position ?? "",
      department: e.department ?? "",
      join_date: (e as any).join_date ?? "",
    }));
    toast.success(`Loaded ${e.name}`);
  };

  const loadClient = (id: string) => {
    setPickedClientId(id);
    const c = clients.find((x) => String(x.id) === id);
    if (!c) return;
    setValues((s) => ({
      ...s,
      client_name: c.name ?? "",
      client_company: c.company ?? "",
      client_address: [c.address, c.city, c.province].filter(Boolean).join(", "),
      client_email: c.email ?? "",
      client_phone: c.phone ?? "",
      client_ntn: c.ntn ?? "",
      client_strn: c.strn ?? "",
    }));
    toast.success(`Loaded ${c.company || c.name}`);
  };

  const applySignatoryPreset = (idx: string) => {
    const p = SIGNATORY_PRESETS[Number(idx)];
    if (!p) return;
    setSignatoryName(p.name);
    setSignatoryTitle(p.title);
  };

  const buildOpts = (): LetterhaedPdfOptions => {
    const merged = { ...values, date: dateStr };
    const rec = fillTemplate(recipient, merged)
      .split("\n").map((s) => s.trim()).filter(Boolean);
    return {
      refNo,
      date: dateStr,
      subject: fillTemplate(subject, merged),
      recipientLines: rec,
      salutation: fillTemplate(salutation, merged),
      body: fillTemplate(body, merged),
      closing,
      signatoryName,
      signatoryTitle,
    };
  };

  // Detect any leftover {{token}} in what will be printed.
  const unresolvedTokens = useMemo(() => {
    const opts = buildOpts();
    const src = [opts.subject, opts.salutation, opts.body, ...(opts.recipientLines ?? [])].join("\n");
    const set = new Set<string>();
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) set.add(m[1]);
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, subject, salutation, body, recipient, dateStr]);

  const registerGenerated = (opts: LetterhaedPdfOptions) => {
    try {
      generatedDocs.add({
        doc_no: opts.refNo || refNo,
        title: opts.subject || template.name,
        template_id: template.id,
        template_name: template.name,
        category: categoryFromTemplate(template.category),
        party: opts.recipientLines?.[0] ?? values.client_name ?? values.employee_name ?? "",
        owner: opts.signatoryName || signatoryName,
        signatory_title: opts.signatoryTitle || signatoryTitle,
        date: opts.date || dateStr,
        opts,
      });
    } catch { /* noop */ }
  };

  const runPreview = async () => {
    setBusy(true);
    try {
      if (preview) URL.revokeObjectURL(preview);
      const { previewLetterheadUrl } = await letterheadPdf();
      const url = await previewLetterheadUrl(buildOpts());
      setPreview(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate preview");
    } finally {
      setBusy(false);
    }
  };

  const runDownload = async () => {
    setBusy(true);
    try {
      const name = values.employee_name || values.client_name || template.name;
      const opts = buildOpts();
      const { downloadLetterhead } = await letterheadPdf();
      await downloadLetterhead(`${template.id}_${name}`, opts);
      registerGenerated(opts);
      toast.success("PDF downloaded & saved to Docs & Records");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to download");
    } finally {
      setBusy(false);
    }
  };

  const runPrint = async () => {
    setBusy(true);
    try {
      const opts = buildOpts();
      const { printLetterhead } = await letterheadPdf();
      await printLetterhead(opts);
      registerGenerated(opts);
    }
    catch (e: any) { toast.error(e?.message ?? "Failed to print"); }
    finally { setBusy(false); }
  };

  const resetBody = () => {
    setSubject(template.subject);
    setBody(template.body);
    setClosing(template.closing ?? "For Devionic (Private) Limited");
    toast.info("Template restored to default");
  };

  const clearDraft = () => {
    try { window.localStorage.removeItem(draftKey(template.id)); } catch { /* noop */ }
    setSubject(template.subject);
    setBody(template.body);
    setClosing(template.closing ?? "For Devionic (Private) Limited");
    setSalutation(defaultSalutation(template));
    setRecipient(defaultRecipient(template));
    setValues({});
    setRefNo(nextRefNo(template.id));
    toast.success("Draft cleared — starting fresh");
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(fillTemplate(body, { ...values, date: dateStr }));
      toast.success("Letter body copied");
    } catch { toast.error("Copy failed"); }
  };

  const reopenGenerated = (r: GeneratedDoc) => {
    setTemplateId(r.template_id);
    // apply after template effect runs
    setTimeout(() => {
      setRefNo(r.opts.refNo || r.doc_no);
      setDateStr(r.opts.date || dateStr);
      setSubject(r.opts.subject || "");
      setRecipient((r.opts.recipientLines ?? []).join("\n"));
      setSalutation(r.opts.salutation ?? "");
      setBody(r.opts.body ?? "");
      setClosing(r.opts.closing ?? "For Devionic (Private) Limited");
      setSignatoryName(r.opts.signatoryName ?? signatoryName);
      setSignatoryTitle(r.opts.signatoryTitle ?? signatoryTitle);
      toast.success(`Reopened ${r.doc_no}`);
    }, 40);
  };

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const stats = [
    { label: "Total Templates", value: LETTER_TEMPLATES.length, hint: "Available letter types", icon: FileText },
    { label: "HR Letters", value: LETTER_TEMPLATES.filter((t) => t.category === "hr").length, hint: "Offer / appointment / experience", icon: Users },
    { label: "Client Documents", value: LETTER_TEMPLATES.filter((t) => t.category === "client").length, hint: "Contracts & NDAs", icon: FileSignature },
    { label: "Generated", value: recent.length, hint: "Saved to Docs & Records", icon: Sparkles },
  ];

  const recentForTemplate = recent.slice(0, 6);

  return (
    <AppLayout>
      <PageHeader
        title="Document Center"
        description="Generate letters on Devionic letterhead — offer, appointment, agreement, experience, contracts and notifications. Edit any text before download."
      />
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        {/* Template picker */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FilePlus2 className="h-4 w-4 text-primary" /> Choose a template
              </CardTitle>
              <CardDescription>Pick a letter type to start.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search templates…"
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                />
              </div>
              <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="hr">HR</TabsTrigger>
                  <TabsTrigger value="client">Client</TabsTrigger>
                  <TabsTrigger value="notification">Notice</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
                {filtered.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3 text-center">
                    No templates match “{templateQuery}”.
                  </div>
                )}
                {filtered.map((t) => {
                  const Icon = CAT_ICON[t.category];
                  const active = t.id === templateId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={`w-full text-left rounded-lg border p-3 transition ${
                        active ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/60 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-semibold">{t.name}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] capitalize">
                          {CAT_LABEL[t.category]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent generated */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Recent letters
              </CardTitle>
              <CardDescription>Click to reopen and re-generate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {recentForTemplate.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">No letters generated yet.</div>
              )}
              {recentForTemplate.map((r) => (
                <button
                  key={r.id}
                  onClick={() => reopenGenerated(r)}
                  className="w-full text-left rounded-md border p-2 hover:border-primary/60 hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{r.doc_no}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{r.template_name}</Badge>
                  </div>
                  <div className="text-xs font-medium truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.party || "—"} · {r.date}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> {template.name}
                </CardTitle>
                <CardDescription>
                  Fill in the fields, then edit the letter body freely. Uses <span className="font-medium">{"{{field_name}}"}</span> tokens.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Save className="h-3.5 w-3.5" /> Draft auto-saves in this browser
                <Button variant="ghost" size="sm" onClick={clearDraft} className="h-7 text-xs">
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Reference No.</Label>
                <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} />
              </div>
              <div>
                <Label>Date</Label>
                <Input value={dateStr} onChange={(e) => setDateStr(e.target.value)} placeholder="DD/MM/YYYY" />
              </div>
              {template.category === "hr" && (
                <div>
                  <Label>Load from employee</Label>
                  <Select value={pickedEmpId} onValueChange={loadEmployee}>
                    <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                      ))}
                      {!employees.length && <div className="p-2 text-xs text-muted-foreground">No employees yet</div>}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {template.category === "client" && (
                <div>
                  <Label>Load from client</Label>
                  <Select value={pickedClientId} onValueChange={loadClient}>
                    <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.company || c.name}{c.stage ? ` · ${c.stage}` : ""}
                        </SelectItem>
                      ))}
                      {!clients.length && <div className="p-2 text-xs text-muted-foreground">No clients yet</div>}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Merge fields */}
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Merge fields</Label>
              <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {template.fields.map((f) => (
                  <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                    <Label>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                      {f.required && !values[f.name] && (
                        <span className="ml-2 text-[10px] font-normal text-destructive/80">required</span>
                      )}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        rows={3}
                        placeholder={f.placeholder}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      />
                    ) : (
                      <Input
                        type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                        placeholder={f.placeholder}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Letter body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Recipient block (one line each)</Label>
                <Textarea rows={4} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>
              <div>
                <Label>Salutation</Label>
                <Textarea rows={4} value={salutation} onChange={(e) => setSalutation(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Letter body</Label>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={copyBody} className="h-7 text-xs">
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetBody} className="h-7 text-xs">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore template
                  </Button>
                </div>
              </div>
              <Textarea
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-[13px] leading-relaxed"
              />
            </div>

            {/* Signatory */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Closing</Label>
                <Input value={closing} onChange={(e) => setClosing(e.target.value)} />
              </div>
              <div>
                <Label>Signatory preset</Label>
                <Select onValueChange={applySignatoryPreset}>
                  <SelectTrigger><SelectValue placeholder="Quick pick" /></SelectTrigger>
                  <SelectContent>
                    {SIGNATORY_PRESETS.map((p, i) => (
                      <SelectItem key={p.name} value={String(i)}>
                        {p.name} — {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Signatory name</Label>
                <Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
              </div>
              <div>
                <Label>Signatory title</Label>
                <Input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} />
              </div>
            </div>

            {/* Unresolved tokens warning */}
            {unresolvedTokens.length > 0 && (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  Unfilled placeholders — these will print as-is:
                  <div className="mt-1 flex flex-wrap gap-1">
                    {unresolvedTokens.map((t) => (
                      <Badge key={t} variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200 text-[10px]">
                        {`{{${t}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button onClick={runPreview} variant="outline" disabled={busy}>
                <Eye className="h-4 w-4 mr-2" /> Preview
              </Button>
              <Button onClick={runDownload} disabled={busy}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              <Button onClick={runPrint} variant="secondary" disabled={busy}>
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              {busy && <span className="text-xs text-muted-foreground self-center">Generating…</span>}
            </div>

            {preview && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-xs flex items-center justify-between">
                  <span className="font-medium">Preview</span>
                  <a href={preview} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Open in new tab
                  </a>
                </div>
                <iframe src={preview} className="w-full" style={{ height: 720 }} title="Letter preview" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function defaultSalutation(t: LetterTemplate) {
  return t.category === "hr"
    ? "Dear {{employee_name}},"
    : t.category === "client"
      ? "Dear {{client_name}},"
      : "";
}
function defaultRecipient(t: LetterTemplate) {
  return t.category === "hr"
    ? "{{employee_name}}\n{{designation}}\nDevionic (Private) Limited"
    : t.category === "client"
      ? "{{client_name}}\n{{client_address}}"
      : "";
}
