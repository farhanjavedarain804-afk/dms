// A4 Intern Application / Registration Form — matches Employee form design language.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
const devionicLogoAsset = "/devionic-logo.png";

export type InternPdfData = {
  id?: string;
  intern_code?: string;
  name?: string;
  father_name?: string;
  cnic?: string;
  email?: string;
  phone?: string;
  address?: string;
  university?: string;
  degree?: string;
  semester?: string;
  cgpa?: string;
  department?: string;
  supervisor?: string;
  start_date?: string;
  end_date?: string;
  duration_weeks?: number;
  stipend?: number;
  status?: string;
  project_assigned?: string;
  skills?: string;
  performance_rating?: number;
  attendance_pct?: number;
  certificate_issued?: boolean;
  emergency_contact?: string;
  notes?: string;
};

const NAVY: [number, number, number] = [15, 27, 61];
const TEAL: [number, number, number] = [20, 184, 166];
const TEAL_DARK: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [30, 34, 46];
const MUTED: [number, number, number] = [120, 128, 145];
const LINE: [number, number, number] = [175, 182, 196];

let _logoCache: string | null = null;
async function getLogo(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(devionicLogoAsset);
    const blob = await res.blob();
    _logoCache = await new Promise((r, j) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.onerror = j; f.readAsDataURL(blob); });
    return _logoCache;
  } catch { return null; }
}
async function makeQr(text: string): Promise<string | null> {
  try { return await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#0f1b3d", light: "#ffffff" } }); } catch { return null; }
}

const PW = 210, PH = 297, M = 14;
const CW = PW - 2 * M;
const GAP = 6;
const ROW_H = 8.6;
const LABEL_SIZE = 8;
const VALUE_SIZE = 9;

const clip = (doc: jsPDF, t: string, w: number) => (t ? (doc.splitTextToSize(t, w)[0] as string) : "");

function sectionBanner(doc: jsPDF, y: number, title: string) {
  const h = 5.6;
  doc.setFillColor(...TEAL);
  doc.rect(M, y, CW, h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const cs = 0.9;
  const upper = title.toUpperCase();
  doc.setCharSpace(cs);
  const w = doc.getTextWidth(upper) + cs * Math.max(0, upper.length - 1);
  doc.text(upper, M + (CW - w) / 2, y + h / 2 + 1.5);
  doc.setCharSpace(0);
  return y + h + 4.2;
}

function checkbox(doc: jsPDF, x: number, y: number, label: string, checked: boolean, w: number) {
  const s = 2.8;
  doc.setDrawColor(...INK); doc.setLineWidth(0.35);
  doc.rect(x, y - s + 0.3, s, s, "S");
  if (checked) {
    doc.setDrawColor(...TEAL_DARK); doc.setLineWidth(0.9);
    doc.line(x + 0.5, y - s / 2 + 0.3, x + s / 2, y - 0.1);
    doc.line(x + s / 2, y - 0.1, x + s + 0.5, y - s + 0.2);
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text(clip(doc, label, w - s - 3), x + s + 2, y);
}
function pillCheck(doc: jsPDF, x: number, y: number, label: string, checked: boolean) {
  const s = 2.8;
  doc.setDrawColor(...INK); doc.setLineWidth(0.35);
  doc.rect(x, y - s + 0.3, s, s, "S");
  if (checked) {
    doc.setDrawColor(...TEAL_DARK); doc.setLineWidth(0.9);
    doc.line(x + 0.5, y - s / 2 + 0.3, x + s / 2, y - 0.1);
    doc.line(x + s / 2, y - 0.1, x + s + 0.5, y - s + 0.2);
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text(label, x + s + 1.8, y);
  return s + 1.8 + doc.getTextWidth(label);
}

function field(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  const lbl = label.replace(/:$/, "") + ":";
  doc.setFont("helvetica", "normal"); doc.setFontSize(LABEL_SIZE); doc.setTextColor(...INK);
  doc.text(lbl, x, y);
  const lblW = doc.getTextWidth(lbl) + 1.6;
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
  doc.line(x + lblW, y + 0.8, x + w, y + 0.8);
  const v = (value || "").trim();
  if (v) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(VALUE_SIZE); doc.setTextColor(...NAVY);
    doc.text(clip(doc, v, w - lblW - 1), x + lblW + 0.6, y - 0.2);
  }
}
function fieldRow(doc: jsPDF, y: number, items: { label: string; value?: string; w: number }[]) {
  let x = M;
  for (const it of items) { field(doc, x, y, it.w, it.label, it.value ?? ""); x += it.w + GAP; }
  return y + ROW_H;
}
function fieldBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  const lbl = label.replace(/:$/, "") + ":";
  doc.setFont("helvetica", "normal"); doc.setFontSize(LABEL_SIZE); doc.setTextColor(...INK);
  doc.text(lbl, x, y);
  const lblW = doc.getTextWidth(lbl) + 1.6;
  const rowGap = 5.2;
  const rows = Math.max(1, Math.floor((h - 1) / rowGap));
  doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
  const firstLineW = w - lblW;
  const text = (value || "").trim();
  const words = text ? text.split(/\s+/) : [];
  doc.setFont("helvetica", "bold"); doc.setFontSize(VALUE_SIZE);
  let firstChunk = ""; let idx = 0;
  while (idx < words.length) {
    const trial = firstChunk ? firstChunk + " " + words[idx] : words[idx];
    if (doc.getTextWidth(trial) <= firstLineW - 1.2) { firstChunk = trial; idx++; } else break;
  }
  const rest = words.slice(idx).join(" ");
  const restLines = rest ? (doc.splitTextToSize(rest, w - 1) as string[]) : [];
  for (let i = 0; i < rows; i++) {
    const ly = y + 0.8 + i * rowGap;
    if (i === 0) {
      doc.line(x + lblW, ly, x + w, ly);
      if (firstChunk) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(VALUE_SIZE); doc.setTextColor(...NAVY);
        doc.text(firstChunk, x + lblW + 0.6, ly - 0.6);
      }
    } else {
      doc.line(x, ly, x + w, ly);
      const t = restLines[i - 1];
      if (t) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(VALUE_SIZE); doc.setTextColor(...NAVY);
        doc.text(t, x + 0.6, ly - 0.6);
      }
    }
  }
}
function fieldBoxRow(doc: jsPDF, y: number, items: { label: string; value?: string; w: number }[], h: number) {
  let x = M;
  for (const it of items) { fieldBox(doc, x, y, it.w, h, it.label, it.value ?? ""); x += it.w + GAP; }
  return y + h + 3.5;
}
function signatureBlock(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, nameLabel: string, extraLabel?: string) {
  const sigY = y + h - 6;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4);
  doc.line(x, sigY, x + w, sigY);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.4); doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x, y + 3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.text(nameLabel, x, sigY + 3.4);
  if (extraLabel) doc.text(extraLabel, x + w, sigY + 3.4, { align: "right" });
}

const money = (n?: number) => typeof n === "number" && !isNaN(n) ? n.toLocaleString("en-PK") : "";

export async function generateInternFormPdf(intern: InternPdfData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const issueDate = now.toLocaleDateString("en-GB");
  const issueTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const idPart = (intern.intern_code || String(intern.id ?? "0000")).slice(-4).padStart(4, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const verificationCode = `DEV-INT-${yy}${mm}${dd}-${idPart}-${rand}`;
  const formNo = intern.intern_code || `INT/${now.getFullYear()}/${idPart}`;

  const logo = await getLogo();
  if (logo) { try { doc.addImage(logo, "PNG", M, 12, 44, 12); } catch {} }

  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...NAVY);
  doc.text("Internship Application", PW - M, 20, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
  doc.text(`Form No.: ${formNo}`, PW - M, 26.4, { align: "right" });
  doc.text(`Issue Date: ${issueDate}   ${issueTime}`, PW - M, 30.4, { align: "right" });

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5); doc.line(M, 34, PW - M, 34);
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.3); doc.line(M, 34.9, PW - M, 34.9);

  let y = 40;

  const qrPayload = JSON.stringify({ co: COMPANY.short_name, code: intern.intern_code, name: intern.name, cnic: intern.cnic, dept: intern.department, verification: verificationCode, issued: now.toISOString() });
  const qr = await makeQr(qrPayload);
  const qrSize = 18;
  const qrX = PW - M - qrSize;
  if (qr) { try { doc.addImage(qr, "PNG", qrX, y, qrSize, qrSize); } catch {} }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.4); doc.setTextColor(...MUTED); doc.setCharSpace(0.5);
  doc.text("VERIFICATION CODE", M, y + 3); doc.setCharSpace(0);
  doc.setFont("courier", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
  doc.text(verificationCode, M, y + 8);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(...MUTED);
  const conf = doc.splitTextToSize("Confidential internship record — submitted for records & verification purposes only. Scan the QR to verify authenticity.", qrX - M - 4);
  doc.text(conf, M, y + 13);
  y += 22;

  const FOOTER_RESERVE = 16;
  const ensure = (need: number) => { if (y + need > PH - FOOTER_RESERVE) { doc.addPage(); y = 20; } };
  const HALF = (CW - GAP) / 2;

  // Personal
  ensure(46);
  y = sectionBanner(doc, y, "Personal Information");
  y = fieldRow(doc, y, [{ label: "Full Name:", value: intern.name, w: CW }]);
  y = fieldRow(doc, y, [
    { label: "Father / Guardian Name:", value: intern.father_name, w: HALF },
    { label: "CNIC / B-Form:", value: intern.cnic, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Email:", value: intern.email, w: HALF },
    { label: "Phone:", value: intern.phone, w: HALF },
  ]);
  y = fieldBoxRow(doc, y, [{ label: "Address", value: intern.address, w: CW }], 12);

  // Education
  ensure(40);
  y = sectionBanner(doc, y, "Education");
  y = fieldRow(doc, y, [
    { label: "University / Institute:", value: intern.university, w: HALF },
    { label: "Degree / Program:", value: intern.degree, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Semester:", value: intern.semester, w: HALF },
    { label: "CGPA:", value: intern.cgpa, w: HALF },
  ]);

  // Internship Details
  ensure(50);
  y = sectionBanner(doc, y, "Internship Details");
  y = fieldRow(doc, y, [
    { label: "Intern Code:", value: intern.intern_code, w: HALF },
    { label: "Department:", value: intern.department, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Supervisor:", value: intern.supervisor, w: HALF },
    { label: "Stipend (PKR):", value: money(intern.stipend), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Start Date:", value: intern.start_date, w: (CW - 2 * GAP) / 3 },
    { label: "End Date:", value: intern.end_date, w: (CW - 2 * GAP) / 3 },
    { label: "Duration (weeks):", value: intern.duration_weeks ? String(intern.duration_weeks) : "", w: (CW - 2 * GAP) / 3 },
  ]);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); doc.setTextColor(...INK);
  doc.text("Status:", M, y);
  {
    let sx = M + 18;
    const s = (intern.status ?? "").toLowerCase();
    sx += pillCheck(doc, sx, y, "Applied", s === "applied") + 8;
    sx += pillCheck(doc, sx, y, "Active", s === "active") + 8;
    sx += pillCheck(doc, sx, y, "Completed", s === "completed") + 8;
    pillCheck(doc, sx, y, "Terminated", s === "terminated");
  }
  y += 8;
  y = fieldBoxRow(doc, y, [{ label: "Project Assigned", value: intern.project_assigned, w: CW }], 12);
  y = fieldBoxRow(doc, y, [{ label: "Skills", value: intern.skills, w: CW }], 12);

  // Performance
  ensure(24);
  y = sectionBanner(doc, y, "Performance & Attendance");
  y = fieldRow(doc, y, [
    { label: "Performance Rating (1-5):", value: intern.performance_rating ? `${intern.performance_rating} / 5` : "", w: HALF },
    { label: "Attendance %:", value: intern.attendance_pct ? `${intern.attendance_pct}%` : "", w: HALF },
  ]);

  // Emergency
  ensure(20);
  y = sectionBanner(doc, y, "Emergency Contact");
  y = fieldRow(doc, y, [{ label: "Emergency Contact:", value: intern.emergency_contact, w: CW }]);

  // Checklist
  ensure(40);
  y = sectionBanner(doc, y, "Document Checklist");
  {
    const items: [string, boolean][] = [
      ["CNIC / B-Form copy", !!intern.cnic],
      ["Recent photograph", false],
      ["Student ID / Enrollment letter", !!intern.university],
      ["Latest transcript / result card", !!intern.cgpa],
      ["University recommendation letter", false],
      ["Signed internship agreement", false],
      ["NDA / Confidentiality agreement", false],
      ["Emergency contact form", !!intern.emergency_contact],
      ["Certificate of Completion (issued)", !!intern.certificate_issued],
    ];
    const cols = 3;
    const colW = (CW - (cols - 1) * 4) / cols;
    const rowH = 5.4;
    for (let i = 0; i < items.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      checkbox(doc, M + c * (colW + 4), y + r * rowH + 3.2, items[i][0], items[i][1], colW);
    }
    y += Math.ceil(items.length / cols) * rowH + 4;
  }

  // Notes
  if (intern.notes) {
    ensure(28);
    y = sectionBanner(doc, y, "Notes / Remarks");
    y = fieldBoxRow(doc, y, [{ label: "Notes", value: intern.notes, w: CW }], 18);
  }

  // Declaration + Signatures
  ensure(50);
  y = sectionBanner(doc, y, "Applicant Declaration");
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.2); doc.setTextColor(...INK);
  const decl = `I hereby declare that the information provided above is true, complete and correct to the best of my knowledge. I agree to abide by the internship policies, working hours, and confidentiality obligations of ${COMPANY.name} for the duration of my internship.`;
  const lines = doc.splitTextToSize(decl, CW);
  doc.text(lines, M, y);
  y += lines.length * 4 + 3;
  const w = (CW - GAP) / 2;
  signatureBlock(doc, M, y, w, 22, "Intern Signature", `Name: ${intern.name ?? ""}`, `Date: ${issueDate}`);
  signatureBlock(doc, M + w + GAP, y, w, 22, "Supervisor Signature", `Name: ${intern.supervisor ?? "____________________"}`, "Date: ____________");
  y += 22 + 6;

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footY = PH - 10;
    doc.setDrawColor(...TEAL); doc.setLineWidth(0.5);
    doc.line(M, footY - 3, PW - M, footY - 3);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...NAVY);
    doc.text(COMPANY.name, M, footY);
    doc.setFont("helvetica", "italic"); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
    doc.text(`Confidential Internship Record · ${formNo} · ${verificationCode}`, PW / 2, footY, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...NAVY);
    doc.text(`Page ${p} / ${pageCount}`, PW - M, footY, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s?: string) { return (s || "intern").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase(); }

export async function downloadInternForm(intern: InternPdfData) {
  const bytes = await generateInternFormPdf(intern);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `internship_application_${safeName(intern.name)}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
