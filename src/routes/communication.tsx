import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, MessageSquare, Send, Bell, Users, Search, Trash2, Plus, Inbox,
  CheckCircle2, AlertOctagon, Video, Phone, PhoneOff, Calendar, Play as PlayIcon,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { StatsCards } from "@/components/dms/StatsCards";
import { db } from "@/lib/db-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AttachmentPicker, AttachmentGrid, VoiceBubble, type Attachment,
} from "@/components/dms/CommAttachments";
import { MeetingRoom } from "@/components/dms/MeetingRoom";

// ---------- Types ----------
type AppUser = {
  id: number;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  department: string | null;
  status: string;
};

type Notice = {
  id: string;
  sender_id: string;
  sender_name: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  audience: "all" | "specific";
  recipient_ids: string[];
  read_by: string[];
  attachments: Attachment[];
  created_at: string;
};

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  attachments: Attachment[];
  message_type: string;
  created_at: string;
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_name: string;
  participant_ids: string[];
  participant_names: string[];
  room_name: string;
  meeting_type: "audio" | "video";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: "scheduled" | "live" | "ended";
  recording_url: string | null;
  audience: "all" | "specific";
  created_at: string;
};

// ---------- Data hooks ----------
function useAppUsers() {
  return useQuery({
    queryKey: ["comm-app-users"],
    queryFn: async () => {
      const { data, error } = await db.from("app_users")
        .select("id, auth_user_id, full_name, email, role, department, status")
        .eq("status", "active").order("full_name");
      if (error) throw error;
      return (data ?? []) as AppUser[];
    },
  });
}

function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await db.rpc("is_admin", { _user_id: user!.id });
      return !!data;
    },
  });
}

// Realtime invalidator
function useRealtime(table: string, queryKey: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = db.channel(`rt-${table}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey: [queryKey] });
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [table, queryKey, qc]);
}

const priorityColor: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

// ---------- Notices Tab ----------
function NoticesTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const usersQ = useAppUsers();
  useRealtime("internal_notices", "internal_notices");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", body: "", priority: "normal" as Notice["priority"],
    audience: "all" as Notice["audience"], recipient_ids: [] as string[],
    attachments: [] as Attachment[],
  });
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["internal_notices"],
    queryFn: async () => {
      const { data, error } = await db.from("internal_notices" as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Notice[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.title.trim() || !form.body.trim()) throw new Error("Title & body required");
      if (form.audience === "specific" && form.recipient_ids.length === 0)
        throw new Error("Select at least one recipient");
      const { error } = await db.from("internal_notices" as any).insert({
        sender_id: user.id, sender_name: user.name,
        title: form.title, body: form.body, priority: form.priority,
        audience: form.audience,
        recipient_ids: form.audience === "specific" ? form.recipient_ids : [],
        attachments: form.attachments,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice sent");
      setOpen(false);
      setForm({ title: "", body: "", priority: "normal", audience: "all", recipient_ids: [], attachments: [] });
      qc.invalidateQueries({ queryKey: ["internal_notices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: async (n: Notice) => {
      if (!user || n.read_by?.includes(user.id)) return;
      await db.from("internal_notices" as any)
        .update({ read_by: [...(n.read_by ?? []), user.id] } as any).eq("id", n.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internal_notices"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await db.from("internal_notices" as any).delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["internal_notices"] }); },
  });

  const notices = q.data ?? [];
  const filtered = notices.filter((n) =>
    !search || [n.title, n.body, n.sender_name].join(" ").toLowerCase().includes(search.toLowerCase()));
  const unread = notices.filter((n) => user && !n.read_by?.includes(user.id)).length;
  const urgent = notices.filter((n) => n.priority === "urgent").length;

  const toggleRecipient = (id: string) => setForm((f) => ({
    ...f,
    recipient_ids: f.recipient_ids.includes(id) ? f.recipient_ids.filter((x) => x !== id) : [...f.recipient_ids, id],
  }));

  return (
    <div className="space-y-4">
      <StatsCards loading={q.isLoading} stats={[
        { label: "Total Notices", value: notices.length, icon: Megaphone },
        { label: "Unread", value: unread, icon: Bell, tint: "oklch(0.72 0.18 55)" },
        { label: "Urgent", value: urgent, icon: AlertOctagon, tint: "oklch(0.65 0.2 25)" },
        { label: "Broadcast (All)", value: notices.filter((n) => n.audience === "all").length, icon: Users, tint: "oklch(0.68 0.18 155)" },
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search notices..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Notice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Send Internal Notice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Audience</Label>
                    <Select value={form.audience} onValueChange={(v: any) => setForm({ ...form, audience: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="specific">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.audience === "specific" && (
                  <div>
                    <Label>Recipients ({form.recipient_ids.length})</Label>
                    <ScrollArea className="h-40 border rounded-md p-2">
                      <div className="space-y-1.5">
                        {(usersQ.data ?? []).filter((u) => u.auth_user_id).map((u) => (
                          <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                            <Checkbox
                              checked={form.recipient_ids.includes(u.auth_user_id!)}
                              onCheckedChange={() => toggleRecipient(u.auth_user_id!)}
                            />
                            <span className="flex-1">{u.full_name}</span>
                            <span className="text-xs text-muted-foreground">{u.department ?? u.role}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                <div>
                  <Label>Attachments (images, video, voice, PDF, docs)</Label>
                  <AttachmentPicker
                    attachments={form.attachments}
                    onChange={(atts) => setForm({ ...form, attachments: atts })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3">
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!q.isLoading && filtered.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />No notices yet.
          </CardContent></Card>
        )}
        {filtered.map((n) => {
          const isUnread = user && !n.read_by?.includes(user.id);
          const canDelete = isAdmin || n.sender_id === user?.id;
          return (
            <Card key={n.id} className={cn("transition-colors cursor-pointer", isUnread && "border-l-4 border-l-primary")}
              onClick={() => isUnread && markRead.mutate(n)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{n.title}</CardTitle>
                      <Badge className={priorityColor[n.priority]} variant="secondary">{n.priority}</Badge>
                      <Badge variant="outline">
                        {n.audience === "all" ? "All Users" : `${n.recipient_ids?.length ?? 0} recipient(s)`}
                      </Badge>
                      {isUnread && <Badge>New</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      From <span className="font-medium">{n.sender_name}</span> · {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {canDelete && (
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                <AttachmentGrid attachments={n.attachments ?? []} />
                {isAdmin && (
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Read by {n.read_by?.length ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Messages Tab (WhatsApp-style) ----------
function MessagesTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const usersQ = useAppUsers();
  useRealtime("internal_messages", "internal_messages");

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyAtts, setReplyAtts] = useState<Attachment[]>([]);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [newMsg, setNewMsg] = useState({ to: "", subject: "", body: "" });
  const [search, setSearch] = useState("");
  const [callMeeting, setCallMeeting] = useState<{ room: string; audio: boolean } | null>(null);

  const q = useQuery({
    queryKey: ["internal_messages"],
    queryFn: async () => {
      const { data, error } = await db.from("internal_messages" as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
  });

  const messages = q.data ?? [];

  type Conversation = { key: string; peerName: string; peerId: string; lastAt: string; lastBody: string; unread: number; messages: Message[] };
  const conversations: Conversation[] = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, Conversation>();
    for (const m of messages) {
      let peerId: string; let peerName: string;
      if (isAdmin && m.sender_id !== user.id && m.recipient_id !== user.id) {
        const key = [m.sender_id, m.recipient_id].sort().join("|");
        peerId = key; peerName = `${m.sender_name} ↔ ${m.recipient_name}`;
        const existing = map.get(key);
        if (!existing) map.set(key, { key, peerId, peerName, lastAt: m.created_at, lastBody: m.body, unread: 0, messages: [m] });
        else existing.messages.push(m);
      } else {
        peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        peerName = m.sender_id === user.id ? m.recipient_name : m.sender_name;
        const key = peerId;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key, peerId, peerName, lastAt: m.created_at, lastBody: m.body,
            unread: !m.is_read && m.recipient_id === user.id ? 1 : 0, messages: [m],
          });
        } else {
          existing.messages.push(m);
          if (!m.is_read && m.recipient_id === user.id) existing.unread += 1;
        }
      }
    }
    return [...map.values()].map((c) => {
      c.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = c.messages[c.messages.length - 1];
      c.lastAt = last.created_at; c.lastBody = last.body || (last.attachments?.length ? "📎 Attachment" : "");
      return c;
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [messages, user, isAdmin]);

  const filteredConvos = conversations.filter((c) =>
    !search || c.peerName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastBody.toLowerCase().includes(search.toLowerCase()));

  const active = conversations.find((c) => c.key === selectedPeer) ?? null;

  const send = useMutation({
    mutationFn: async (payload: {
      recipient_id: string; recipient_name: string;
      subject?: string; body: string; thread_id?: string; attachments?: Attachment[];
    }) => {
      if (!user) throw new Error("Not signed in");
      const row: any = {
        sender_id: user.id, sender_name: user.name,
        recipient_id: payload.recipient_id, recipient_name: payload.recipient_name,
        subject: payload.subject ?? null, body: payload.body,
        attachments: payload.attachments ?? [],
      };
      if (payload.thread_id) row.thread_id = payload.thread_id;
      const { error } = await db.from("internal_messages" as any).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internal_messages"] });
      setReply(""); setReplyAtts([]); setNewMsg({ to: "", subject: "", body: "" }); setNewMsgOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markThreadRead = useMutation({
    mutationFn: async (msgs: Message[]) => {
      if (!user) return;
      const ids = msgs.filter((m) => !m.is_read && m.recipient_id === user.id).map((m) => m.id);
      if (ids.length === 0) return;
      await db.from("internal_messages" as any).update({ is_read: true } as any).in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internal_messages"] }),
  });

  const selectConvo = (c: Conversation) => { setSelectedPeer(c.key); markThreadRead.mutate(c.messages); };

  const handleReply = () => {
    if (!active || (!reply.trim() && replyAtts.length === 0) || !user) return;
    const lastMsg = active.messages[active.messages.length - 1];
    let peerId: string; let peerName: string;
    if (lastMsg.sender_id === user.id) { peerId = lastMsg.recipient_id; peerName = lastMsg.recipient_name; }
    else { peerId = lastMsg.sender_id; peerName = lastMsg.sender_name; }
    send.mutate({
      recipient_id: peerId, recipient_name: peerName,
      body: reply, thread_id: lastMsg.thread_id, subject: lastMsg.subject ?? undefined,
      attachments: replyAtts,
    });
  };

  const handleNewMessage = () => {
    if (!newMsg.to || !newMsg.body.trim()) { toast.error("Recipient & body required"); return; }
    const target = (usersQ.data ?? []).find((u) => u.auth_user_id === newMsg.to);
    if (!target) return;
    send.mutate({
      recipient_id: target.auth_user_id!, recipient_name: target.full_name,
      subject: newMsg.subject, body: newMsg.body,
    });
  };

  // Start instant call with the active peer (creates a meeting record)
  const startCall = async (audioOnly: boolean) => {
    if (!active || !user) return;
    const lastMsg = active.messages[active.messages.length - 1];
    const peerId = lastMsg.sender_id === user.id ? lastMsg.recipient_id : lastMsg.sender_id;
    const peerName = lastMsg.sender_id === user.id ? lastMsg.recipient_name : lastMsg.sender_name;
    const room = `devionic-${crypto.randomUUID().slice(0, 12)}`;
    try {
      await db.from("meetings" as any).insert({
        title: `${audioOnly ? "Audio" : "Video"} call with ${peerName}`,
        host_id: user.id, host_name: user.name,
        participant_ids: [peerId], participant_names: [peerName],
        room_name: room, meeting_type: audioOnly ? "audio" : "video",
        status: "live", started_at: new Date().toISOString(),
        audience: "specific",
      } as any);
      // Send an invite message
      await send.mutateAsync({
        recipient_id: peerId, recipient_name: peerName,
        body: `📞 ${audioOnly ? "Audio" : "Video"} call started — join room: ${room}`,
        thread_id: lastMsg.thread_id,
      });
      setCallMeeting({ room, audio: audioOnly });
    } catch (e: any) { toast.error(e.message); }
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="space-y-4">
      <StatsCards loading={q.isLoading} stats={[
        { label: "Conversations", value: conversations.length, icon: MessageSquare },
        { label: "Unread", value: totalUnread, icon: Bell, tint: "oklch(0.72 0.18 55)" },
        { label: "Total Messages", value: messages.length, icon: Send, tint: "oklch(0.68 0.18 155)" },
        { label: isAdmin ? "Admin View: All" : "Your Threads", value: isAdmin ? "ON" : conversations.length, icon: Users },
      ]} />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[560px]">
          <div className="border-r bg-muted/20 flex flex-col">
            <div className="p-3 border-b space-y-2">
              <Button className="w-full" size="sm" onClick={() => setNewMsgOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Message
              </Button>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8 h-8" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {filteredConvos.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">No conversations</div>
                )}
                {filteredConvos.map((c) => (
                  <button key={c.key} onClick={() => selectConvo(c)}
                    className={cn("w-full text-left p-3 hover:bg-muted transition-colors",
                      selectedPeer === c.key && "bg-muted")}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{c.peerName}</div>
                      {c.unread > 0 && <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{c.unread}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{c.lastBody}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.lastAt).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col min-h-[560px]">
            {!active ? (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground p-6">
                <div className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Select a conversation or start a new one.
                </div>
              </div>
            ) : (
              <>
                <div className="border-b px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{active.peerName}</div>
                    <div className="text-xs text-muted-foreground">{active.messages.length} messages</div>
                  </div>
                  {/* WhatsApp-style call buttons — only meaningful for 1:1 threads */}
                  {active.messages.some((m) => m.sender_id === user?.id || m.recipient_id === user?.id) && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" title="Audio call" onClick={() => startCall(true)}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" title="Video call" onClick={() => startCall(false)}>
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1 p-4 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22/>')]">
                  <div className="space-y-3">
                    {active.messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      const isVoice = (m.attachments ?? []).length === 1 && m.attachments[0].kind === "audio" && !m.body;
                      return (
                        <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm",
                            mine ? "bg-primary text-primary-foreground" : "bg-background border"
                          )}>
                            {!mine && <div className="text-[10px] font-semibold mb-0.5 opacity-70">{m.sender_name}</div>}
                            {m.subject && <div className="font-medium text-xs mb-1 opacity-80">Re: {m.subject}</div>}
                            {isVoice ? (
                              <VoiceBubble path={m.attachments[0].path} />
                            ) : (
                              <>
                                {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                                <AttachmentGrid attachments={m.attachments ?? []} compact />
                              </>
                            )}
                            <div className={cn("text-[10px] mt-1 text-right", mine ? "opacity-70" : "text-muted-foreground")}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {mine && (m.is_read ? " ✓✓" : " ✓")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                {user && active.messages.some((m) => m.sender_id === user.id || m.recipient_id === user.id) && (
                  <div className="border-t p-3 space-y-2 bg-muted/30">
                    <AttachmentPicker attachments={replyAtts} onChange={setReplyAtts} compact />
                    <div className="flex gap-2">
                      <Textarea rows={1} placeholder="Type a message..."
                        value={reply} onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        className="resize-none min-h-[40px] bg-background" />
                      <Button onClick={handleReply}
                        disabled={(!reply.trim() && replyAtts.length === 0) || send.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {isAdmin && !active.messages.some((m) => m.sender_id === user?.id || m.recipient_id === user?.id) && (
                  <div className="border-t p-3 text-xs text-muted-foreground bg-muted/30 text-center">
                    Admin view — read only for third-party conversations.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* New message dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>To</Label>
              <Select value={newMsg.to} onValueChange={(v) => setNewMsg({ ...newMsg, to: v })}>
                <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  {(usersQ.data ?? []).filter((u) => u.auth_user_id && u.auth_user_id !== user?.id).map((u) => (
                    <SelectItem key={u.id} value={u.auth_user_id!}>
                      {u.full_name} <span className="text-muted-foreground">· {u.department ?? u.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input value={newMsg.subject} onChange={(e) => setNewMsg({ ...newMsg, subject: e.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={5} value={newMsg.body} onChange={(e) => setNewMsg({ ...newMsg, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMsgOpen(false)}>Cancel</Button>
            <Button onClick={handleNewMessage} disabled={send.isPending}>
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {callMeeting && (
        <MeetingRoom
          open={!!callMeeting}
          onClose={() => setCallMeeting(null)}
          roomName={callMeeting.room}
          displayName={user?.name ?? "User"}
          audioOnly={callMeeting.audio}
        />
      )}
    </div>
  );
}

// ---------- Meetings Tab ----------
function MeetingsTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const usersQ = useAppUsers();
  useRealtime("meetings", "meetings");

  const [open, setOpen] = useState(false);
  const [joinMeeting, setJoinMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", meeting_type: "video" as "audio" | "video",
    scheduled_at: "", audience: "specific" as "all" | "specific",
    participant_ids: [] as string[], recording_url: "",
  });

  const q = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await db.from("meetings" as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Meeting[];
    },
  });

  const create = useMutation({
    mutationFn: async (startNow: boolean) => {
      if (!user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Title required");
      const room = `devionic-${crypto.randomUUID().slice(0, 12)}`;
      const chosen = (usersQ.data ?? []).filter((u) => form.participant_ids.includes(u.auth_user_id ?? ""));
      const { error } = await db.from("meetings" as any).insert({
        title: form.title, description: form.description || null,
        host_id: user.id, host_name: user.name,
        participant_ids: form.audience === "specific" ? form.participant_ids : [],
        participant_names: chosen.map((u) => u.full_name),
        room_name: room, meeting_type: form.meeting_type,
        scheduled_at: form.scheduled_at || null,
        started_at: startNow ? new Date().toISOString() : null,
        status: startNow ? "live" : "scheduled",
        audience: form.audience,
      } as any);
      if (error) throw error;
      return { room, startNow };
    },
    onSuccess: (res) => {
      toast.success(res.startNow ? "Meeting started" : "Meeting scheduled");
      setOpen(false);
      setForm({ title: "", description: "", meeting_type: "video", scheduled_at: "", audience: "specific", participant_ids: [], recording_url: "" });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      if (res.startNow) {
        setTimeout(() => {
          const m = (q.data ?? []).find((x) => x.room_name === res.room);
          if (m) setJoinMeeting(m);
          else setJoinMeeting({ room_name: res.room } as any);
        }, 300);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const endMeeting = useMutation({
    mutationFn: async (m: Meeting) => {
      await db.from("meetings" as any)
        .update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", m.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); toast.success("Meeting ended"); },
  });

  const attachRecording = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      await db.from("meetings" as any).update({ recording_url: url } as any).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meetings"] }); toast.success("Recording saved"); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await db.from("meetings" as any).delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const meetings = q.data ?? [];
  const live = meetings.filter((m) => m.status === "live");
  const scheduled = meetings.filter((m) => m.status === "scheduled");
  const ended = meetings.filter((m) => m.status === "ended");

  const toggleParticipant = (id: string) => setForm((f) => ({
    ...f, participant_ids: f.participant_ids.includes(id) ? f.participant_ids.filter((x) => x !== id) : [...f.participant_ids, id],
  }));

  return (
    <div className="space-y-4">
      <StatsCards loading={q.isLoading} stats={[
        { label: "Live now", value: live.length, icon: Video, tint: "oklch(0.65 0.2 25)" },
        { label: "Scheduled", value: scheduled.length, icon: Calendar, tint: "oklch(0.72 0.18 55)" },
        { label: "Past meetings", value: ended.length, icon: PhoneOff },
        { label: "With recording", value: ended.filter((m) => !!m.recording_url).length, icon: PlayIcon, tint: "oklch(0.68 0.18 155)" },
      ]} />

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Schedule / Start Meeting</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.meeting_type} onValueChange={(v: any) => setForm({ ...form, meeting_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video meeting</SelectItem>
                      <SelectItem value="audio">Audio only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Schedule for (optional)</Label>
                  <Input type="datetime-local" value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v: any) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="specific">Specific participants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.audience === "specific" && (
                <div>
                  <Label>Participants ({form.participant_ids.length})</Label>
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="space-y-1.5">
                      {(usersQ.data ?? []).filter((u) => u.auth_user_id && u.auth_user_id !== user?.id).map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                          <Checkbox
                            checked={form.participant_ids.includes(u.auth_user_id!)}
                            onCheckedChange={() => toggleParticipant(u.auth_user_id!)}
                          />
                          <span className="flex-1">{u.full_name}</span>
                          <span className="text-xs text-muted-foreground">{u.department ?? u.role}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => create.mutate(false)} disabled={create.isPending}>
                <Calendar className="h-4 w-4 mr-1" /> Schedule
              </Button>
              <Button onClick={() => create.mutate(true)} disabled={create.isPending}>
                <Video className="h-4 w-4 mr-1" /> Start now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!q.isLoading && meetings.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />No meetings yet.
          </CardContent></Card>
        )}
        {meetings.map((m) => {
          const canManage = isAdmin || m.host_id === user?.id;
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{m.title}</CardTitle>
                      <Badge variant={m.status === "live" ? "destructive" : m.status === "scheduled" ? "default" : "secondary"}>
                        {m.status === "live" ? "🔴 LIVE" : m.status}
                      </Badge>
                      <Badge variant="outline">{m.meeting_type === "video" ? <Video className="h-3 w-3 mr-1" /> : <Phone className="h-3 w-3 mr-1" />}{m.meeting_type}</Badge>
                      {m.audience === "all" && <Badge variant="outline">All users</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Host: <span className="font-medium">{m.host_name}</span>
                      {m.scheduled_at && ` · Scheduled ${new Date(m.scheduled_at).toLocaleString()}`}
                      {m.participant_names?.length > 0 && ` · ${m.participant_names.length} participants`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(m.status === "live" || m.status === "scheduled") && (
                      <Button size="sm" onClick={() => setJoinMeeting(m)}>
                        <Video className="h-4 w-4 mr-1" /> Join
                      </Button>
                    )}
                    {canManage && m.status === "live" && (
                      <Button size="sm" variant="outline" onClick={() => endMeeting.mutate(m)}>
                        <PhoneOff className="h-4 w-4 mr-1" /> End
                      </Button>
                    )}
                    {canManage && m.status === "ended" && !m.recording_url && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const url = prompt("Paste recording URL (public link):");
                        if (url) attachRecording.mutate({ id: m.id, url });
                      }}>
                        <PlayIcon className="h-4 w-4 mr-1" /> Add recording
                      </Button>
                    )}
                    {canManage && (
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {(m.description || m.recording_url || m.participant_names?.length) ? (
                <CardContent className="pt-0 space-y-2">
                  {m.description && <p className="text-sm">{m.description}</p>}
                  {m.participant_names?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Participants: {m.participant_names.join(", ")}
                    </div>
                  )}
                  {m.recording_url && (
                    <a href={m.recording_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      <PlayIcon className="h-4 w-4" /> Watch recording
                    </a>
                  )}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      {joinMeeting && (
        <MeetingRoom
          open={!!joinMeeting}
          onClose={() => setJoinMeeting(null)}
          roomName={joinMeeting.room_name}
          displayName={user?.name ?? "User"}
          audioOnly={joinMeeting.meeting_type === "audio"}
        />
      )}
    </div>
  );
}

// ---------- Page ----------
function CommunicationPage() {
  const isAdminQ = useIsAdmin();
  const isAdmin = !!isAdminQ.data;

  return (
    <AppLayout>
      <PageHeader title="Communication" description="Notices, chat, voice/video meetings — all in one place." />
      <Tabs defaultValue="notices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notices"><Megaphone className="h-4 w-4 mr-1" /> Internal Notices</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1" /> Chat</TabsTrigger>
          <TabsTrigger value="meetings"><Video className="h-4 w-4 mr-1" /> Meetings</TabsTrigger>
        </TabsList>
        <TabsContent value="notices"><NoticesTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="messages"><MessagesTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="meetings"><MeetingsTab isAdmin={isAdmin} /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export const Route = createFileRoute("/communication")({
  head: () => ({ meta: [{ title: "Communication — Devionic DMS" }] }),
  component: CommunicationPage,
});
