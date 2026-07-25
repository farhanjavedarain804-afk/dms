import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Plus, Search, Pencil, Trash2, Download, Award, Users, CheckCircle2, Clock, FileText, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { toast } from "sonner";

const internFormPdf = () => import("@/lib/intern-form-pdf");
const internCertificatePdf = () => import("@/lib/intern-certificate-pdf");
const internTerminationPdf = () => import("@/lib/intern-termination-pdf");

export const Route = createFileRoute("/interns")({
  head: () => ({ meta: [{ title: "Interns Management — Devionic" }] }),
  component: InternsPage,
});

type InternStatus = "Applied" | "Active" | "Completed" | "Terminated";

type Intern = {
  id: string;
  intern_code: string;
  name: string;
  father_name?: string;
  cnic?: string;
  email?: string;
  phone?: string;
  address?: string;
  university?: string;
  degree?: string;
  semester?: string;
  cgpa?: string;
  department: string;
  supervisor?: string;
  start_date: string;
  end_date: string;
  duration_weeks?: number;
  stipend?: number;
  status: InternStatus;
  project_assigned?: string;
  skills?: string;
  performance_rating?: number; // 1-5
  attendance_pct?: number;
  certificate_issued?: boolean;
  emergency_contact?: string;
  referred_by?: string;
  notes?: string;
  created_at: string;
};

const KEY = "devionic.interns.v1";
const SEED_KEY = "devionic.interns.v1.seeded";

function load(): Intern[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(rows: Intern[]) { localStorage.setItem(KEY, JSON.stringify(rows)); }

const DEPARTMENTS = ["Software Engineering", "Web Development", "Mobile Development", "AI / ML", "Graphic Design", "Digital Marketing", "HR", "Finance", "Sales", "Content Writing", "SEO", "Cybersecurity"];

const empty: Intern = {
  id: "",
  intern_code: "",
  name: "",
  department: "Software Engineering",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  status: "Applied",
  created_at: new Date().toISOString(),
};

function seedDummy(): Intern[] {
  const y = new Date().getFullYear();
  const iso = (offsetDays: number) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10);
  };
  const mk = (n: number, o: Partial<Intern>): Intern => ({
    ...empty,
    id: crypto.randomUUID(),
    intern_code: `INT-${y}-${String(n).padStart(3, "0")}`,
    created_at: new Date().toISOString(),
    ...o,
  } as Intern);
  return [
    mk(1, { name: "Ahmed Raza", father_name: "Muhammad Raza", cnic: "32304-1234567-1", email: "ahmed.raza@student.uet.edu.pk", phone: "+92-300-1234567", address: "House 45, Model Town, Lahore", university: "UET Lahore", degree: "BSCS", semester: "6th", cgpa: "3.65", department: "Software Engineering", supervisor: "Bilal Hassan", start_date: iso(-40), end_date: iso(50), duration_weeks: 12, stipend: 25000, status: "Active", project_assigned: "Devionic ERP — HR Module", skills: "React, TypeScript, PostgreSQL", performance_rating: 4, attendance_pct: 95, emergency_contact: "+92-321-9876543" }),
    mk(2, { name: "Ayesha Siddiqui", father_name: "Tariq Siddiqui", cnic: "35202-7654321-2", email: "ayesha.s@ucp.edu.pk", phone: "+92-333-2233445", address: "Flat 12-B, Johar Town, Lahore", university: "UCP Lahore", degree: "BS Software Engineering", semester: "7th", cgpa: "3.82", department: "Web Development", supervisor: "Sana Malik", start_date: iso(-30), end_date: iso(60), duration_weeks: 12, stipend: 22000, status: "Active", project_assigned: "Devionic Portal Redesign", skills: "Next.js, Tailwind, Figma", performance_rating: 5, attendance_pct: 98, emergency_contact: "+92-300-4567890" }),
    mk(3, { name: "Hamza Iqbal", father_name: "Iqbal Ahmed", cnic: "36302-9988776-3", email: "hamza.iqbal@nu.edu.pk", phone: "+92-345-6677889", address: "Street 7, Bahadurabad, Multan", university: "FAST NUCES Multan", degree: "BSCS", semester: "5th", cgpa: "3.40", department: "AI / ML", supervisor: "Dr. Faisal Khan", start_date: iso(-20), end_date: iso(70), duration_weeks: 12, stipend: 20000, status: "Applied", project_assigned: "Customer Churn Prediction", skills: "Python, TensorFlow, Pandas", emergency_contact: "+92-301-1122334" }),
    mk(4, { name: "Fatima Noor", father_name: "Noor Ahmad", cnic: "31101-4567123-4", email: "fatima.noor@gmail.com", phone: "+92-312-9988776", address: "Block C, Wapda Town, Layyah", university: "BZU Multan", degree: "BBA (Marketing)", semester: "6th", cgpa: "3.55", department: "Digital Marketing", supervisor: "Zainab Farooq", start_date: iso(-120), end_date: iso(-30), duration_weeks: 12, stipend: 18000, status: "Completed", project_assigned: "Q3 Social Media Campaign", skills: "SEO, Meta Ads, Canva", performance_rating: 4, attendance_pct: 92, certificate_issued: true, emergency_contact: "+92-322-3344556" }),
    mk(5, { name: "Bilal Sheikh", father_name: "Sheikh Rasheed", cnic: "34101-1029384-5", email: "bilal.sheikh@pucit.edu.pk", phone: "+92-321-4455667", address: "House 88, Township, Lahore", university: "PUCIT Lahore", degree: "BSIT", semester: "8th", cgpa: "3.10", department: "Cybersecurity", supervisor: "Umar Farooq", start_date: iso(-60), end_date: iso(-10), duration_weeks: 8, stipend: 20000, status: "Terminated", project_assigned: "Internal VAPT Assessment", skills: "Kali Linux, Burp Suite", performance_rating: 2, attendance_pct: 62, notes: "Terminated for repeated absence and confidentiality breach.", emergency_contact: "+92-333-7788990" }),
    mk(6, { name: "Zara Khan", father_name: "Khan Muhammad", cnic: "33100-5566778-6", email: "zara.khan@lums.edu.pk", phone: "+92-300-5566778", address: "DHA Phase 5, Lahore", university: "LUMS", degree: "BS Computer Science", semester: "7th", cgpa: "3.90", department: "Mobile Development", supervisor: "Ali Raza", start_date: iso(-15), end_date: iso(75), duration_weeks: 13, stipend: 30000, status: "Active", project_assigned: "Devionic Mobile App (Flutter)", skills: "Flutter, Dart, Firebase", performance_rating: 5, attendance_pct: 100, emergency_contact: "+92-345-1122334" }),
    mk(7, { name: "Usman Ali", father_name: "Ali Akbar", cnic: "36104-2233445-7", email: "usman.ali@iub.edu.pk", phone: "+92-311-3344556", address: "Satellite Town, Bahawalpur", university: "IUB Bahawalpur", degree: "BS Graphic Design", semester: "6th", cgpa: "3.45", department: "Graphic Design", supervisor: "Sana Malik", start_date: iso(5), end_date: iso(95), duration_weeks: 12, stipend: 18000, status: "Applied", project_assigned: "Brand Kit v2", skills: "Illustrator, Photoshop, Figma", emergency_contact: "+92-300-9988776" }),
    mk(8, { name: "Mariyam Zafar", father_name: "Zafar Iqbal", cnic: "35201-8877665-8", email: "mariyam.zafar@fccollege.edu.pk", phone: "+92-322-6677889", address: "Gulberg III, Lahore", university: "FC College Lahore", degree: "BBA (HRM)", semester: "5th", cgpa: "3.70", department: "HR", supervisor: "Head of HR", start_date: iso(-90), end_date: iso(0), duration_weeks: 13, stipend: 18000, status: "Completed", project_assigned: "HR Policy Documentation", skills: "Recruitment, Excel, HRIS", performance_rating: 4, attendance_pct: 96, certificate_issued: true, emergency_contact: "+92-333-2211223" }),
  ];
}

function InternsPage() {
  const [rows, setRows] = useState<Intern[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Intern>(empty);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | InternStatus>("all");

  useEffect(() => {
    let data = load();
    if (data.length === 0 && !localStorage.getItem(SEED_KEY)) {
      data = seedDummy();
      save(data);
      localStorage.setItem(SEED_KEY, "1");
    }
    setRows(data);
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== "all") r = r.filter(x => x.status === tab);
    const s = q.trim().toLowerCase();
    if (s) r = r.filter(x =>
      x.name.toLowerCase().includes(s) ||
      x.intern_code.toLowerCase().includes(s) ||
      (x.university || "").toLowerCase().includes(s) ||
      (x.department || "").toLowerCase().includes(s)
    );
    return r;
  }, [rows, q, tab]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.status === "Active").length,
    completed: rows.filter(r => r.status === "Completed").length,
    applied: rows.filter(r => r.status === "Applied").length,
    certificates: rows.filter(r => r.certificate_issued).length,
  }), [rows]);

  const openNew = () => {
    const code = `INT-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    setEditing({ ...empty, id: crypto.randomUUID(), intern_code: code, created_at: new Date().toISOString() });
    setOpen(true);
  };
  const openEdit = (r: Intern) => { setEditing({ ...r }); setOpen(true); };

  const submit = () => {
    if (!editing.name.trim()) { toast.error("Name required"); return; }
    const next = rows.some(r => r.id === editing.id)
      ? rows.map(r => r.id === editing.id ? editing : r)
      : [editing, ...rows];
    save(next); setRows(next); setOpen(false);
    toast.success("Intern saved");
  };

  const remove = (id: string) => {
    if (!confirm("Delete intern?")) return;
    const next = rows.filter(r => r.id !== id);
    save(next); setRows(next);
    toast.success("Deleted");
  };

  const exportCsv = () => {
    const cols = ["intern_code", "name", "department", "university", "supervisor", "start_date", "end_date", "status", "stipend", "performance_rating", "certificate_issued"];
    const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify((r as any)[c] ?? "")).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "interns.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s: InternStatus) => {
    const map: Record<InternStatus, string> = {
      Applied: "bg-blue-100 text-blue-700",
      Active: "bg-emerald-100 text-emerald-700",
      Completed: "bg-violet-100 text-violet-700",
      Terminated: "bg-rose-100 text-rose-700",
    };
    return <Badge className={map[s]}>{s}</Badge>;
  };

  return (
    <AppLayout>
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" /> Interns Management</h1>
          <p className="text-sm text-muted-foreground">Manage internship applications, active interns, and certifications.</p>
        </div>
        <div className="flex gap-2">
          <ModuleReportButton
            build={() => ({
              module: "interns",
              moduleLabel: "Interns Management",
              title: "Interns Management Report",
              subtitle: `${rows.length} intern(s)`,
              sections: [{
                title: "Interns",
                columns: [
                  { key: "name", label: "Name" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "department", label: "Department" },
                  { key: "start_date", label: "Start" },
                  { key: "end_date", label: "End" },
                  { key: "status", label: "Status" },
                ],
                rows,
              }],
            })}
          />
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Intern</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, tint: "text-primary" },
          { label: "Active", value: stats.active, icon: CheckCircle2, tint: "text-emerald-600" },
          { label: "Applied", value: stats.applied, icon: Clock, tint: "text-blue-600" },
          { label: "Completed", value: stats.completed, icon: GraduationCap, tint: "text-violet-600" },
          { label: "Certificates", value: stats.certificates, icon: Award, tint: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
                  <div className="text-2xl font-bold mt-1">{s.value}</div>
                </div>
                <s.icon className={`h-8 w-8 ${s.tint} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Interns</CardTitle>
            <div className="relative w-72">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name, code, university…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
              <TabsTrigger value="Applied">Applied ({stats.applied})</TabsTrigger>
              <TabsTrigger value="Active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="Completed">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="Terminated">Terminated</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Stipend</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No interns yet.</TableCell></TableRow>
                    )}
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.intern_code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                        </TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell className="text-sm">{r.university || "—"}</TableCell>
                        <TableCell className="text-sm">{r.supervisor || "—"}</TableCell>
                        <TableCell className="text-xs">{r.start_date} → {r.end_date || "—"}</TableCell>
                        <TableCell>{r.stipend ? `PKR ${r.stipend.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{r.performance_rating ? `${r.performance_rating}/5` : "—"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" title="Application PDF" onClick={async () => {
                              try {
                                const { downloadInternForm } = await internFormPdf();
                                await downloadInternForm(r);
                                toast.success("Application PDF downloaded");
                              } catch { toast.error("PDF failed"); }
                            }}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Completion Certificate" onClick={async () => {
                              try {
                                const { downloadInternCertificate } = await internCertificatePdf();
                                await downloadInternCertificate(r);
                                toast.success("Certificate downloaded");
                              } catch { toast.error("PDF failed"); }
                            }}>
                              <Award className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Termination Letter" onClick={async () => {
                              const reason = window.prompt("Reason for termination (optional — leave blank for default):", "") || "";
                              try {
                                const { downloadInternTerminationLetter } = await internTerminationPdf();
                                await downloadInternTerminationLetter({ ...r, reason });
                                const next = rows.map(x => x.id === r.id ? { ...x, status: "Terminated" as InternStatus, notes: reason ? `Terminated: ${reason}` : (x.notes || "Terminated") } : x);
                                save(next); setRows(next);
                                toast.success("Termination letter generated & saved to Docs & Records");
                              } catch { toast.error("PDF failed"); }
                            }}>
                              <Ban className="h-4 w-4 text-rose-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{rows.some(r => r.id === editing.id) ? "Edit Intern" : "New Intern"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Intern Code</Label><Input value={editing.intern_code} onChange={(e) => setEditing({ ...editing, intern_code: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as InternStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Applied", "Active", "Completed", "Terminated"] as InternStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Full Name *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Father Name</Label><Input value={editing.father_name || ""} onChange={(e) => setEditing({ ...editing, father_name: e.target.value })} /></div>
            <div><Label>CNIC</Label><Input value={editing.cnic || ""} onChange={(e) => setEditing({ ...editing, cnic: e.target.value })} placeholder="00000-0000000-0" /></div>
            <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>

            <div><Label>University / Institute</Label><Input value={editing.university || ""} onChange={(e) => setEditing({ ...editing, university: e.target.value })} /></div>
            <div><Label>Degree / Program</Label><Input value={editing.degree || ""} onChange={(e) => setEditing({ ...editing, degree: e.target.value })} placeholder="BSCS, BBA…" /></div>
            <div><Label>Semester</Label><Input value={editing.semester || ""} onChange={(e) => setEditing({ ...editing, semester: e.target.value })} /></div>
            <div><Label>CGPA</Label><Input value={editing.cgpa || ""} onChange={(e) => setEditing({ ...editing, cgpa: e.target.value })} /></div>

            <div>
              <Label>Department</Label>
              <Select value={editing.department} onValueChange={(v) => setEditing({ ...editing, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Supervisor</Label><Input value={editing.supervisor || ""} onChange={(e) => setEditing({ ...editing, supervisor: e.target.value })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} /></div>
            <div><Label>Duration (weeks)</Label><Input type="number" value={editing.duration_weeks || ""} onChange={(e) => setEditing({ ...editing, duration_weeks: +e.target.value })} /></div>
            <div><Label>Stipend (PKR)</Label><Input type="number" value={editing.stipend || ""} onChange={(e) => setEditing({ ...editing, stipend: +e.target.value })} /></div>

            <div className="col-span-2"><Label>Project Assigned</Label><Input value={editing.project_assigned || ""} onChange={(e) => setEditing({ ...editing, project_assigned: e.target.value })} /></div>
            <div className="col-span-2"><Label>Skills</Label><Input value={editing.skills || ""} onChange={(e) => setEditing({ ...editing, skills: e.target.value })} placeholder="React, Node.js, SQL…" /></div>

            <div className="col-span-2"><Label>Emergency Contact</Label><Input value={editing.emergency_contact || ""} onChange={(e) => setEditing({ ...editing, emergency_contact: e.target.value })} /></div>
            <div className="col-span-2"><Label>Referred By <span className="text-muted-foreground text-xs">(optional)</span></Label><Input placeholder="Name of referrer / employee / partner" value={editing.referred_by || ""} onChange={(e) => setEditing({ ...editing, referred_by: e.target.value })} /></div>

            <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Attendance % is tracked automatically from the Attendance module, performance ratings come from performance reviews, and the completion certificate is issued via the Certificate action on this page.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save Intern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="interns" />
    </div>
    </AppLayout>
  );
}
