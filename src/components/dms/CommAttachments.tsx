import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db-client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Paperclip, Mic, StopCircle, X, FileText, Image as ImageIcon, Film,
  Music, Download, Play, Pause,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Attachment = {
  path: string;          // storage path within comm-attachments
  name: string;
  size: number;
  mime: string;
  kind: "image" | "video" | "audio" | "file";
};

const BUCKET = "comm-attachments";

function kindOf(mime: string): Attachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export async function uploadAttachment(
  file: Blob,
  filename: string,
  mime: string,
  userId: string,
): Promise<Attachment> {
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: mime, upsert: false,
  });
  if (error) throw error;
  return { path, name: filename, size: (file as File).size ?? file.size ?? 0, mime, kind: kindOf(mime) };
}

// Simple in-memory signed URL cache
const urlCache = new Map<string, { url: string; exp: number }>();
export async function getSignedUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  const now = Date.now();
  if (cached && cached.exp > now + 30_000) return cached.url;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("signed url failed");
  urlCache.set(path, { url: data.signedUrl, exp: now + 3600_000 });
  return data.signedUrl;
}

function useSignedUrl(path: string) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    getSignedUrl(path).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  return url;
}

export function AttachmentPreview({ att, compact }: { att: Attachment; compact?: boolean }) {
  const url = useSignedUrl(att.path);
  if (!url) return <div className="text-xs text-muted-foreground italic">Loading...</div>;

  if (att.kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={att.name}
          className={cn("rounded-md object-cover", compact ? "max-w-[240px] max-h-48" : "max-w-full max-h-72")}
        />
      </a>
    );
  }
  if (att.kind === "video") {
    return <video src={url} controls className={cn("rounded-md", compact ? "max-w-[280px]" : "max-w-full")} />;
  }
  if (att.kind === "audio") {
    return <audio src={url} controls className="max-w-full" />;
  }
  const Icon = att.mime.includes("pdf") ? FileText : FileText;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
    >
      <Icon className="h-4 w-4" />
      <span className="truncate max-w-[200px]">{att.name}</span>
      <Download className="h-3.5 w-3.5 opacity-60" />
    </a>
  );
}

export function AttachmentGrid({ attachments, compact }: { attachments: Attachment[]; compact?: boolean }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 grid gap-2">
      {attachments.map((a, i) => <AttachmentPreview key={i} att={a} compact={compact} />)}
    </div>
  );
}

// ---------- Picker (files + audio record) ----------
type PickerProps = {
  attachments: Attachment[];
  onChange: (att: Attachment[]) => void;
  compact?: boolean;
};

export function AttachmentPicker({ attachments, onChange, compact }: PickerProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} > 25 MB`); continue; }
        const a = await uploadAttachment(f, f.name, f.type || "application/octet-stream", user.id);
        uploaded.push(a);
      }
      onChange([...attachments, ...uploaded]);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startRecording = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        try {
          setUploading(true);
          const ext = mime.includes("mp4") ? "m4a" : "webm";
          const a = await uploadAttachment(blob, `voice-${Date.now()}.${ext}`, mime, user.id);
          onChange([...attachments, a]);
        } catch (e: any) { toast.error(e.message); }
        finally { setUploading(false); }
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) {
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const removeAt = (i: number) => onChange(attachments.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button type="button" variant="outline" size={compact ? "sm" : "default"}
          onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Paperclip className="h-4 w-4 mr-1" /> {compact ? "Attach" : "Attach files"}
        </Button>
        {!recording ? (
          <Button type="button" variant="outline" size={compact ? "sm" : "default"}
            onClick={startRecording} disabled={uploading}>
            <Mic className="h-4 w-4 mr-1" /> Record voice
          </Button>
        ) : (
          <Button type="button" variant="destructive" size={compact ? "sm" : "default"} onClick={stopRecording}>
            <StopCircle className="h-4 w-4 mr-1 animate-pulse" /> Stop ({seconds}s)
          </Button>
        )}
        {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => {
            const Icon =
              a.kind === "image" ? ImageIcon :
              a.kind === "video" ? Film :
              a.kind === "audio" ? Music : FileText;
            return (
              <div key={i} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate max-w-[160px]">{a.name}</span>
                <button type="button" onClick={() => removeAt(i)} className="hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Voice player (WhatsApp-style compact) ----------
export function VoiceBubble({ path }: { path: string }) {
  const url = useSignedUrl(path);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause(); else a.play();
  };
  return (
    <div className="inline-flex items-center gap-2 min-w-[180px]">
      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={toggle} disabled={!url}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="h-1 flex-1 rounded-full bg-foreground/20" />
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
