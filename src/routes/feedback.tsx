import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, PhoneCall, Plus, Search, Trash2, Eye, ThumbsUp, ThumbsDown, Users } from "lucide-react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { resources, type FeedbackCall } from "@/lib/api";
import { localCrud } from "@/lib/local-store";

type Client = { id: number; name: string; company?: string; email?: string; phone?: string };
const clientsApi = localCrud<Client>("clients_v2");

const QUESTIONS = [
  { key: "q1_service", label: "How satisfied are you with the overall service?" },
  { key: "q2_communication", label: "How would you rate the communication?" },
  { key: "q3_quality", label: "How would you rate the quality of work?" },
  { key: "q4_recommend", label: "How likely are you to recommend us?" },
  { key: "q5_timeline", label: "How satisfied are you with the timeline?" },
] as const;

type QKey = typeof QUESTIONS[number]["key"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value >= n && value > 0;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} stars`}
          >
            <Star
              className="h-6 w-6"
              style={{
                color: active ? "oklch(0.72 0.17 145)" : "oklch(0.85 0.02 250)",
                fill: active ? "oklch(0.72 0.17 145)" : "transparent",
              }}
            />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(value === -1 ? 0 : -1)}
        title="Mark negative (−1)"
        className="ml-2 transition-transform hover:scale-110"
      >
        <Star
          className="h-6 w-6"
          style={{
            color: "oklch(0.62 0.22 25)",
            fill: value === -1 ? "oklch(0.62 0.22 25)" : "transparent",
          }}
        />
      </button>
      <span className="ml-2 text-xs font-mono text-muted-foreground w-8">{value}</span>
    </div>
  );
}

function scoreColor(total: number) {
  if (total >= 20) return "oklch(0.65 0.17 145)";
  if (total >= 12) return "oklch(0.72 0.16 90)";
  return "oklch(0.62 0.22 25)";
}

function FeedbackPage() {
  const qc = useQueryClient();
  const callsQ = useQuery({ queryKey: ["feedback_calls"], queryFn: resources.feedbackCalls.list });
  const clientsQ = useQuery({ queryKey: ["clients_v2"], queryFn: clientsApi.list });
  const empsQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });

  const calls = callsQ.data ?? [];
  const clients = clientsQ.data ?? [];
  const employees = empsQ.data ?? [];

  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<FeedbackCall | null>(null);
  const [search, setSearch] = useState("");
  const [custOpen, setCustOpen] = useState(false);

  const emptyForm = {
    customer_id: null as number | null,
    customer_name: "",
    phone: "",
    email: "",
    project_ref: "",
    q1_service: 0, q2_communication: 0, q3_quality: 0, q4_recommend: 0, q5_timeline: 0,
    called_by_employee_id: null as number | null,
    called_by_name: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const createM = useMutation({
    mutationFn: async () => resources.feedbackCalls.create(form as any),
    onSuccess: () => {
      toast.success("Feedback recorded");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["feedback_calls"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const removeM = useMutation({
    mutationFn: async (id: number) => resources.feedbackCalls.remove(id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["feedback_calls"] }); },
  });

  const stats = useMemo(() => {
    const total = calls.length;
    const totals = calls.map((c) => c.total_score ?? 0);
    const avg = total ? totals.reduce((s, v) => s + v, 0) / total : 0;
    const promoters = calls.filter((c) => (c.total_score ?? 0) >= 20).length;
    const detractors = calls.filter((c) => (c.total_score ?? 0) < 12).length;
    return { total, avg, promoters, detractors };
  }, [calls]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return calls;
    return calls.filter((c) =>
      [c.customer_name, c.phone, c.email, c.project_ref, c.called_by_name]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s))
    );
  }, [calls, search]);

  return (
    <AppLayout>
      <PageHeader
        title="Feedback Calls"
        description="Record post-delivery customer feedback calls with per-question ratings and agent notes."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "feedback",
                moduleLabel: "Feedback Calls",
                title: "Customer Feedback Calls Report",
                subtitle: `${calls.length} call(s)`,
                sections: [{
                  title: "Feedback Calls",
                  columns: [
                    { key: "customer_name", label: "Customer" },
                    { key: "phone", label: "Phone" },
                    { key: "project_ref", label: "Project Ref" },
                    { key: "called_by_name", label: "Agent" },
                    { key: "call_date", label: "Date" },
                    { key: "overall_rating", label: "Rating" },
                    { key: "status", label: "Status" },
                  ],
                  rows: calls,
                }],
              })}
            />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Record Feedback Call</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Record Feedback Call</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Select Customer <span className="text-destructive">*</span></Label>
                  <Popover open={custOpen} onOpenChange={setCustOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        {form.customer_name || "Search customers…"}
                        <Search className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers…" />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.name} ${c.company ?? ""} ${c.email ?? ""}`}
                                onSelect={() => {
                                  setForm({
                                    ...form,
                                    customer_id: c.id,
                                    customer_name: c.company || c.name,
                                    phone: c.phone ?? "",
                                    email: c.email ?? "",
                                  });
                                  setCustOpen(false);
                                }}
                              >
                                <div>
                                  <div className="font-medium">{c.company || c.name}</div>
                                  <div className="text-xs text-muted-foreground">{c.email} · {c.phone}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Customer Name</Label>
                    <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Project / Reference</Label>
                    <Input value={form.project_ref} onChange={(e) => setForm({ ...form, project_ref: e.target.value })} />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="text-sm font-semibold">
                    Rate Each Question <span className="text-xs font-normal text-muted-foreground">(5 Green Stars = 5, Red Star = −1)</span>
                  </div>
                  {QUESTIONS.map((q, i) => (
                    <div key={q.key} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                      <div className="text-sm">{i + 1}. {q.label}</div>
                      <StarRating
                        value={form[q.key as QKey] as number}
                        onChange={(v) => setForm({ ...form, [q.key]: v } as any)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">Total Score</span>
                    <span
                      className="font-mono font-semibold text-base"
                      style={{ color: scoreColor(QUESTIONS.reduce((s, q) => s + (form[q.key as QKey] as number), 0)) }}
                    >
                      {QUESTIONS.reduce((s, q) => s + (form[q.key as QKey] as number), 0)} / 25
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Called By</Label>
                    <Select
                      value={form.called_by_employee_id ? String(form.called_by_employee_id) : ""}
                      onValueChange={(v) => {
                        const emp = employees.find((e) => String(e.id) === v);
                        setForm({
                          ...form,
                          called_by_employee_id: emp ? emp.id : null,
                          called_by_name: emp ? emp.name : "",
                        });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select employee who made the call" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}{e.position ? ` — ${e.position}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes from the call…" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  disabled={createM.isPending || !form.customer_name}
                  onClick={() => createM.mutate()}
                >
                  {createM.isPending ? "Saving…" : "Save Feedback"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <StatsCards loading={callsQ.isLoading} stats={[
        { label: "Total Calls", value: stats.total, icon: PhoneCall },
        { label: "Average Score", value: `${stats.avg.toFixed(1)} / 25`, icon: Star, tint: scoreColor(stats.avg) },
        { label: "Promoters (≥20)", value: stats.promoters, icon: ThumbsUp, tint: "oklch(0.65 0.17 145)" },
        { label: "Detractors (<12)", value: stats.detractors, icon: ThumbsDown, tint: "oklch(0.62 0.22 25)" },
      ]} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="h-4 w-4" /> Recent Feedback Calls
          </CardTitle>
          <Input placeholder="Search customer, agent, project…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Project / Ref</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">{callsQ.isLoading ? "Loading…" : "No feedback calls yet."}</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewing(c)}>
                    <TableCell className="text-muted-foreground text-xs">{(c.call_date ?? c.created_at ?? "").slice(0, 10)}</TableCell>
                    <TableCell className="font-medium">{c.customer_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.phone || c.email || "—"}</TableCell>
                    <TableCell>{c.project_ref || "—"}</TableCell>
                    <TableCell>{c.called_by_name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge style={{ background: `color-mix(in oklab, ${scoreColor(c.total_score ?? 0)} 14%, transparent)`, color: scoreColor(c.total_score ?? 0), borderColor: "transparent" }}>
                        {c.total_score ?? 0} / 25
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => setViewing(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this feedback?")) removeM.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> {viewing.customer_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {viewing.email || "—"}</div>
                  <div><span className="text-muted-foreground">Project:</span> {viewing.project_ref || "—"}</div>
                  <div><span className="text-muted-foreground">Called by:</span> {viewing.called_by_name || "—"}</div>
                  <div><span className="text-muted-foreground">Date:</span> {(viewing.call_date ?? viewing.created_at ?? "").slice(0, 16).replace("T", " ")}</div>
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  {QUESTIONS.map((q, i) => {
                    const v = (viewing as any)[q.key] as number;
                    return (
                      <div key={q.key} className="flex items-center justify-between text-sm">
                        <span>{i + 1}. {q.label}</span>
                        <span className="font-mono font-semibold" style={{ color: v < 0 ? "oklch(0.62 0.22 25)" : "oklch(0.65 0.17 145)" }}>{v}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span className="font-mono" style={{ color: scoreColor(viewing.total_score ?? 0) }}>{viewing.total_score ?? 0} / 25</span>
                  </div>
                </div>
                {viewing.notes && (
                  <div className="rounded-md border p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div>
                    <div className="whitespace-pre-wrap">{viewing.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ModuleReportsCard module="feedback" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
});
