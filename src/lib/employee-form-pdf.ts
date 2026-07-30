// A4 Employee Application Form — clean white "registration form" layout.
// The PDF body intentionally mirrors only the fields present in the portal
// employee form, in the same section order and with the same field labels.
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
import { PK_PROVINCES } from "@/lib/pk";
import { db } from "@/lib/db-client";
const devionicLogoAsset = "/devionic-logo.png";
import type { Employee } from "@/lib/api";

// ---------------- Devionic palette (mapped to template's green/pink roles) ----------------
const NAVY: [number, number, number] = [15, 27, 61];
const TEAL: [number, number, number] = [20, 184, 166];      // primary accent (was green)
const TEAL_DARK: [number, number, number] = [13, 148, 136];
const PINK: [number, number, number] = [225, 45, 105];      // secondary accent (was pink)
const INK: [number, number, number] = [30, 34, 46];
const MUTED: [number, number, number] = [120, 128, 145];
const LINE: [number, number, number] = [175, 182, 196];
const BORDER: [number, number, number] = [210, 215, 225];

// ---------------- helpers ----------------
let _logoCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(devionicLogoAsset);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const dataUrl: string = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = blobUrl;
    });
    _logoCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

async function getDocumentMeta(path?: string): Promise<{ name: string; size: number } | null> {
  if (!path) return null;
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const filename = slash >= 0 ? path.slice(slash + 1) : path;
  try {
    const { data, error } = await db.storage
      .from("employee-documents")
      .list(folder, { search: filename, limit: 1 });
    if (error || !data || data.length === 0) return { name: filename, size: 0 };
    const size = (data[0].metadata as any)?.size ?? 0;
    return { name: filename, size };
  } catch {
    return { name: filename, size: 0 };
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "size unknown";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 300,
      color: { dark: "#0f1b3d", light: "#ffffff" },
    });
  } catch { return null; }
}

const provLabel = (v?: string) =>
  (v && PK_PROVINCES.find((p) => p.value === v)?.label) || v || "";

const salary = (n?: number) =>
  typeof n === "number" && !isNaN(n) ? n.toLocaleString("en-PK") : "";

const clip = (doc: jsPDF, text: string, maxW: number) => {
  if (!text) return "";
  const lines = doc.splitTextToSize(text, maxW);
  return lines[0] as string;
};

// ---------------- layout primitives (Application-form style, UCode inspired) ----------------
const PW = 210, PH = 297, M = 14;
const CW = PW - 2 * M;
const GAP = 6;
const ROW_H = 8.6;
const LABEL_SIZE = 8;
const VALUE_SIZE = 9;

/** Full-width solid teal section bar with white centered uppercase title. */
function sectionBanner(doc: jsPDF, y: number, title: string, _subtitle?: string) {
  const h = 5.6;
  doc.setFillColor(...TEAL);
  doc.rect(M, y, CW, h, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const cs = 0.9;
  const upper = title.toUpperCase();
  doc.setCharSpace(cs);
  const textW = doc.getTextWidth(upper) + cs * Math.max(0, upper.length - 1);
  doc.text(upper, M + (CW - textW) / 2, y + h / 2 + 1.5);
  doc.setCharSpace(0);
  return y + h + 4.2;
}

/** Small square checkbox with inline label — used for option choices. */
function checkbox(doc: jsPDF, x: number, y: number, label: string, checked: boolean, w: number) {
  const s = 2.8;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.rect(x, y - s + 0.3, s, s, "S");
  if (checked) {
    doc.setDrawColor(...TEAL_DARK);
    doc.setLineWidth(0.9);
    doc.line(x + 0.5, y - s / 2 + 0.3, x + s / 2, y - 0.1);
    doc.line(x + s / 2, y - 0.1, x + s + 0.5, y - s + 0.2);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(clip(doc, label, w - s - 3), x + s + 2, y);
}

function pillCheck(doc: jsPDF, x: number, y: number, label: string, checked: boolean) {
  const s = 2.8;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.rect(x, y - s + 0.3, s, s, "S");
  if (checked) {
    doc.setDrawColor(...TEAL_DARK);
    doc.setLineWidth(0.9);
    doc.line(x + 0.5, y - s / 2 + 0.3, x + s / 2, y - 0.1);
    doc.line(x + s / 2, y - 0.1, x + s + 0.5, y - s + 0.2);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(label, x + s + 1.8, y);
  return s + 1.8 + doc.getTextWidth(label);
}

/** Inline field: "Label:" then underline starts right after label, value sits on the line. */
function field(
  doc: jsPDF, x: number, y: number, w: number,
  label: string, value: string,
) {
  const lbl = label.replace(/:$/, "") + ":";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(...INK);
  doc.text(lbl, x, y);
  const lblW = doc.getTextWidth(lbl) + 1.6;
  const lineX = x + lblW;
  const lineW = w - lblW;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(lineX, y + 0.8, x + w, y + 0.8);
  const v = (value || "").trim();
  if (v) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(VALUE_SIZE);
    doc.setTextColor(...NAVY);
    doc.text(clip(doc, v, lineW - 1), lineX + 0.6, y - 0.2);
  }
}

function fieldRow(
  doc: jsPDF, y: number,
  items: { label: string; value?: string; w: number }[],
) {
  let x = M;
  for (const it of items) {
    field(doc, x, y, it.w, it.label, it.value ?? "");
    x += it.w + GAP;
  }
  return y + ROW_H;
}

/** Multiline "box": label inline; first-row underline starts right after label. */
function fieldBox(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string,
) {
  const lbl = label.replace(/:$/, "") + ":";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(LABEL_SIZE);
  doc.setTextColor(...INK);
  doc.text(lbl, x, y);
  const lblW = doc.getTextWidth(lbl) + 1.6;

  const rowGap = 5.2;
  const rows = Math.max(1, Math.floor((h - 1) / rowGap));
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);

  const firstLineW = w - lblW;
  const text = (value || "").trim();
  const words = text ? text.split(/\s+/) : [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(VALUE_SIZE);
  let firstChunk = "";
  let idx = 0;
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
        doc.setFont("helvetica", "bold");
        doc.setFontSize(VALUE_SIZE);
        doc.setTextColor(...NAVY);
        doc.text(firstChunk, x + lblW + 0.6, ly - 0.6);
      }
    } else {
      doc.line(x, ly, x + w, ly);
      const t = restLines[i - 1];
      if (t) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(VALUE_SIZE);
        doc.setTextColor(...NAVY);
        doc.text(t, x + 0.6, ly - 0.6);
      }
    }
  }
}

function fieldBoxRow(
  doc: jsPDF, y: number,
  items: { label: string; value?: string; w: number }[],
  h: number,
) {
  let x = M;
  for (const it of items) {
    fieldBox(doc, x, y, it.w, h, it.label, it.value ?? "");
    x += it.w + GAP;
  }
  return y + h + 3.5;
}

/** Simple signature block: label, underline for signature, name/date subline. */
function signatureBlock(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  title: string, nameLabel: string, extraLabel?: string,
) {
  const sigY = y + h - 6;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(x, sigY, x + w, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(nameLabel, x, sigY + 3.4);
  if (extraLabel) doc.text(extraLabel, x + w, sigY + 3.4, { align: "right" });
}

// ---------------- main generator ----------------
export async function generateEmployeeFormPdf(emp: Employee): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Verification metadata (records & authenticity)
  const now = new Date();
  const issueDate = now.toLocaleDateString("en-GB");
  const issueTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const idPart = String(emp.id ?? 0).padStart(4, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const verificationCode = `DEV-EMP-${yy}${mm}${dd}-${idPart}-${rand}`;
  const formNo = `REG/${now.getFullYear()}/${idPart}`;

  const setupPage = () => {
    // Clean white page — no frame
  };
  setupPage();

  // ============ HEADER — logo left, big title right (UCode-inspired) ============
  const logo = await getLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", M, 12, 44, 12); } catch { /* noop */ }
  }

  // Right: big title + meta line with underline for handwriting (dates)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text("Employee Application", PW - M, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  const metaR1 = `Form No.: ${formNo}`;
  doc.text(metaR1, PW - M, 26.4, { align: "right" });
  const metaR2 = `Issue Date: ${issueDate}   ${issueTime}`;
  doc.text(metaR2, PW - M, 30.4, { align: "right" });

  // Thin rule under header
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(M, 34, PW - M, 34);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.3);
  doc.line(M, 34.9, PW - M, 34.9);

  let y = 40;

  // ============ VERIFICATION strip (compact card, right-aligned QR) ============
  const qrPayload = JSON.stringify({
    co: COMPANY.short_name,
    id: emp.id ?? null,
    code: emp.employee_code ?? null,
    name: emp.name ?? null,
    cnic: emp.cnic ?? null,
    dept: emp.department ?? null,
    role: emp.position ?? null,
    status: emp.status ?? null,
    verification: verificationCode,
    issued: now.toISOString(),
  });
  const qr = await makeQrDataUrl(qrPayload);
  const qrSize = 18;
  const stripH = 20;
  const qrX = PW - M - qrSize;
  if (qr) {
    try { doc.addImage(qr, "PNG", qrX, y, qrSize, qrSize); } catch { /* noop */ }
  }
  // Left meta text (verification code + confidentiality)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.5);
  doc.text("VERIFICATION CODE", M, y + 3);
  doc.setCharSpace(0);
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(verificationCode, M, y + 8);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const conf = doc.splitTextToSize(
    "Confidential HR record — submitted by the applicant for records & verification purposes only. Scan the QR to verify authenticity.",
    qrX - M - 4,
  );
  doc.text(conf, M, y + 13);

  y += stripH + 2;

  // Page-break helper (keep at least `need` mm before footer)
  const FOOTER_RESERVE = 16;
  const ensure = (need: number) => {
    if (y + need > PH - FOOTER_RESERVE) {
      doc.addPage();
      setupPage();
      y = 20;
    }
  };

  // Compute age from DOB (portal shows this as computed field)
  const calcAge = (isoOrGb?: string) => {
    if (!isoOrGb) return "";
    const d = new Date(isoOrGb);
    if (isNaN(d.getTime())) return "";
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    return age > 0 ? `${age} years` : "";
  };

  const HALF = (CW - GAP) / 2;

  // ============ PERSONAL INFORMATION ============
  ensure(76);
  y = sectionBanner(doc, y, "Personal Information");
  y = fieldRow(doc, y, [
    { label: "Full Name:", value: emp.name, w: CW },
  ]);
  y = fieldRow(doc, y, [
    { label: "Father / Husband Name:", value: emp.father_husband_name, w: HALF },
    { label: "CNIC:", value: emp.cnic, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Date of Birth:", value: emp.date_of_birth, w: HALF },
    { label: "Age (auto-calculated):", value: calcAge(emp.date_of_birth), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Nationality:", value: emp.nationality, w: HALF },
    { label: "Mother's Name:", value: (emp as any).mother_name ?? "", w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Religion:", value: (emp as any).religion ?? "", w: HALF },
    { label: "Passport No.:", value: (emp as any).passport_no ?? "", w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Driving Licence No.:", value: (emp as any).driving_licence ?? "", w: CW },
  ]);

  // Gender pills (full row)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text("Gender:", M, y);
  {
    let gx = M + 18;
    const gv = ((emp as any).gender ?? "").toLowerCase();
    gx += pillCheck(doc, gx, y, "Male", gv === "male") + 8;
    gx += pillCheck(doc, gx, y, "Female", gv === "female") + 8;
    pillCheck(doc, gx, y, "Other", gv === "other");
  }
  y += 6;

  // Marital + Residence pills — two aligned columns
  doc.text("Marital Status:", M, y);
  {
    let mx = M + 30;
    const ms = ((emp as any).marital_status ?? "").toLowerCase();
    mx += pillCheck(doc, mx, y, "Married", ms === "married") + 8;
    pillCheck(doc, mx, y, "Unmarried", ms === "unmarried");
  }
  doc.text("Residence Status:", M + HALF + GAP, y);
  {
    let rx = M + HALF + GAP + 34;
    const rs = ((emp as any).residence_status ?? "").toLowerCase();
    rx += pillCheck(doc, rx, y, "Resident", rs === "resident") + 8;
    pillCheck(doc, rx, y, "Non-Resident", rs === "non_resident");
  }
  y += 8;

  // ============ ADDRESS ============
  ensure(58);
  y = sectionBanner(doc, y, "Address Information");
  y = fieldRow(doc, y, [
    { label: "City:", value: emp.city, w: (CW - 3 * GAP) / 4 },
    { label: "Tehsil:", value: emp.tehsil, w: (CW - 3 * GAP) / 4 },
    { label: "District:", value: emp.district, w: (CW - 3 * GAP) / 4 },
    { label: "Province:", value: provLabel(emp.province), w: (CW - 3 * GAP) / 4 },
  ]);
  y = fieldBoxRow(doc, y, [
    { label: "Complete Postal Address", value: emp.postal_address, w: CW },
  ], 12);
  y = fieldBoxRow(doc, y, [
    { label: "Permanent Address", value: emp.permanent_address, w: CW },
  ], 12);

  // ============ CONTACT ============
  ensure(30);
  y = sectionBanner(doc, y, "Contact Information");
  y = fieldRow(doc, y, [
    { label: "Email:", value: emp.email, w: HALF },
    { label: "Phone:", value: emp.phone, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Phone Number 2:", value: emp.phone2, w: HALF },
    { label: "WhatsApp Number:", value: emp.whatsapp, w: HALF },
  ]);

  // ============ EMERGENCY CONTACT ============
  ensure(30);
  y = sectionBanner(doc, y, "Emergency Contact");
  y = fieldRow(doc, y, [
    { label: "Contact Name:", value: emp.emergency_name, w: HALF },
    { label: "Relation:", value: emp.emergency_relation, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Contact Number:", value: emp.emergency_phone, w: HALF },
    { label: "WhatsApp Number:", value: emp.emergency_whatsapp, w: HALF },
  ]);

  // ============ EDUCATION & EXPERIENCE ============
  ensure(40);
  y = sectionBanner(doc, y, "Education & Experience");
  y = fieldBoxRow(doc, y, [
    { label: "Education", value: emp.education, w: HALF },
    { label: "Work Experience", value: emp.work_experience, w: HALF },
  ], 22);

  // ============ DOCUMENTS ============
  ensure(24);
  y = sectionBanner(doc, y, "Documents");
  const docMeta = await getDocumentMeta(emp.documents);
  const docLine = docMeta
    ? `${docMeta.name}   (${formatBytes(docMeta.size)})`
    : (emp.documents ? "Attached" : "Not attached");
  y = fieldBoxRow(doc, y, [
    { label: "Merged Documents PDF", value: docLine, w: CW },
  ], 10);

  // ============ EMPLOYMENT ============
  ensure(24);
  y = sectionBanner(doc, y, "Employment");
  y = fieldRow(doc, y, [
    { label: "Department:", value: emp.department, w: (CW - 2 * GAP) / 3 },
    { label: "Designation:", value: emp.position, w: (CW - 2 * GAP) / 3 },
    { label: "Join date:", value: emp.join_date, w: (CW - 2 * GAP) / 3 },
  ]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text("Status:", M, y);
  {
    let sxx = M + 18;
    const stv = (emp.status ?? "").toLowerCase();
    sxx += pillCheck(doc, sxx, y, "Active", stv === "active") + 8;
    sxx += pillCheck(doc, sxx, y, "Inactive", stv === "inactive") + 8;
    pillCheck(doc, sxx, y, "On Leave", stv === "on_leave");
  }
  y += 8;

  // ============ FOR OFFICE USE ONLY ============
  ensure(92);
  y = sectionBanner(doc, y, "For Office Use Only");
  y = fieldRow(doc, y, [
    { label: "Employee Code / ID:", value: emp.employee_code, w: HALF },
    { label: "Reporting Manager:", value: emp.reporting_manager, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Work Location:", value: emp.work_location, w: CW },
  ]);

  // Employment Type pills
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text("Employment Type:", M, y);
  {
    let cbx = M + 34;
    const et = (emp.employment_type ?? "").toLowerCase();
    cbx += pillCheck(doc, cbx, y, "Permanent", et === "permanent") + 6;
    cbx += pillCheck(doc, cbx, y, "Contract", et === "contract") + 6;
    cbx += pillCheck(doc, cbx, y, "Probation", et === "probation") + 6;
    cbx += pillCheck(doc, cbx, y, "Internship", et === "internship") + 6;
    pillCheck(doc, cbx, y, "Part-time", et === "part_time");
  }
  y += 8;

  y = fieldRow(doc, y, [
    { label: "Probation Period:", value: emp.probation_period, w: HALF },
    { label: "Confirmation Date:", value: emp.confirmation_date, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Contract Type:", value: emp.contract_type, w: HALF },
    { label: "Gross Salary (PKR):", value: salary(emp.gross_salary), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Bank Name:", value: emp.bank_name, w: HALF },
    { label: "Bank Account / IBAN:", value: emp.bank_account, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "NTN / Tax Number:", value: emp.tax_number, w: HALF },
    { label: "Verified By (HR):", value: emp.verified_by, w: HALF },
  ]);

  // Approval Status pills
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text("Approval Status:", M, y);
  {
    let apx = M + 32;
    const apv = (emp.approval_status ?? "").toLowerCase();
    apx += pillCheck(doc, apx, y, "Pending", apv === "pending") + 8;
    apx += pillCheck(doc, apx, y, "Approved", apv === "approved") + 8;
    pillCheck(doc, apx, y, "Rejected", apv === "rejected");
  }
  y += 8;

  y = fieldRow(doc, y, [
    { label: "Approved By:", value: emp.approved_by, w: HALF },
    { label: "Approval Date:", value: emp.approval_date, w: HALF },
  ]);
  ensure(20);
  y = fieldBoxRow(doc, y, [
    { label: "Office Remarks / Notes", value: emp.office_remarks, w: CW },
  ], 14);

  // ============ SALARY BREAKDOWN ============
  ensure(60);
  y = sectionBanner(doc, y, "Salary Breakdown (PKR)");
  y = fieldRow(doc, y, [
    { label: "Basic Salary:", value: salary((emp as any).basic_salary), w: HALF },
    { label: "House Rent Allowance:", value: salary((emp as any).house_rent_allowance), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Medical Allowance:", value: salary((emp as any).medical_allowance), w: HALF },
    { label: "Conveyance Allowance:", value: salary((emp as any).conveyance_allowance), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Other Allowances:", value: salary((emp as any).other_allowances), w: HALF },
    { label: "Gross Salary:", value: salary(emp.gross_salary), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Income Tax:", value: salary((emp as any).income_tax), w: HALF },
    { label: "EOBI:", value: salary((emp as any).eobi), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Provident Fund:", value: salary((emp as any).provident_fund), w: HALF },
    { label: "Other Deductions:", value: salary((emp as any).other_deductions), w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "Net Salary:", value: salary((emp as any).net_salary), w: CW },
  ]);

  // ============ DOCUMENT CHECKLIST (records) ============
  ensure(46);
  y = sectionBanner(doc, y, "Document Checklist", "Tick items received for the employee file");
  {
    const yn = (v?: string) => (v ?? "").toLowerCase() === "yes";
    const e = emp as any;
    const items: [string, boolean][] = [
      ["CNIC (front & back) copy", yn(e.chk_cnic_copy) || !!emp.cnic],
      ["Recent passport photograph", yn(e.chk_photograph)],
      ["Educational certificates", yn(e.chk_edu_certs) || !!emp.education],
      ["Experience letters", yn(e.chk_exp_letters) || !!emp.work_experience],
      ["Reference letters (2)", yn(e.chk_reference_letters)],
      ["Bank account / IBAN details", yn(e.chk_bank_details) || !!emp.bank_account],
      ["NTN / Tax certificate", yn(e.chk_ntn_cert) || !!emp.tax_number],
      ["Signed offer / appointment letter", yn(e.chk_offer_letter) || (emp.approval_status ?? "").toLowerCase() === "approved"],
      ["Signed NDA / confidentiality", yn(e.chk_nda)],
      ["Medical fitness certificate", yn(e.chk_medical)],
      ["Police character certificate", yn(e.chk_police)],
      ["Emergency contact form", yn(e.chk_emergency_form) || !!emp.emergency_name],
    ];
    const cols = 3;
    const colW = (CW - (cols - 1) * 4) / cols;
    const rowH = 5.4;
    for (let i = 0; i < items.length; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = M + c * (colW + 4);
      const cy = y + r * rowH + 3.2;
      checkbox(doc, cx, cy, items[i][0], items[i][1], colW);
    }
    y += Math.ceil(items.length / cols) * rowH + 4;
  }

  // ============ APPLICANT DECLARATION ============
  ensure(46);
  y = sectionBanner(doc, y, "Applicant Declaration");
  {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...INK);
    const decl =
      "I hereby declare that the information provided above is true, complete and correct to the best of my knowledge and belief. I understand that any misrepresentation, omission or false statement may result in the rejection of my application or termination of my employment with " +
      COMPANY.name +
      ". I authorise " + COMPANY.short_name +
      " to verify the details above from any source, including previous employers, educational institutions, banks and government authorities.";
    const lines = doc.splitTextToSize(decl, CW);
    doc.text(lines, M, y);
    y += lines.length * 4 + 3;
    // signature blocks: Applicant | Witness
    const w = (CW - GAP) / 2;
    const appDate = (emp as any).applicant_signature_date || issueDate;
    signatureBlock(doc, M, y, w, 22, "Applicant Signature", `Name: ${emp.name ?? ""}`, `Date: ${appDate}`);
    signatureBlock(doc, M + w + GAP, y, w, 22, "Witness Signature", "Name: ____________________", "Date: ____________");
    y += 22 + 6;
  }

  // ============ HR VERIFICATION & APPROVAL RECORD ============
  ensure(70);
  y = sectionBanner(doc, y, "HR Verification & Approval Record", "For office use only");
  const e = emp as any;
  const ynLabel = (v?: string) => {
    const s = (v ?? "").toLowerCase();
    if (s === "yes") return "Yes";
    if (s === "no") return "No";
    if (s === "cleared") return "Cleared";
    if (s === "pending") return "Pending";
    if (s === "failed") return "Failed";
    return "";
  };
  y = fieldRow(doc, y, [
    { label: "Received By:", value: e.received_by, w: HALF },
    { label: "Received Date:", value: e.received_date || issueDate, w: HALF },
  ]);
  y = fieldRow(doc, y, [
    { label: "CNIC Verified:", value: ynLabel(e.cnic_verified) || (emp.cnic ? "Yes" : ""), w: (CW - 2 * GAP) / 3 },
    { label: "Documents Verified:", value: ynLabel(e.documents_verified) || (emp.documents ? "Yes" : ""), w: (CW - 2 * GAP) / 3 },
    { label: "References Checked:", value: ynLabel(e.references_checked), w: (CW - 2 * GAP) / 3 },
  ]);
  y = fieldRow(doc, y, [
    { label: "Background Check:", value: ynLabel(e.background_check), w: HALF },
    { label: "Medical Check:", value: ynLabel(e.medical_check), w: HALF },
  ]);
  y = fieldBoxRow(doc, y, [
    { label: "HR Verification Remarks", value: e.hr_verification_remarks, w: CW },
  ], 14);

  // Three signature blocks: HR Officer | Head of HR | Managing Director
  ensure(30);
  {
    const w = (CW - 2 * GAP) / 3;
    signatureBlock(doc, M, y, w, 24,
      "HR Officer",
      `Name: ${e.hr_officer_name || emp.verified_by || "____________"}`,
      `Date: ${e.hr_officer_date || "____________"}`);
    signatureBlock(doc, M + w + GAP, y, w, 24,
      "Head of HR",
      `Name: ${e.head_of_hr_name || emp.approved_by || "____________"}`,
      `Date: ${e.head_of_hr_date || emp.approval_date || "____________"}`);
    signatureBlock(doc, M + (w + GAP) * 2, y, w, 24,
      "Managing Director",
      `Name: ${e.md_name || "____________"}`,
      `Date: ${e.md_date || "____________"}`);
    y += 24 + 4;
  }

  // ============ FOOTER (per-page) — minimal white footer with teal rule ============
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footY = PH - 10;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.5);
    doc.line(M, footY - 3, PW - M, footY - 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(COMPANY.name, M, footY);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(
      `Confidential HR Record · ${formNo} · ${verificationCode}`,
      PW / 2, footY, { align: "center" },
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(`Page ${p} / ${pageCount}`, PW - M, footY, { align: "right" });
  }




  return new Uint8Array(doc.output("arraybuffer"));
}

// ---------------- documents merge & download ----------------
async function fetchDocumentsPdfBytes(path: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await db.storage
      .from("employee-documents")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
}

export async function buildEmployeePacketPdf(emp: Employee, withDocuments: boolean): Promise<Uint8Array> {
  const formBytes = await generateEmployeeFormPdf(emp);
  if (!withDocuments || !emp.documents) return formBytes;
  const docsBytes = await fetchDocumentsPdfBytes(emp.documents);
  if (!docsBytes) return formBytes;
  const merged = await PDFDocument.create();
  const [formDoc, extraDoc] = await Promise.all([
    PDFDocument.load(formBytes),
    PDFDocument.load(docsBytes, { ignoreEncryption: true }),
  ]);
  const p1 = await merged.copyPages(formDoc, formDoc.getPageIndices());
  p1.forEach((p) => merged.addPage(p));
  const p2 = await merged.copyPages(extraDoc, extraDoc.getPageIndices());
  p2.forEach((p) => merged.addPage(p));
  return await merged.save();
}

function safeName(s: string) {
  return (s || "employee").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export async function downloadEmployeeForm(emp: Employee, withDocuments: boolean) {
  const bytes = await buildEmployeePacketPdf(emp, withDocuments);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `application_${safeName(emp.name)}${withDocuments ? "_with_documents" : ""}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printEmployeeForm(emp: Employee, withDocuments: boolean) {
  const bytes = await buildEmployeePacketPdf(emp, withDocuments);
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
