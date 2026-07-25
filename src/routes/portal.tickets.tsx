import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, Send } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

export const Route = createFileRoute("/portal/tickets")({
  head: () => ({
    meta: [
      { title: "Support — Devionic Client Portal" },
      { name: "description", content: "Open and track support tickets with the Devionic team." },
      { property: "og:title", content: "Support — Devionic Client Portal" },
      { property: "og:description", content: "Open and track support tickets with Devionic." },
    ],
  }),
  component: PortalTickets,
});

const KEY = "dms:support_v2";

function load(): any[] {
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function save(rows: any[]) { window.localStorage.setItem(KEY, JSON.stringify(rows)); }

function nextTicketNo() {
  const y = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `TCK-${y}-${seq}`;
}

type FormState = {
  subject: string;
  description: string;
  type: "incident" | "request" | "change" | "question";
  category: "hardware" | "software" | "network" | "access" | "email" | "billing" | "hr" | "facilities" | "other";
  tags: string;
  priority: "low" | "medium" | "high" | "urgent";
  phone: string;
};

function emptyForm(phone = ""): FormState {
  return {
    subject: "",
    description: "",
    type: "request",
    category: "software",
    tags: "",
    priority: "medium",
    phone,
  };
}

function PortalTickets() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [ticketNo] = useState<string>(() => nextTicketNo());

  // Keep phone in sync when portal identity loads/changes and field is untouched
  useEffect(() => {
    setForm((f) => (f.phone ? f : { ...f, phone: ident.phone ?? "" }));
  }, [ident.phone]);

  const refresh = () => {
    const all = load();
    setRows(all.filter((t) => (t.requester_email ?? "").toLowerCase() === ident.email.toLowerCase()));
  };
  useEffect(refresh, [ident.email]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    const all = load();
    const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
    const row = {
      id,
      ticket_no: ticketNo,
      subject: form.subject.trim(),
      description: form.description.trim(),
      type: form.type,
      category: form.category,
      channel: "portal",
      tags: form.tags.trim(),
      requester: ident.name || ident.email,
      requester_email: ident.email,
      requester_phone: form.phone.trim(),
      requester_city: ident.city ?? "",
      client_id: ident.clientId,
      client_company: ident.company,
      priority: form.priority,
      status: "open",
      created: new Date().toISOString().slice(0, 10),
      status_history: [{ at: new Date().toISOString(), title: "Ticket opened via portal", status: "open", updated_by: ident.name || ident.email }],
    };
    save([row, ...all]);
    setOpenForm(false);
    setForm(emptyForm(ident.phone ?? ""));
    toast.success(`Ticket ${row.ticket_no} submitted`);
    refresh();
  };


  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-sm text-muted-foreground">Open a request or track ongoing ones.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm(ident.phone ?? "")); setOpenForm((v) => !v); }}>
          <Plus className="h-4 w-4 mr-1" /> New ticket
        </Button>
      </div>

      {openForm && (
        <form onSubmit={submit} className="rounded-xl border bg-card p-5 space-y-6">
          <Section title="Ticket">
            <div>
              <Label>Ticket #</Label>
              <Input value={ticketNo} readOnly className="bg-muted/40" />
            </div>
            <div>
              <Label>Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="mt-2 w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="incident">Incident</option>
                <option value="request">Service Request</option>
                <option value="change">Change</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="mt-2 w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="network">Network</option>
                <option value="access">Access</option>
                <option value="email">Email</option>
                <option value="billing">Billing</option>
                <option value="hr">HR</option>
                <option value="facilities">Facilities</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="mt-2 w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Tags</Label>
              <Input placeholder="comma-separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
          </Section>

          <Section title="Requester (auto-filled)">
            <div>
              <Label>Client ID</Label>
              <Input value={ident.clientId} readOnly className="bg-muted/40 font-mono" />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={ident.name || ident.email} readOnly className="bg-muted/40" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={ident.email} readOnly className="bg-muted/40" />
            </div>
            <div>
              <Label>Phone / WhatsApp</Label>
              <Input
                type="tel"
                placeholder="+92 3XX XXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Editable — please confirm your current contact number.</p>
            </div>
            <div>
              <Label>Channel</Label>
              <Input value="Web Portal" readOnly className="bg-muted/40" />
            </div>
          </Section>


          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button type="submit"><Send className="h-4 w-4 mr-1" /> Submit ticket</Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <LifeBuoy className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No tickets yet. Click "New ticket" to open your first request.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t.ticket_no}</div>
                  <div className="font-semibold truncate">{t.subject}</div>
                  {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                </div>
                <div className="text-right shrink-0">
                  <StatusChip status={t.status} />
                  <div className="text-[11px] text-muted-foreground mt-1">{t.priority}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status?: string }) {
  const map: Record<string, string> = {
    open: "bg-rose-500/15 text-rose-600",
    in_progress: "bg-amber-500/15 text-amber-600",
    waiting: "bg-blue-500/15 text-blue-600",
    resolved: "bg-emerald-500/15 text-emerald-600",
    closed: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[status ?? ""] ?? "bg-muted"}`}>{(status ?? "—").replace("_", " ")}</span>;
}
