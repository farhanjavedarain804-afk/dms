import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Upload, FileText, Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db-client";
import { toast } from "sonner";

type Props = {
  value?: string | null;                 // stored storage path
  onChange: (path: string | null) => void;
  folder?: string;                        // e.g. "employees"
  bucket?: string;                        // default: employee-documents
};

async function fileToPdfBytes(file: File): Promise<Uint8Array> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return buf;
  }
  // Treat as image (jpg/png)
  const pdf = await PDFDocument.create();
  let image;
  if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
    image = await pdf.embedPng(buf);
  } else {
    image = await pdf.embedJpg(buf);
  }
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return await pdf.save();
}

async function mergeToOnePdf(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const f of files) {
    try {
      const bytes = await fileToPdfBytes(f);
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await merged.copyPages(src, src.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    } catch (err: any) {
      throw new Error(`Could not merge "${f.name}": ${err.message ?? err}`);
    }
  }
  return await merged.save();
}

export function DocumentUploader({ value, onChange, folder = "employees", bucket = "employee-documents" }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const totalMB = (files.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2);

  const handleUpload = async () => {
    if (!files.length) {
      toast.error("Select at least one file first");
      return;
    }
    setBusy(true);
    try {
      const pdfBytes = await mergeToOnePdf(files);
      const key = `${folder}/${crypto.randomUUID()}.pdf`;
      const { error } = await db.storage.from(bucket).upload(key, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) throw error;
      // If there was a previous file for this record, best-effort remove it.
      if (value) {
        db.storage.from(bucket).remove([value]).catch(() => {});
      }
      onChange(key);
      setFiles([]);
      toast.success(`Merged ${files.length} file(s) into a single PDF`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleView = async () => {
    if (!value) return;
    const { data, error } = await db.storage.from(bucket).createSignedUrl(value, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleRemove = async () => {
    if (!value) return;
    if (!confirm("Remove the uploaded documents PDF?")) return;
    setBusy(true);
    try {
      await db.storage.from(bucket).remove([value]);
      onChange(null);
      toast.success("Removed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Merged documents PDF uploaded</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button type="button" size="sm" variant="outline" onClick={handleView}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleRemove} disabled={busy}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border-2 border-dashed border-input bg-background hover:bg-muted/40 px-4 py-6 text-sm text-muted-foreground transition">
        <Upload className="h-4 w-4" />
        <span>Click to select PDFs or images (JPG / PNG). Multiple files allowed.</span>
        <input
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      {files.length > 0 && (
        <div className="rounded-md border bg-background">
          <ul className="divide-y text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2">
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {files.length} file(s) • {totalMB} MB total
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setFiles([])} disabled={busy}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={handleUpload} disabled={busy}>
                {busy ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Merging…</> : "Merge & upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        All selected files are combined into a single PDF and stored securely. Images become PDF pages.
      </p>
    </div>
  );
}
