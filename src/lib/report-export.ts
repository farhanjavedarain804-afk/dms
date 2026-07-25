// Report export helpers — CSV and PDF for DMS modules.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "@/lib/company";

export type ReportColumn = { key: string; label: string; format?: (v: any, row: any) => string };
export type ReportSection = {
  title: string;
  columns: ReportColumn[];
  rows: any[];
};

function fmtCell(col: ReportColumn, row: any): string {
  const v = row?.[col.key];
  if (col.format) return col.format(v, row);
  if (v == null || v === "") return "";
  return String(v);
}

export function downloadCSV(filename: string, section: ReportSection) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const header = section.columns.map((c) => esc(c.label)).join(",");
  const body = section.rows
    .map((r) => section.columns.map((c) => esc(fmtCell(c, r))).join(","))
    .join("\n");
  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadCombinedCSV(filename: string, sections: ReportSection[]) {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(`# ${s.title}`);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    parts.push(s.columns.map((c) => esc(c.label)).join(","));
    parts.push(
      s.rows.map((r) => s.columns.map((c) => esc(fmtCell(c, r))).join(",")).join("\n")
    );
    parts.push("");
  }
  const blob = new Blob([parts.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function downloadPDF(filename: string, title: string, sections: ReportSection[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 42, 74); // deep navy
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(COMPANY.name, 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(COMPANY.tagline, 40, 48);
  doc.setFontSize(9);
  const stamp = new Date().toLocaleString();
  doc.text(`Generated: ${stamp}`, pageW - 40, 48, { align: "right" });

  doc.setTextColor(15, 42, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 40, 100);

  let y = 115;
  for (const s of sections) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 42, 74);
    doc.text(`${s.title}  (${s.rows.length})`, 40, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [s.columns.map((c) => c.label)],
      body: s.rows.map((r) => s.columns.map((c) => fmtCell(c, r))),
      styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 42, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      margin: { left: 40, right: 40 },
      theme: "grid",
    });
    // @ts-expect-error autotable augments doc
    y = (doc.lastAutoTable?.finalY ?? y) + 24;
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 60;
    }
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220);
    doc.line(40, h - 40, pageW - 40, h - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${COMPANY.website}  •  ${COMPANY.email}`, 40, h - 24);
    doc.text(`Page ${i} of ${pages}`, pageW - 40, h - 24, { align: "right" });
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
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
