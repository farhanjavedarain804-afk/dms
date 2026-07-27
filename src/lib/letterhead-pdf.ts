// Generate PDFs on the Devionic letterhead background.
import jsPDF from "jspdf";
import letterheadAsset from "@/assets/devionic-letterhead.jpg.asset.json";
import { COMPANY } from "@/lib/company";

const INK: [number, number, number] = [30, 41, 59];
const NAVY: [number, number, number] = [26, 35, 74];

// A4 in mm
const PW = 210;
const PH = 297;
// Safe writable area measured from the letterhead artwork.
// Start just below the header/Bismillah and stop above the footer contact strip.
const CONTENT_TOP = 28;
const CONTENT_BOTTOM = PH - 14;
const M_LEFT = 8;
const M_RIGHT = 8;
const CONTENT_W = PW - M_LEFT - M_RIGHT;


let _bgCache: string | null = null;
async function getLetterheadDataUrl(): Promise<string | null> {
  if (_bgCache) return _bgCache;
  try {
    const res = await fetch(letterheadAsset);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    _bgCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

function drawBackground(doc: jsPDF, bg: string | null) {
  if (bg) {
    try { doc.addImage(bg, "JPEG", 0, 0, PW, PH); } catch { /* noop */ }
  }
}

function drawRefDate(doc: jsPDF, refNo: string, dateStr: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  // Measured from the A4 letterhead image: printed entry lines begin at
  // Ref No x≈11.4mm and Date x≈179.7mm, with the line baseline at y≈20.3mm.
  doc.text(refNo || "—", 12.4, 19.55);
  doc.text(dateStr || "—", 181, 19.55);
}

export type LetterhaedPdfOptions = {
  refNo?: string;
  date?: string; // formatted date string
  subject?: string;
  recipientLines?: string[]; // e.g. ["Mr. Ali Khan", "House 12, Street 5", "Lahore"]
  salutation?: string; // e.g. "Dear Ali,"
  body: string;
  closing?: string; // e.g. "For Devionic (Private) Limited"
  signatoryName?: string;
  signatoryTitle?: string;
};

export async function generateLetterheadPdf(opts: LetterhaedPdfOptions): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const bg = await getLetterheadDataUrl();
  drawBackground(doc, bg);
  drawRefDate(doc, opts.refNo ?? "", opts.date ?? new Date().toLocaleDateString("en-GB"));

  let y = CONTENT_TOP;

  // Recipient block
  if (opts.recipientLines && opts.recipientLines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    for (const line of opts.recipientLines) {
      if (!line) continue;
      doc.text(line, M_LEFT, y);
      y += 5;
    }
    y += 3;
  }

  // Subject
  if (opts.subject) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    const subj = `Subject: ${opts.subject}`;
    const subjLines = doc.splitTextToSize(subj, CONTENT_W);
    doc.text(subjLines, M_LEFT, y);
    y += subjLines.length * 5.2 + 3;
    // underline
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    const subjW = doc.getTextWidth(subj);
    doc.line(M_LEFT, y - 5, M_LEFT + Math.min(subjW, CONTENT_W), y - 5);
    y += 1;
  }

  // Salutation
  if (opts.salutation) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(opts.salutation, M_LEFT, y);
    y += 6;
  }

  // Body — split by paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const paragraphs = opts.body.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const lineHeight = 5.2;

  const ensureSpace = (needed: number) => {
    if (y + needed > CONTENT_BOTTOM) {
      doc.addPage();
      drawBackground(doc, bg);
      drawRefDate(doc, opts.refNo ?? "", opts.date ?? new Date().toLocaleDateString("en-GB"));
      y = CONTENT_TOP;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
    }
  };

  for (const para of paragraphs) {
    const trimmed = para.replace(/\n+$/g, "");
    // Split each newline within a paragraph so bullet lists render correctly
    const rawLines = trimmed.split("\n");
    for (const rl of rawLines) {
      const wrapped = doc.splitTextToSize(rl.length ? rl : " ", CONTENT_W);
      for (const line of wrapped) {
        ensureSpace(lineHeight);
        doc.text(line, M_LEFT, y);
        y += lineHeight;
      }
    }
    y += 2.4; // paragraph gap
  }

  // Closing + signature
  ensureSpace(38);
  y += 6;
  if (opts.closing) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(opts.closing, M_LEFT, y);
    y += 18;
  } else {
    y += 12;
  }
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(M_LEFT, y, M_LEFT + 70, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(opts.signatoryName || "Authorized Signatory", M_LEFT, y);
  if (opts.signatoryTitle) {
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(opts.signatoryTitle, M_LEFT, y);
  }
  y += 4.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text(COMPANY.name, M_LEFT, y);

  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s: string) {
  return (s || "letter").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export async function downloadLetterhead(fileName: string, opts: LetterhaedPdfOptions) {
  const bytes = await generateLetterheadPdf(opts);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(fileName)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printLetterhead(opts: LetterhaedPdfOptions) {
  const bytes = await generateLetterheadPdf(opts);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.addEventListener("load", () => {
      try { w.focus(); w.print(); } catch { /* noop */ }
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function previewLetterheadUrl(opts: LetterhaedPdfOptions): Promise<string> {
  const bytes = await generateLetterheadPdf(opts);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}
