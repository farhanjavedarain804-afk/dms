import { useState } from "react";
import { Upload, FileText, Loader2, ExternalLink, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db-client";
import { toast } from "sonner";

type Props = {
  value?: string | null;   // stored as "path::originalFileName"
  onChange: (val: string | null) => void;
  folder?: string;
  bucket?: string;
};

const ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/*",
  "text/*",
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.zip,.rar,.7z,.jpg,.jpeg,.png,.gif,.webp,.svg,.heic",
].join(",");

function parse(v?: string | null): { path: string; name: string } | null {
  if (!v) return null;
  const idx = v.indexOf("::");
  if (idx === -1) return { path: v, name: v.split("/").pop() ?? v };
  return { path: v.slice(0, idx), name: v.slice(idx + 2) };
}

export function FileAttachment({ value, onChange, folder = "docs", bucket = "docs-attachments" }: Props) {
  const [busy, setBusy] = useState(false);
  const current = parse(value);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const key = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from(bucket).upload(key, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw error;
      if (current?.path) {
        db.storage.from(bucket).remove([current.path]).catch(() => {});
      }
      onChange(`${key}::${file.name}`);
      toast.success("File attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const view = async () => {
    if (!current) return;
    const { data, error } = await db.storage.from(bucket).createSignedUrl(current.path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const download = async () => {
    if (!current) return;
    const { data, error } = await db.storage.from(bucket).createSignedUrl(current.path, 300, { download: current.name });
    if (error) return toast.error(error.message);
    window.location.href = data.signedUrl;
  };

  const remove = async () => {
    if (!current) return;
    if (!confirm("Remove the attached file?")) return;
    setBusy(true);
    try {
      await db.storage.from(bucket).remove([current.path]);
      onChange(null);
      toast.success("Removed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {current && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate" title={current.name}>{current.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button type="button" size="sm" variant="outline" onClick={view}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={download}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={busy}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border-2 border-dashed border-input bg-background hover:bg-muted/40 px-4 py-6 text-sm text-muted-foreground transition">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span>{busy ? "Uploading…" : current ? "Replace file" : "Attach PDF, Word, Excel, PPT, image, or any file"}</span>
        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Supported: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, images (JPG, PNG, GIF, WEBP, SVG), TXT, CSV, ZIP and more.
      </p>
    </div>
  );
}
