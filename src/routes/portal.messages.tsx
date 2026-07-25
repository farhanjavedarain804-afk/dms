import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Plus } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, writeList, nextId, type PortalMessage, type PortalThread } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portal/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Devionic Client Portal" },
      { name: "description", content: "Direct messaging with your Devionic account team." },
      { property: "og:title", content: "Messages — Devionic Client Portal" },
      { property: "og:description", content: "Direct messaging with your Devionic account team." },
    ],
  }),
  component: PortalMessages,
});

function PortalMessages() {
  const ident = usePortalIdentity();
  const clientKey = (ident.company || ident.name || ident.email).toLowerCase();
  const [tick, setTick] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const threads = useMemo(
    () => readList<PortalThread>(KEYS.threads).filter((t) => t.client_key.toLowerCase() === clientKey),
    [clientKey, tick],
  );
  const messages = useMemo(
    () => readList<PortalMessage>(KEYS.messages).filter((m) => m.thread_id === threadId).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [threadId, tick],
  );

  useEffect(() => { if (!threadId && threads.length) setThreadId(threads[0].id); }, [threads, threadId]);

  const startThread = () => {
    const subject = window.prompt("Thread subject:", "General inquiry");
    if (!subject) return;
    const id = `T-${Date.now()}`;
    const all = readList<PortalThread>(KEYS.threads);
    const row: PortalThread = { id, client_key: clientKey, subject, last_at: new Date().toISOString() };
    writeList(KEYS.threads, [row, ...all]);
    setThreadId(id);
    setTick((t) => t + 1);
  };

  const send = () => {
    if (!draft.trim() || !threadId) return;
    const all = readList<PortalMessage>(KEYS.messages);
    const row: PortalMessage = {
      id: nextId(all),
      thread_id: threadId,
      client_key: clientKey,
      from: "client",
      from_name: ident.name || ident.email,
      body: draft.trim(),
      created_at: new Date().toISOString(),
    };
    writeList(KEYS.messages, [...all, row]);
    // update thread last_at
    const ths = readList<PortalThread>(KEYS.threads);
    const idx = ths.findIndex((t) => t.id === threadId);
    if (idx >= 0) { ths[idx] = { ...ths[idx], last_at: row.created_at }; writeList(KEYS.threads, ths); }
    setDraft("");
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <p className="text-sm text-muted-foreground">Chat directly with your account manager.</p>
        </div>
        <Button onClick={startThread}><Plus className="h-4 w-4 mr-1" /> New thread</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-xl border bg-card overflow-hidden">
          {threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
              No threads yet.
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThreadId(t.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/30 ${threadId === t.id ? "bg-muted/40" : ""}`}
                >
                  <div className="text-sm font-medium truncate">{t.subject}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(t.last_at).toLocaleString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card flex flex-col min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!threadId ? (
              <div className="text-sm text-muted-foreground text-center py-10">Select or start a thread.</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10">No messages yet — say hi 👋</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "client" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "client" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="text-[10px] opacity-70 mb-0.5">{m.from_name}</div>
                    {m.body}
                  </div>
                </div>
              ))
            )}
          </div>
          {threadId && (
            <div className="border-t p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                className="flex-1 h-10 rounded-md border bg-background px-3 text-sm"
              />
              <Button onClick={send}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
