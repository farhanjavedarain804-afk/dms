import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, ClipboardCheck } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, writeList, type PortalApproval } from "@/lib/portal-data";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — Devionic Client Portal" },
      { name: "description", content: "Approve or reject requests from the Devionic team." },
      { property: "og:title", content: "Approvals — Devionic Client Portal" },
      { property: "og:description", content: "Approve or reject requests from the Devionic team." },
    ],
  }),
  component: PortalApprovals,
});

function PortalApprovals() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<PortalApproval[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const key = (ident.company || ident.name || ident.email || "").toLowerCase();
    const all = readList<PortalApproval>(KEYS.approvals);
    setRows(all.filter((r) => r.client_key.toLowerCase().includes(key) && key));
  }, [ident.company, ident.name, ident.email, tick]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const done = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows]);

  const respond = (id: number, status: "approved" | "rejected") => {
    const note = status === "rejected" ? window.prompt("Reason (optional):") ?? "" : "";
    const all = readList<PortalApproval>(KEYS.approvals);
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], status, responded_at: new Date().toISOString(), response_note: note };
    writeList(KEYS.approvals, all);
    toast.success(`Request ${status}`);
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Approvals</h2>
        <p className="text-sm text-muted-foreground">Requests waiting on your decision.</p>
      </div>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending ({pending.length})</div>
        {pending.length === 0 ? (
          <EmptyCard icon={ClipboardCheck} text="Nothing pending — you're all caught up." />
        ) : (
          pending.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.title}</div>
                {r.description && <div className="text-sm text-muted-foreground mt-1">{r.description}</div>}
                <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(r.requested_at).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => respond(r.id, "approved")}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-3 h-8 text-xs font-medium hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => respond(r.id, "rejected")}
                  className="inline-flex items-center gap-1 rounded-md border px-3 h-8 text-xs font-medium hover:bg-muted"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">History</div>
        {done.length === 0 ? (
          <div className="text-xs text-muted-foreground">No responses yet.</div>
        ) : (
          done.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.status} · {r.responded_at ? new Date(r.responded_at).toLocaleString() : ""}
                </div>
                {r.response_note && <div className="text-xs text-muted-foreground mt-1">"{r.response_note}"</div>}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-emerald-500/15 text-emerald-600"
    : status === "rejected" ? "bg-rose-500/15 text-rose-600"
    : "bg-amber-500/15 text-amber-600";
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
}

function EmptyCard({ icon: Icon, text }: any) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}
