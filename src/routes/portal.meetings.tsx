import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Plus, Video } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db-client";
import { Button } from "@/components/ui/button";
import { MeetingRoom } from "@/components/dms/MeetingRoom";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Devionic Client Portal" },
      { name: "description", content: "Book meetings with your Devionic project team and view your schedule." },
      { property: "og:title", content: "Meetings — Devionic Client Portal" },
      { property: "og:description", content: "Book meetings with your Devionic team." },
    ],
  }),
  component: PortalMeetings,
});

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  host_name: string;
  room_name: string;
  meeting_type: "audio" | "video";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: "scheduled" | "live" | "ended";
  recording_url: string | null;
  created_at: string;
};

const REQUEST_PREFIX = "[Client Request] ";

function PortalMeetings() {
  const ident = usePortalIdentity();
  const { user } = useAuth();
  const [rows, setRows] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [joinMeeting, setJoinMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState({ title: "", meeting_at: "", agenda: "" });

  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("meetings" as any)
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Meeting[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!user?.id) return;
    const channel = supabase
      .channel(`portal-meetings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `host_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => { db.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.meeting_at || !user) return;
    const room = `devionic-${crypto.randomUUID().slice(0, 12)}`;
    const displayName = ident.name || ident.email || user.name || "Client";
    const agenda = form.agenda.trim();
    const description = [
      agenda,
      `Requested by: ${displayName}${ident.company ? ` (${ident.company})` : ""}`,
      ident.clientId ? `Client ID: ${ident.clientId}` : "",
    ].filter(Boolean).join("\n");
    const { error } = await db.from("meetings" as any).insert({
      title: REQUEST_PREFIX + form.title.trim(),
      description,
      host_id: user.id,
      host_name: displayName,
      participant_ids: [],
      participant_names: [],
      room_name: room,
      meeting_type: "video",
      scheduled_at: form.meeting_at,
      status: "scheduled",
      audience: "specific",
    } as any);
    if (error) { toast.error(error.message); return; }
    setOpenForm(false);
    setForm({ title: "", meeting_at: "", agenda: "" });
    toast.success("Meeting request sent to Devionic team");
    refresh();
  };

  const stripPrefix = (t: string) => t.startsWith(REQUEST_PREFIX) ? t.slice(REQUEST_PREFIX.length) : t;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
          <p className="text-sm text-muted-foreground">Request a meeting with your Devionic team. Status updates appear here in real time.</p>
        </div>
        <Button onClick={() => setOpenForm((v) => !v)}><Plus className="h-4 w-4 mr-1" /> Request meeting</Button>
      </div>

      {openForm && (
        <form onSubmit={submit} className="rounded-xl border bg-card p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Meeting title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Preferred date & time</label>
            <input type="datetime-local" value={form.meeting_at} onChange={(e) => setForm({ ...form, meeting_at: e.target.value })} required className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Agenda / notes</label>
            <textarea rows={3} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button type="submit">Submit request</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No meetings scheduled.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const canJoin = m.status === "live" || m.status === "scheduled";
            return (
              <div key={m.id} className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{stripPrefix(m.title)}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "Time TBD"}
                  </div>
                  {m.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">{m.description}</div>}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    m.status === "live" ? "bg-rose-500/15 text-rose-600" :
                    m.status === "ended" ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-600"
                  }`}>{m.status === "live" ? "🔴 Live" : m.status}</span>
                  {canJoin && (
                    <Button size="sm" variant="outline" onClick={() => setJoinMeeting(m)}>
                      <Video className="h-3 w-3 mr-1" /> Join
                    </Button>
                  )}
                  {m.status === "ended" && m.recording_url && (
                    <a href={m.recording_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Watch recording</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {joinMeeting && (
        <MeetingRoom
          open={!!joinMeeting}
          onClose={() => setJoinMeeting(null)}
          roomName={joinMeeting.room_name}
          displayName={ident.name || ident.email || "Client"}
          audioOnly={joinMeeting.meeting_type === "audio"}
        />
      )}
    </div>
  );
}
