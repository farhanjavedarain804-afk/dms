// Shared "Module Report" generator.
// - Renders a multi-section A4 PDF using jsPDF + autotable (branded header/footer).
// - Triggers a browser download.
// - Registers the file in the generatedDocs registry so it also appears in
//   Docs & Records (System generated) categorised as "report".
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "@/lib/company";
import { generatedDocs, type GeneratedDocCategory } from "@/lib/generated-docs";
import type { ReportColumn, ReportSection } from "@/lib/report-export";

export type ModuleReportInput = {
  module: string;            // stable id, e.g. "hr"
  moduleLabel: string;       // display, e.g. "HR & Payroll"
  title: string;             // report title
  subtitle?: string;
  category?: GeneratedDocCategory;   // defaults to "report"
  sections: ReportSection[];
  owner?: string;            // signatory / owner
  meta?: Array<{ label: string; value: string }>; // optional key facts block
};

function fmtCell(col: ReportColumn, row: any): string {
  const v = row?.[col.key];
  if (col.format) return col.format(v, row);
  if (v == null || v === "") return "";
  return String(v);
}

function buildDoc(input: ModuleReportInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(15, 42, 74);
  doc.rect(0, 0, pageW, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(COMPANY.name, 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(COMPANY.tagline || "", 40, 48);
  doc.setFontSize(8.5);
  doc.text(`${COMPANY.website || ""}  •  ${COMPANY.email || ""}`, 40, 62);
  doc.setFontSize(9);
  const stamp = new Date().toLocaleString();
  doc.text(`Generated: ${stamp}`, pageW - 40, 48, { align: "right" });
  doc.text(input.moduleLabel, pageW - 40, 62, { align: "right" });

  // Title
  doc.setTextColor(15, 42, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(input.title, 40, 108);
  if (input.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(input.subtitle, 40, 124);
  }

  let y = input.subtitle ? 140 : 124;

  // Meta strip
  if (input.meta && input.meta.length) {
    const cellW = (pageW - 80) / Math.min(input.meta.length, 4);
    let x = 40;
    let mi = 0;
    for (const m of input.meta) {
      doc.setDrawColor(230);
      doc.setFillColor(244, 247, 251);
      doc.roundedRect(x, y, cellW - 6, 34, 4, 4, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(m.label.toUpperCase(), x + 8, y + 13);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 42, 74);
      doc.text(String(m.value), x + 8, y + 27);
      x += cellW;
      mi++;
      if (mi % 4 === 0 && mi < input.meta.length) { x = 40; y += 42; }
    }
    y += 46;
  }

  for (const s of input.sections) {
    if (y > pageH - 120) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 42, 74);
    doc.text(`${s.title}  (${s.rows.length})`, 40, y);
    y += 6;

    if (s.rows.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text("No records in this section.", 40, y + 14);
      y += 30;
      continue;
    }

    autoTable(doc, {
      startY: y,
      head: [s.columns.map((c) => c.label)],
      body: s.rows.map((r) => s.columns.map((c) => fmtCell(c, r))),
      styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59], overflow: "linebreak" },
      headStyles: { fillColor: [15, 42, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      margin: { left: 40, right: 40 },
      theme: "grid",
    });
    // @ts-expect-error autotable augments doc
    y = (doc.lastAutoTable?.finalY ?? y) + 22;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220);
    doc.line(40, h - 42, pageW - 40, h - 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${COMPANY.website || ""}  •  ${COMPANY.email || ""}  •  ${COMPANY.phone || ""}`, 40, h - 26);
    doc.text(`Page ${i} of ${pages}`, pageW - 40, h - 26, { align: "right" });
  }

  return doc;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ModuleReportEntry = {
  id: string;
  module: string;
  moduleLabel: string;
  title: string;
  filename: string;
  date: string;          // dd/mm/yyyy
  created_at: string;    // ISO
  pdfDataUrl: string;
  totalRows: number;
};

const KEY = "dms:module_reports";

function readEntries(): ModuleReportEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeEntries(rows: ModuleReportEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent("dms:module_reports:changed"));
  } catch { /* quota - trim */ }
}

/** List reports for a given module (most recent first). */
export function listModuleReports(module?: string): ModuleReportEntry[] {
  const rows = readEntries().sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  return module ? rows.filter((r) => r.module === module) : rows;
}

export function removeModuleReport(id: string) {
  writeEntries(readEntries().filter((r) => r.id !== id));
  // also remove from generatedDocs if present
  try {
    const gens = generatedDocs.list();
    const match = gens.find((g) => g.template_id === "module_report" && g.doc_no === id);
    if (match) generatedDocs.remove(match.id);
  } catch { /* noop */ }
}

/** Open a saved report in a new tab. */
export function openModuleReport(entry: ModuleReportEntry) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (w) w.location.href = entry.pdfDataUrl;
}

/** Trigger download for a saved report. */
export function downloadSavedReport(entry: ModuleReportEntry) {
  // dataURL → blob
  const parts = entry.pdfDataUrl.split(",");
  const mime = parts[0].match(/data:(.*?);base64/)?.[1] ?? "application/pdf";
  const bin = atob(parts[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  triggerDownload(new Blob([bytes], { type: mime }), entry.filename);
}

/** Generate PDF, download, save to module reports store AND to Docs & Records. */
export async function downloadModuleReport(input: ModuleReportInput): Promise<ModuleReportEntry> {
  const doc = buildDoc(input);
  const totalRows = input.sections.reduce((s, sec) => s + sec.rows.length, 0);
  const stamp = new Date();
  const ymd = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const hm = `${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}`;
  const filename = `${input.module}_report_${ymd}_${hm}.pdf`;

  // Download
  const blob = doc.output("blob") as Blob;
  triggerDownload(blob, filename);

  // Persist a copy as data URL (jsPDF handles this internally)
  const pdfDataUrl = doc.output("datauristring") as string;

  const id = `mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: ModuleReportEntry = {
    id,
    module: input.module,
    moduleLabel: input.moduleLabel,
    title: input.title,
    filename,
    date: stamp.toLocaleDateString("en-GB"),
    created_at: stamp.toISOString(),
    pdfDataUrl,
    totalRows,
  };

  // Cap module reports store size (keep 40 most recent overall)
  const kept = [entry, ...readEntries()].slice(0, 40);
  writeEntries(kept);

  // Register in generatedDocs (Docs & Records → System generated)
  try {
    generatedDocs.add({
      doc_no: id,
      title: `${input.moduleLabel} — ${input.title}`,
      template_id: "module_report",
      template_name: `${input.moduleLabel} Report`,
      category: input.category ?? "report",
      party: input.moduleLabel,
      owner: input.owner ?? "System",
      signatory_title: "Auto-generated",
      date: entry.date,
      // Opts is required by the type; keep a minimal placeholder — the Docs
      // page detects module reports and previews the stored PDF directly.
      opts: {
        refNo: id,
        date: entry.date,
        subject: input.title,
        body: `${input.moduleLabel} report generated on ${entry.date}. Contains ${totalRows} record(s) across ${input.sections.length} section(s).`,
      } as any,
      // extra fields consumed by Docs page — see docs.tsx handlers
      // (kept untyped in GeneratedDoc but preserved via JSON round-trip)
      ...( { pdfDataUrl, moduleReport: true } as any ),
    } as any);
  } catch { /* noop */ }

  return entry;
}
