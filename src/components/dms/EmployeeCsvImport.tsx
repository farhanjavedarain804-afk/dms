import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { resources, type Employee } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Columns expected in the CSV. First row must be a header row using these keys.
const COLUMNS: (keyof Employee)[] = [
  "name", "father_husband_name", "cnic", "date_of_birth", "nationality",
  "email", "phone", "phone2", "whatsapp",
  "city", "tehsil", "district", "province", "postal_address", "permanent_address",
  "emergency_name", "emergency_relation", "emergency_phone", "emergency_whatsapp",
  "education", "work_experience",
  "department", "position", "join_date", "status",
];

const REQUIRED: (keyof Employee)[] = ["name", "email"];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQ = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { val += '"'; i++; }
        else inQ = false;
      } else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
      else val += c;
    }
  }
  if (val.length || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function downloadTemplate() {
  const header = COLUMNS.join(",");
  const sample = [
    "Ali Ahmed", "Ahmed Khan", "35201-1234567-1", "1995-04-12", "Pakistani",
    "ali@example.com", "+92 300-1234567", "", "+92 300-1234567",
    "Lahore", "Lahore", "Lahore", "punjab", "House 1, Street 2, Lahore", "Same as postal",
    "Ahmed Khan", "Father", "+92 300-7654321", "+92 300-7654321",
    "BSc Computer Science", "2 years frontend developer",
    "Engineering", "Software Engineer", "2024-01-15", "active",
  ].map((v) => `"${v.replace(/"/g, '""')}"`).join(",");
  const blob = new Blob([header + "\n" + sample + "\n"], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "employees-template.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

type Preview = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
};

export function EmployeeCsvImport() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number }>({ done: 0, total: 0, failed: 0 });

  const reset = () => { setPreview(null); setProgress({ done: 0, total: 0, failed: 0 }); if (inputRef.current) inputRef.current.value = ""; };

  const onFile = async (file: File) => {
    const text = await file.text();
    const table = parseCSV(text);
    if (table.length < 1) { toast.error("CSV is empty"); return; }
    const headers = table[0].map((h) => h.trim());
    const dataRows = table.slice(1);
    const errors: string[] = [];
    const unknown = headers.filter((h) => !COLUMNS.includes(h as keyof Employee));
    if (unknown.length) errors.push(`Unknown columns will be ignored: ${unknown.join(", ")}`);
    for (const r of REQUIRED) {
      if (!headers.includes(r)) errors.push(`Missing required column: ${r}`);
    }
    const rows = dataRows.map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
    setPreview({ headers, rows, errors });
  };

  const runImport = async () => {
    if (!preview) return;
    const rows = preview.rows.filter((r) => REQUIRED.every((k) => r[k]));
    if (!rows.length) { toast.error("No valid rows to import (name + email required)"); return; }
    setImporting(true);
    setProgress({ done: 0, total: rows.length, failed: 0 });
    let done = 0, failed = 0;
    for (const r of rows) {
      const body: any = {};
      for (const k of COLUMNS) {
        const v = r[k];
        if (v !== undefined && v !== "") body[k] = v;
      }
      if (!body.status) body.status = "active";
      if (!body.nationality) body.nationality = "Pakistani";
      try { await resources.employees.create(body); done++; }
      catch { failed++; }
      setProgress({ done: done + failed, total: rows.length, failed });
    }
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["employees"] });
    if (failed === 0) toast.success(`Imported ${done} employees`);
    else toast.warning(`Imported ${done}, ${failed} failed`);
    if (failed === 0) { setOpen(false); reset(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shadow-sm">
          <Upload className="h-4 w-4 mr-1" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Employees
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple employees at once. Download the template to see the required column format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Download template
            </Button>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Choose CSV file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            {preview && (
              <Button type="button" variant="ghost" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">CSV format</p>
            <p>Required columns: <span className="font-mono">name, email</span>. Optional columns are listed in the template. Use headers exactly as in the template.</p>
          </div>

          {preview && (
            <div className="space-y-3">
              {preview.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{preview.rows.length}</span>
                <span className="text-muted-foreground">rows detected</span>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {preview.headers.slice(0, 5).map((h) => (
                          <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>
                        ))}
                        {preview.headers.length > 5 && <th className="px-2 py-1.5 text-muted-foreground">+{preview.headers.length - 5} more</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="border-t">
                          {preview.headers.slice(0, 5).map((h) => (
                            <td key={h} className="px-2 py-1.5 truncate max-w-[160px]">{r[h] || <span className="text-muted-foreground">—</span>}</td>
                          ))}
                          {preview.headers.length > 5 && <td className="px-2 py-1.5 text-muted-foreground">…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 8 && (
                  <div className="border-t px-2 py-1.5 text-xs text-muted-foreground bg-muted/20">
                    Showing 8 of {preview.rows.length} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {importing && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Importing…</span>
                <span className="text-muted-foreground">{progress.done} / {progress.total}{progress.failed ? ` (${progress.failed} failed)` : ""}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Cancel</Button>
          <Button onClick={runImport} disabled={!preview || importing || preview.rows.length === 0}>
            {importing ? "Importing…" : preview ? `Import ${preview.rows.length} employees` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
