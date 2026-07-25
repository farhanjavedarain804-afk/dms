// A4 Payslip PDF — clean corporate layout matching the Devionic form style.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
import { fmtPKR } from "@/lib/pk";
import devionicLogoAsset from "@/assets/devionic-logo.png.asset.json";

const NAVY: [number, number, number] = [15, 27, 61];
const TEAL: [number, number, number] = [20, 184, 166];
const INK: [number, number, number] = [30, 34, 46];
const MUTED: [number, number, number] = [120, 128, 145];
const LINE: [number, number, number] = [175, 182, 196];
const SOFT: [number, number, number] = [245, 248, 250];

export type PayslipData = {
  id?: number | string;
  employee: string;
  cnic?: string;
  department?: string;
  designation?: string;
  month: string;
  basic?: number;
  house_rent?: number;
  medical?: number;
  conveyance?: number;
  bonus?: number;
  overtime?: number;
  gross?: number;
  income_tax?: number;
  eobi?: number;
  pessi_sessi?: number;
  provident_fund?: number;
  loan_deduction?: number;
  other_deductions?: number;
  deductions?: number;
  net?: number;
  bank?: string;
  iban?: string;
  payment_method?: string;
  paid_on?: string;
  status?: string;
  remarks?: string;
};

let _logoCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(devionicLogoAsset.url);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    _logoCache = dataUrl;
    return dataUrl;
  } catch { return null; }
}

async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 260,
      color: { dark: "#0f1b3d", light: "#ffffff" },
    });
  } catch { return null; }
}

const num = (v: any) => (v === "" || v == null ? 0 : Number(v) || 0);
const money = (n: number) => fmtPKR(n);

// Simple number to English words (Pakistani rupee context)
function numberToWords(n: number): string {
  if (!isFinite(n) || n <= 0) return "Zero Rupees Only";
  const rounded = Math.round(n);
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (x: number): string => {
    if (x < 20) return a[x];
    return b[Math.floor(x / 10)] + (x % 10 ? " " + a[x % 10] : "");
  };
  const threeDigits = (x: number): string => {
    const h = Math.floor(x / 100);
    const rest = x % 100;
    return (h ? a[h] + " Hundred" + (rest ? " " : "") : "") + (rest ? twoDigits(rest) : "");
  };
  let x = rounded;
  const parts: string[] = [];
  const crore = Math.floor(x / 10000000); x %= 10000000;
  const lakh = Math.floor(x / 100000); x %= 100000;
  const thousand = Math.floor(x / 1000); x %= 1000;
  const hundred = x;
  if (crore) parts.push(twoDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ") + " Rupees Only";
}

function monthLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export async function generatePayslipPdf(p: PayslipData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 14;
  const CW = PW - 2 * M;

  const now = new Date();
  const issueDate = now.toLocaleDateString("en-GB");
  const issueTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const idPart = String(p.id ?? Math.floor(Math.random() * 9999)).padStart(4, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const payslipNo = `PS/${now.getFullYear()}/${idPart}`;
  const verificationCode = `DEV-PS-${yy}${mm}${dd}-${idPart}-${Math.floor(1000 + Math.random() * 9000)}`;

  // ---------- Header ----------
  const logo = await getLogoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", M, 12, 44, 12); } catch { /* noop */ } }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text("Salary Payslip", PW - M, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(`Payslip No.: ${payslipNo}`, PW - M, 26.4, { align: "right" });
  doc.text(`Issue Date: ${issueDate}   ${issueTime}`, PW - M, 30.4, { align: "right" });

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.5);
  doc.line(M, 34, PW - M, 34);
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.3);
  doc.line(M, 34.9, PW - M, 34.9);

  // Company address line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...MUTED);
  doc.text(`${COMPANY.name} · ${COMPANY.address}`, M, 39.4);
  doc.text(`${COMPANY.phone} · ${COMPANY.email} · NTN ${COMPANY.ntn} · SECP CUIN ${COMPANY.secp_cuin}`, M, 43);

  let y = 50;

  // ---------- Verification strip with QR ----------
  const qrPayload = JSON.stringify({
    co: COMPANY.short_name,
    id: p.id ?? null,
    emp: p.employee ?? null,
    cnic: p.cnic ?? null,
    month: p.month ?? null,
    net: num(p.net),
    status: p.status ?? null,
    code: verificationCode,
    issued: now.toISOString(),
  });
  const qr = await makeQrDataUrl(qrPayload);
  const qrSize = 18;
  const qrX = PW - M - qrSize;
  if (qr) { try { doc.addImage(qr, "PNG", qrX, y, qrSize, qrSize); } catch { /* noop */ } }

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
    "Confidential payroll record — this is a computer-generated payslip. Scan the QR to verify authenticity.",
    qrX - M - 4,
  );
  doc.text(conf, M, y + 13);

  y += 22;

  // ---------- Section banner helper ----------
  const banner = (title: string) => {
    const h = 6.4;
    doc.setFillColor(...TEAL);
    doc.rect(M, y, CW, h, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const cs = 0.9;
    const upper = title.toUpperCase();
    doc.setCharSpace(cs);
    const textW = doc.getTextWidth(upper) + cs * Math.max(0, upper.length - 1);
    doc.text(upper, M + (CW - textW) / 2, y + h / 2 + 1.6);
    doc.setCharSpace(0);
    y += h + 5;
  };

  // Inline field: label on the left, value continues on the same line with an underline under the value area.
  const FIELD_H = 8;
  const infoField = (x: number, w: number, label: string, value: string) => {
    const labelText = label.replace(/:$/, "").toUpperCase() + ":";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.3);
    const baseY = y + FIELD_H - 2.4;
    doc.text(labelText, x, baseY);
    const labelW = doc.getTextWidth(labelText) + 0.3 * Math.max(0, labelText.length - 1);
    doc.setCharSpace(0);

    const valX = x + labelW + 2;
    const valW = w - labelW - 2;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(valX, baseY, x + w, baseY);
    if (value) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.2);
      doc.setTextColor(...NAVY);
      const clipped = doc.splitTextToSize(value, valW - 1)[0] as string;
      doc.text(clipped, valX, baseY - 0.6);
    }
  };

  // ---------- Employee & Pay Period ----------
  banner("Employee & Pay Period");
  const HALF = (CW - 6) / 2;
  const THIRD = (CW - 12) / 3;

  infoField(M, HALF, "Employee Name", p.employee ?? "");
  infoField(M + HALF + 6, HALF, "CNIC", p.cnic ?? "");
  y += FIELD_H + 2;
  infoField(M, THIRD, "Department", p.department ?? "");
  infoField(M + THIRD + 6, THIRD, "Designation", p.designation ?? "");
  infoField(M + (THIRD + 6) * 2, THIRD, "Pay Period", monthLabel(p.month));
  y += FIELD_H + 4;

  // ---------- Earnings & Deductions two-column table ----------
  banner("Earnings & Deductions");

  const colW = (CW - 6) / 2;
  const rowH = 6.2;
  const earnings: [string, number][] = [
    ["Basic Salary", num(p.basic)],
    ["House Rent Allowance", num(p.house_rent)],
    ["Medical Allowance", num(p.medical)],
    ["Conveyance Allowance", num(p.conveyance)],
    ["Bonus / Eid Bonus", num(p.bonus)],
    ["Overtime", num(p.overtime)],
  ];
  const deductions: [string, number][] = [
    ["Income Tax (FBR)", num(p.income_tax)],
    ["EOBI Contribution", num(p.eobi)],
    ["PESSI / SESSI", num(p.pessi_sessi)],
    ["Provident Fund", num(p.provident_fund)],
    ["Loan / Advance", num(p.loan_deduction)],
    ["Other Deductions", num(p.other_deductions)],
  ];

  const rows = Math.max(earnings.length, deductions.length);
  const tableH = rowH * (rows + 2);

  // Column headers
  doc.setFillColor(...SOFT);
  doc.rect(M, y, colW, rowH, "F");
  doc.rect(M + colW + 6, y, colW, rowH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.6); doc.setTextColor(...NAVY);
  doc.text("EARNINGS", M + 2, y + 4.2);
  doc.text("PKR", M + colW - 2, y + 4.2, { align: "right" });
  doc.text("DEDUCTIONS", M + colW + 6 + 2, y + 4.2);
  doc.text("PKR", M + colW + 6 + colW - 2, y + 4.2, { align: "right" });
  y += rowH;

  doc.setDrawColor(...LINE); doc.setLineWidth(0.25);
  for (let i = 0; i < rows; i++) {
    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 253);
      doc.rect(M, y, colW, rowH, "F");
      doc.rect(M + colW + 6, y, colW, rowH, "F");
    }
    doc.line(M, y + rowH, M + colW, y + rowH);
    doc.line(M + colW + 6, y + rowH, M + colW + 6 + colW, y + rowH);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.4); doc.setTextColor(...INK);
    if (earnings[i]) {
      doc.text(earnings[i][0], M + 2, y + 4.2);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
      doc.text(money(earnings[i][1]), M + colW - 2, y + 4.2, { align: "right" });
    }
    doc.setFont("helvetica", "normal"); doc.setTextColor(...INK);
    if (deductions[i]) {
      doc.text(deductions[i][0], M + colW + 6 + 2, y + 4.2);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
      doc.text(money(deductions[i][1]), M + colW + 6 + colW - 2, y + 4.2, { align: "right" });
    }
    y += rowH;
  }

  // Totals row
  const grossTotal = earnings.reduce((s, [, v]) => s + v, 0);
  const deductTotal = deductions.reduce((s, [, v]) => s + v, 0);
  doc.setFillColor(...NAVY);
  doc.rect(M, y, colW, rowH, "F");
  doc.rect(M + colW + 6, y, colW, rowH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.8); doc.setTextColor(255, 255, 255);
  doc.text("GROSS PAY", M + 2, y + 4.2);
  doc.text(money(grossTotal), M + colW - 2, y + 4.2, { align: "right" });
  doc.text("TOTAL DEDUCTIONS", M + colW + 6 + 2, y + 4.2);
  doc.text(money(deductTotal), M + colW + 6 + colW - 2, y + 4.2, { align: "right" });
  y += rowH + 6;

  // ---------- Net Payable box ----------
  const netAmt = grossTotal - deductTotal;
  const netBoxH = 22;
  doc.setFillColor(232, 250, 246);
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.6);
  doc.rect(M, y, CW, netBoxH, "FD");

  // Vertically stack: label + amount on top row (aligned), "In words" below.
  const topRowY = y + 10;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
  doc.text("NET PAYABLE", M + 5, topRowY);
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...NAVY);
  doc.text(money(netAmt), PW - M - 5, topRowY + 1, { align: "right" });

  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(`In words: ${numberToWords(netAmt)}`, M + 5, y + netBoxH - 4);
  y += netBoxH + 6;

  // ---------- Payment details ----------
  banner("Payment Details");
  infoField(M, HALF, "Bank", p.bank ?? "");
  infoField(M + HALF + 6, HALF, "IBAN / Account", p.iban ?? "");
  y += FIELD_H + 1;
  infoField(M, THIRD, "Payment Method", (p.payment_method ?? "").replace(/_/g, " "));
  infoField(M + THIRD + 6, THIRD, "Paid On", p.paid_on ?? "");
  infoField(M + (THIRD + 6) * 2, THIRD, "Status", (p.status ?? "").replace(/_/g, " ").toUpperCase());
  y += FIELD_H + 3;

  // Remarks
  if (p.remarks) {
    banner("Remarks");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.4); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(p.remarks, CW);
    doc.text(lines, M, y);
    y += lines.length * 4 + 4;
  }

  // ---------- Signatures ----------
  const sigY = Math.min(y + 8, PH - 40);
  const sigW = (CW - 12) / 3;
  const sigLabels = [
    ["Prepared By", "Accounts / Payroll"],
    ["Approved By", "Head of HR"],
    ["Received By", `Signature — ${p.employee ?? ""}`],
  ] as const;
  for (let i = 0; i < 3; i++) {
    const sx = M + i * (sigW + 6);
    doc.setDrawColor(...INK); doc.setLineWidth(0.4);
    doc.line(sx, sigY + 12, sx + sigW, sigY + 12);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); doc.setTextColor(...NAVY);
    doc.text(sigLabels[i][0].toUpperCase(), sx, sigY + 4);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTED);
    doc.text(sigLabels[i][1], sx, sigY + 16);
  }

  // ---------- Footer ----------
  const footY = PH - 10;
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.5);
  doc.line(M, footY - 3, PW - M, footY - 3);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...NAVY);
  doc.text(COMPANY.name, M, footY);
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
  doc.text(`Confidential Payroll Record · ${payslipNo} · ${verificationCode}`, PW / 2, footY, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...NAVY);
  doc.text("Page 1 / 1", PW - M, footY, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s: string) {
  return (s || "employee").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export async function downloadPayslip(p: PayslipData) {
  const bytes = await generatePayslipPdf(p);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const m = (p.month || "").slice(0, 7);
  a.download = `payslip_${safeName(p.employee)}_${m || "current"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printPayslip(p: PayslipData) {
  const bytes = await generatePayslipPdf(p);
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
