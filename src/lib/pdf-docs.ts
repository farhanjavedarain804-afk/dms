// Modern PDF generator for Invoices & Quotations with QR code.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
import { fmtPKR } from "@/lib/pk";
const devionicLogoAsset = "/devionic-logo.png";

let _logoCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(devionicLogoAsset);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    _logoCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, width: 220, errorCorrectionLevel: "M" });
}

// ---------- Vector icon helpers (white glyphs inside purple iconBox) ----------
function iconPerson(doc: jsPDF, x: number, y: number, s = 8) {
  const cx = x + s / 2, cy = y + s / 2;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy - s * 0.18, s * 0.18, "F");
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5); doc.setLineCap("round");
  doc.line(cx - s * 0.3, cy + s * 0.28, cx + s * 0.3, cy + s * 0.28);
  doc.line(cx - s * 0.3, cy + s * 0.28, cx - s * 0.22, cy + s * 0.08);
  doc.line(cx + s * 0.3, cy + s * 0.28, cx + s * 0.22, cy + s * 0.08);
}
function iconBuilding(doc: jsPDF, x: number, y: number, s = 8) {
  doc.setFillColor(255, 255, 255);
  doc.rect(x + s * 0.22, y + s * 0.2, s * 0.56, s * 0.62, "F");
  doc.setFillColor(34, 51, 102);
  const wsz = s * 0.11;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    doc.rect(x + s * 0.3 + i * s * 0.22, y + s * 0.28 + j * s * 0.16, wsz, wsz, "F");
  }
}
function iconMonitor(doc: jsPDF, x: number, y: number, s = 7) {
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.55);
  doc.roundedRect(x + s * 0.15, y + s * 0.2, s * 0.7, s * 0.45, 0.4, 0.4, "S");
  doc.line(x + s * 0.35, y + s * 0.82, x + s * 0.65, y + s * 0.82);
  doc.line(x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.82);
}
function iconCode(doc: jsPDF, x: number, y: number, s = 7) {
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.55); doc.setLineCap("round");
  doc.line(x + s * 0.35, y + s * 0.25, x + s * 0.2, y + s * 0.5);
  doc.line(x + s * 0.2, y + s * 0.5, x + s * 0.35, y + s * 0.75);
  doc.line(x + s * 0.65, y + s * 0.25, x + s * 0.8, y + s * 0.5);
  doc.line(x + s * 0.8, y + s * 0.5, x + s * 0.65, y + s * 0.75);
  doc.line(x + s * 0.55, y + s * 0.22, x + s * 0.45, y + s * 0.78);
}
function iconGear(doc: jsPDF, x: number, y: number, s = 7) {
  const cx = x + s / 2, cy = y + s / 2;
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.circle(cx, cy, s * 0.18, "S");
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    doc.line(cx + Math.cos(a) * s * 0.25, cy + Math.sin(a) * s * 0.25,
             cx + Math.cos(a) * s * 0.38, cy + Math.sin(a) * s * 0.38);
  }
}
function iconSupport(doc: jsPDF, x: number, y: number, s = 7) {
  const cx = x + s / 2, cy = y + s / 2;
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.55);
  doc.circle(cx, cy - s * 0.05, s * 0.3, "S");
  doc.line(cx - s * 0.15, cy + s * 0.22, cx - s * 0.28, cy + s * 0.38);
}
function iconPin(doc: jsPDF, x: number, y: number, s = 4) {
  const cx = x + s / 2;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, y + s * 0.35, s * 0.32, "F");
  doc.setFillColor(20, 33, 71);
  doc.circle(cx, y + s * 0.35, s * 0.12, "F");
  doc.setFillColor(255, 255, 255);
  doc.triangle(cx - s * 0.2, y + s * 0.55, cx + s * 0.2, y + s * 0.55, cx, y + s * 0.95, "F");
}
function iconPhone(doc: jsPDF, x: number, y: number, s = 4) {
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.55); doc.setLineCap("round");
  doc.line(x + s * 0.2, y + s * 0.2, x + s * 0.45, y + s * 0.35);
  doc.line(x + s * 0.55, y + s * 0.7, x + s * 0.8, y + s * 0.85);
  doc.line(x + s * 0.45, y + s * 0.35, x + s * 0.55, y + s * 0.7);
}
function iconMail(doc: jsPDF, x: number, y: number, s = 4) {
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.rect(x + s * 0.15, y + s * 0.3, s * 0.7, s * 0.45, "S");
  doc.line(x + s * 0.15, y + s * 0.3, x + s / 2, y + s * 0.6);
  doc.line(x + s * 0.85, y + s * 0.3, x + s / 2, y + s * 0.6);
}
function iconGlobe(doc: jsPDF, x: number, y: number, s = 4) {
  const cx = x + s / 2, cy = y + s / 2;
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.45);
  doc.circle(cx, cy, s * 0.38, "S");
  doc.line(cx - s * 0.38, cy, cx + s * 0.38, cy);
  doc.ellipse(cx, cy, s * 0.16, s * 0.38, "S");
}

// Design tokens (RGB) — brand navy + teal accent
const NAVY: [number, number, number] = [26, 35, 74];
const TEAL: [number, number, number] = [20, 184, 166];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const SOFT: [number, number, number] = [245, 248, 252];

type Row = { label: string; value: string };

function header(doc: jsPDF, kind: "INVOICE" | "QUOTATION", number: string, dateISO: string, statusText: string) {
  // Top navy band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 34, "F");
  // Accent stripe
  doc.setFillColor(...TEAL);
  doc.rect(0, 34, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(COMPANY.name, 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(COMPANY.tagline, 14, 21);
  doc.setFontSize(8);
  doc.text(COMPANY.address, 14, 27, { maxWidth: 120 });

  // Right side: doc type + number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(kind, 196, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`# ${number}`, 196, 22, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Date: ${dateISO}`, 196, 27, { align: "right" });
  doc.text(`Status: ${statusText}`, 196, 31, { align: "right" });
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(x, y + 1.5, x + 82, y + 1.5);
}

function keyValues(doc: jsPDF, rows: Row[], x: number, y: number, colW = 82) {
  doc.setFontSize(9);
  let cy = y;
  for (const r of rows) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(r.label, x, cy);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(r.value || "—", colW - 28);
    doc.text(lines, x + 28, cy);
    cy += Math.max(4.6, lines.length * 4.2);
  }
  return cy;
}

function footer(doc: jsPDF) {
  const py = 287;
  doc.setDrawColor(...LINE);
  doc.line(14, py, 196, py);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${COMPANY.website}  •  ${COMPANY.email}  •  ${COMPANY.phone}   |   NTN: ${COMPANY.ntn}   SECP CUIN: ${COMPANY.secp_cuin}   STRN: ${COMPANY.strn}`,
    105,
    py + 5,
    { align: "center" },
  );
  doc.text("This is a system-generated document.", 105, py + 9, { align: "center" });
}

async function addCodes(doc: jsPDF, payload: string, refText: string, y: number) {
  // QR (left) + bank details (right). Reference no. shown as text.
  const qr = await qrDataUrl(payload);

  doc.setFillColor(...SOFT);
  doc.roundedRect(14, y, 182, 34, 2, 2, "F");

  doc.addImage(qr, "PNG", 18, y + 3, 28, 28);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Scan to verify", 32, y + 33, { align: "center" });

  // Bank block
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Bank Details", 52, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  const b = COMPANY.bank;
  const bankLines = [
    `Title: ${b.title}`,
    `Bank: ${b.bank_name}, ${b.branch}`,
    `A/C: ${b.account_no}    IBAN: ${b.iban}`,
    `SWIFT: ${b.swift}`,
  ];
  doc.text(bankLines, 52, y + 12);

  // Reference right
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Ref: ${refText}`, 192, y + 30, { align: "right" });
}

type Invoice = {
  invoice_no: string; invoice_date: string; due_date?: string;
  client: string; client_ntn?: string; client_strn?: string; client_address?: string; po_reference?: string;
  currency: string; item_description: string; quantity: number; unit_price: number;
  subtotal: number; discount: number; gst_rate: number; gst_amount: number;
  wht_rate: number; wht_amount: number; total: number; amount_paid: number; balance_due: number;
  payment_method?: string; bank?: string; tax_status?: string;
  status: string; notes?: string; terms?: string;
};

// ---------- Modern Invoice (matches provided reference) ----------
// Devionic brand palette
const PURPLE: [number, number, number] = [34, 51, 102];      // brand navy (primary)
const PURPLE_DK: [number, number, number] = [20, 33, 71];    // deep navy
const PURPLE_SOFT: [number, number, number] = [219, 244, 242]; // soft teal tint
const YELLOW: [number, number, number] = [45, 212, 204];     // brand teal accent
const CARD_BG: [number, number, number] = [240, 246, 250];   // cool off-white
const TXT: [number, number, number] = [30, 30, 45];
const SUB: [number, number, number] = [120, 120, 140];

function iconBox(doc: jsPDF, x: number, y: number, size = 8) {
  doc.setFillColor(...PURPLE);
  doc.roundedRect(x, y, size, size, 1.5, 1.5, "F");
}

export async function downloadInvoicePdf(inv: Invoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const M = 12;

  // ===== Header: Logo (wide wordmark PNG already contains name) =====
  const logo = await getLogoDataUrl();
  if (logo) {
    // logo aspect ~5.87 (1344x229) — render as 50mm x 8.5mm banner
    try { doc.addImage(logo, "PNG", M, 14, 50, 8.5); } catch { /* noop */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...PURPLE_DK);
    doc.text("DEVIONIC", M, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SUB);
    doc.text("TECHNOLOGIES", M, 24);
  }

  // Big INVOICE title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.setTextColor(...TXT);
  doc.text("INVOICE", M, 46);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...SUB);
  doc.text("Solutions that drive success.", M, 53);

  // ===== Meta Card (top-right, purple) =====
  const metaX = 122, metaY = 12, metaW = 76, metaH = 44;
  doc.setFillColor(...PURPLE_DK);
  doc.roundedRect(metaX, metaY, metaW, metaH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const metaRows: [string, string][] = [
    ["Invoice No.", inv.invoice_no],
    ["Issue Date", inv.invoice_date],
    ["Due Date", inv.due_date ?? "—"],
    ["Payment Status", ""],
  ];
  let mY = metaY + 9;
  for (const [k, v] of metaRows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 215, 255);
    doc.text(k, metaX + 4, mY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    if (v) doc.text(v, metaX + metaW - 4, mY, { align: "right" });
    mY += 8;
  }
  // Status pill
  const statusLabel = inv.status.replace(/_/g, " ").toUpperCase();
  const pillW = doc.getTextWidth(statusLabel) + 8;
  const pillX = metaX + metaW - 4 - pillW;
  const pillY = mY - 12;
  doc.setFillColor(...YELLOW);
  doc.roundedRect(pillX, pillY, pillW, 6, 3, 3, "F");
  doc.setTextColor(60, 40, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(statusLabel, pillX + pillW / 2, pillY + 4.2, { align: "center" });

  // ===== Bill To / From cards =====
  const cardY = 66, cardH = 38, cardW = 90;
  // Bill To
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, cardY, cardW, cardH, 3, 3, "F");
  iconBox(doc, M + 4, cardY + 4);
  iconPerson(doc, M + 4, cardY + 4, 8);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...TXT);
  doc.text("Bill To:", M + 15, cardY + 9);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(inv.client, M + 4, cardY + 18);
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...SUB);
  const billLines = doc.splitTextToSize(
    [inv.client_address, inv.client_ntn ? `NTN: ${inv.client_ntn}` : null, inv.client_strn ? `STRN: ${inv.client_strn}` : null]
      .filter(Boolean).join("\n") || "—",
    cardW - 8,
  );
  doc.text(billLines, M + 4, cardY + 24);

  // From
  const fromX = M + cardW + 6;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(fromX, cardY, cardW, cardH, 3, 3, "F");
  iconBox(doc, fromX + 4, cardY + 4);
  iconBuilding(doc, fromX + 4, cardY + 4, 8);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...TXT);
  doc.text("From:", fromX + 15, cardY + 9);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, fromX + 4, cardY + 18);
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...SUB);
  const fromLines = doc.splitTextToSize(
    `${COMPANY.address}\n${COMPANY.phone}  •  ${COMPANY.email}`,
    cardW - 8,
  );
  doc.text(fromLines, fromX + 4, cardY + 24);

  // ===== Items Table =====
  const tY = cardY + cardH + 8;
  const colQty = M + 118;
  const colUnit = M + 140;
  const colTotal = PW - M - 4;
  doc.setFillColor(...PURPLE);
  doc.roundedRect(M, tY, PW - 2 * M, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("#", M + 6, tY + 5.8);
  doc.text("ITEM & DESCRIPTION", M + 20, tY + 5.8);
  doc.text("QTY", colQty, tY + 5.8, { align: "center" });
  doc.text("UNIT PRICE", colUnit, tY + 5.8, { align: "center" });
  doc.text(`TOTAL (${inv.currency})`, colTotal, tY + 5.8, { align: "right" });

  // Single line item row (schema supports one)
  const rY = tY + 11;
  const rowH = 14;
  doc.setFillColor(...PURPLE_SOFT);
  doc.roundedRect(M, rY, PW - 2 * M, rowH, 2, 2, "F");
  doc.setTextColor(...SUB); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("01", M + 6, rY + rowH / 2 + 1);
  iconBox(doc, M + 13, rY + rowH / 2 - 3.5, 7);
  iconMonitor(doc, M + 13, rY + rowH / 2 - 3.5, 7);
  doc.setTextColor(...TXT); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  const descTitle = (inv.item_description || "—").split("\n")[0];
  const descRest = (inv.item_description || "").split("\n").slice(1).join(" ").trim();
  const descX = M + 24;
  const hasRest = !!descRest;
  doc.text(doc.splitTextToSize(descTitle, 88), descX, hasRest ? rY + rowH / 2 - 0.5 : rY + rowH / 2 + 1);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SUB);
  if (hasRest) doc.text(doc.splitTextToSize(descRest, 88), descX, rY + rowH / 2 + 3.5);
  doc.setTextColor(...TXT); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(String(inv.quantity ?? 0), colQty, rY + rowH / 2 + 1, { align: "center" });
  doc.text(fmtPKR(inv.unit_price), colUnit, rY + rowH / 2 + 1, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(fmtPKR((inv.quantity ?? 0) * (inv.unit_price ?? 0)), colTotal, rY + rowH / 2 + 1, { align: "right" });

  // ===== Payment Overview / QR / Totals =====
  const secY = rY + 20;
  const secH = 46;
  const colW = (PW - 2 * M - 8) / 3;

  // Payment overview (donut approximation)
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("PAYMENT OVERVIEW", M + 4, secY + 6);
  const total = inv.total || 1;
  const paidPct = Math.round(((inv.amount_paid || 0) / total) * 100);
  const duePct = Math.max(0, 100 - paidPct);
  // Ring
  const cx = M + 15, cy = secY + 28, rOut = 10, rIn = 6;
  doc.setFillColor(...PURPLE);
  doc.circle(cx, cy, rOut, "F");
  doc.setFillColor(...PURPLE_SOFT);
  // A subtle "due" wedge feel: quarter circle overlay
  if (duePct > 0) {
    doc.setFillColor(210, 220, 235);
    doc.circle(cx + rOut * 0.6, cy - rOut * 0.6, rOut * 0.55, "F");
  }
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, rIn, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...PURPLE_DK);
  doc.text(`${paidPct}%`, cx, cy - 0.5, { align: "center" });
  doc.setFontSize(6); doc.setTextColor(...SUB);
  doc.text("Paid", cx, cy + 3, { align: "center" });
  // Legend
  doc.setFontSize(8); doc.setTextColor(...TXT); doc.setFont("helvetica", "normal");
  const legX = M + 30, legValX = M + colW - 4;
  doc.setFillColor(...PURPLE); doc.circle(legX - 3, secY + 21.5, 1.2, "F");
  doc.text("Paid", legX, secY + 22.5);
  doc.text(`${paidPct}%`, legValX, secY + 22.5, { align: "right" });
  doc.setFillColor(210, 220, 235); doc.circle(legX - 3, secY + 28.5, 1.2, "F");
  doc.text("Due", legX, secY + 29.5);
  doc.text(`${duePct}%`, legValX, secY + 29.5, { align: "right" });
  doc.setDrawColor(220, 225, 235); doc.setLineWidth(0.2);
  doc.line(M + 24, secY + 33, legValX, secY + 33);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...PURPLE_DK);
  doc.text("Total", legX, secY + 38);
  doc.text(fmtPKR(inv.total), legValX, secY + 38, { align: "right" });

  // Scan & Pay (QR)
  const qrColX = M + colW + 4;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(qrColX, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("SCAN & PAY", qrColX + 4, secY + 6);
  const qr = await QRCode.toDataURL(
    `INVOICE:${inv.invoice_no}|CLIENT:${inv.client}|TOTAL:${inv.total}|BAL:${inv.balance_due}|IBAN:${COMPANY.bank.iban}`,
    { margin: 0, width: 220, errorCorrectionLevel: "M" },
  );
  doc.addImage(qr, "PNG", qrColX + colW / 2 - 11, secY + 10, 22, 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...SUB);
  doc.text("Scan to pay instantly.", qrColX + colW / 2, secY + 38, { align: "center", maxWidth: colW - 6 });

  // Totals column
  const tCol = qrColX + colW + 4;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(tCol, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TXT);
  let ttY = secY + 7;
  const row = (l: string, v: string, opts?: { bold?: boolean; muted?: boolean }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setTextColor(...(opts?.muted ? SUB : TXT));
    doc.text(l, tCol + 4, ttY);
    doc.text(v, tCol + colW - 4, ttY, { align: "right" });
    ttY += 5.4;
  };
  row("Subtotal", fmtPKR(inv.subtotal));
  row(`GST (${inv.gst_rate ?? 0}%)`, fmtPKR(inv.gst_amount));
  if (inv.discount) row("Discount", `- ${fmtPKR(inv.discount)}`, { muted: true });
  if (inv.wht_amount) row(`WHT (${inv.wht_rate ?? 0}%)`, `- ${fmtPKR(inv.wht_amount)}`, { muted: true });
  // Total Amount strip — full-width divider
  doc.setDrawColor(210, 215, 225); doc.setLineWidth(0.25);
  doc.line(tCol + 4, ttY - 2.5, tCol + colW - 4, ttY - 2.5);
  row("Total Amount", fmtPKR(inv.total), { bold: true });
  // Amount Due bar
  doc.setFillColor(...PURPLE_DK);
  doc.roundedRect(tCol + 2, ttY, colW - 4, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("Amount Due", tCol + 5, ttY + 6);
  doc.text(fmtPKR(inv.balance_due), tCol + colW - 5, ttY + 6, { align: "right" });

  // ===== Payment Methods + Bank Details =====
  const pmY = secY + secH + 6;
  const cardsH = 26;
  const pmW = (PW - 2 * M - 6) * 0.5;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, pmY, pmW, cardsH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("PAYMENT METHODS", M + 4, pmY + 6);
  const methods = ["Bank Transfer", "Raast", "JazzCash", "Easypaisa"];
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  const gap = 3;
  const widths = methods.map((m) => doc.getTextWidth(m) + 6);
  const totalW = widths.reduce((a, w) => a + w, 0) + gap * (methods.length - 1);
  const avail = pmW - 8;
  const scale = totalW > avail ? avail / totalW : 1;
  let mx = M + 4;
  for (let i = 0; i < methods.length; i++) {
    const w = widths[i] * scale;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(mx, pmY + 12, w, 8, 2, 2, "F");
    doc.setTextColor(...PURPLE_DK);
    doc.text(methods[i], mx + w / 2, pmY + 17.2, { align: "center" });
    mx += w + gap * scale;
  }

  const bkX = M + pmW + 6;
  const bkW = PW - 2 * M - pmW - 6;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(bkX, pmY, bkW, cardsH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("BANK DETAILS", bkX + 4, pmY + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.4); doc.setTextColor(...TXT);
  const b = COMPANY.bank;
  const bankL = [
    `${b.title}  •  ${b.bank_name}`,
    `${b.branch}`,
    `A/C: ${b.account_no}    IBAN: ${b.iban}`,
    `SWIFT: ${b.swift}`,
  ];
  doc.text(bankL, bkX + 4, pmY + 11, { lineHeightFactor: 1.3 });

  // ===== Footer purple bar (icons + contact + NTN) =====
  const fY = PH - 26;
  doc.setFillColor(...PURPLE_DK);
  doc.rect(0, fY, PW, 26, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(8);

  // Column 1: address with pin icon
  iconPin(doc, M, fY + 5, 4);
  doc.text(doc.splitTextToSize(COMPANY.address, 70), M + 6, fY + 8);

  // Column 2: phone, email, website with icons
  const c2 = M + 80;
  iconPhone(doc, c2, fY + 5, 4);
  doc.text(COMPANY.phone, c2 + 6, fY + 8);
  iconMail(doc, c2, fY + 11, 4);
  doc.text(COMPANY.email, c2 + 6, fY + 14);
  iconGlobe(doc, c2, fY + 17, 4);
  doc.text(COMPANY.website, c2 + 6, fY + 20);

  // Right: NTN / STRN
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text(`NTN: ${COMPANY.ntn}`, PW - M, fY + 8, { align: "right" });
  doc.text(`SECP CUIN: ${COMPANY.secp_cuin}`, PW - M, fY + 13, { align: "right" });
  doc.text(`STRN: ${COMPANY.strn}`, PW - M, fY + 18, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(230, 225, 255);
  doc.text(inv.invoice_no, PW - M, fY + 20, { align: "right" });


  doc.save(`${inv.invoice_no}.pdf`);
}


type Quotation = {
  quote_no: string; quote_date: string; valid_until?: string;
  client: string; client_ntn?: string; client_address?: string;
  contact_person?: string; contact_phone?: string; contact_email?: string;
  subject: string; scope: string; quantity: number; unit_price: number;
  subtotal: number; discount: number; gst_rate: number; gst_amount: number; total: number;
  currency: string; delivery_time?: string; payment_terms?: string; warranty?: string;
  status: string; prepared_by?: string; notes?: string;
};

export async function downloadQuotationPdf(q: Quotation) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const M = 12;

  // ===== Header: Logo =====
  const logo = await getLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", M, 14, 50, 8.5); } catch { /* noop */ }
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...PURPLE_DK);
    doc.text("DEVIONIC", M, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...SUB);
    doc.text("TECHNOLOGIES", M, 24);
  }

  // Big QUOTATION title
  doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(...TXT);
  doc.text("QUOTATION", M, 46);
  doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(...SUB);
  doc.text("Solutions that drive success.", M, 53);

  // ===== Meta Card (top-right, purple) =====
  const metaX = 122, metaY = 12, metaW = 76, metaH = 44;
  doc.setFillColor(...PURPLE_DK);
  doc.roundedRect(metaX, metaY, metaW, metaH, 3, 3, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const metaRows: [string, string][] = [
    ["Quote No.", q.quote_no],
    ["Issue Date", q.quote_date],
    ["Valid Until", q.valid_until ?? "—"],
    ["Status", ""],
  ];
  let mY = metaY + 9;
  for (const [k, v] of metaRows) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(220, 215, 255);
    doc.text(k, metaX + 4, mY);
    doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    if (v) doc.text(v, metaX + metaW - 4, mY, { align: "right" });
    mY += 8;
  }
  const statusLabel = q.status.replace(/_/g, " ").toUpperCase();
  const pillW = doc.getTextWidth(statusLabel) + 8;
  const pillX = metaX + metaW - 4 - pillW;
  const pillY = mY - 12;
  doc.setFillColor(...YELLOW);
  doc.roundedRect(pillX, pillY, pillW, 6, 3, 3, "F");
  doc.setTextColor(60, 40, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text(statusLabel, pillX + pillW / 2, pillY + 4.2, { align: "center" });

  // ===== Prepared For / From cards =====
  const cardY = 66, cardH = 38, cardW = 90;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, cardY, cardW, cardH, 3, 3, "F");
  iconBox(doc, M + 4, cardY + 4);
  iconPerson(doc, M + 4, cardY + 4, 8);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...TXT);
  doc.text("Prepared For:", M + 15, cardY + 9);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(q.client, M + 4, cardY + 18);
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...SUB);
  const billLines = doc.splitTextToSize(
    [q.client_address,
     q.client_ntn ? `NTN: ${q.client_ntn}` : null,
     q.contact_person ? `Attn: ${q.contact_person}` : null,
     [q.contact_phone, q.contact_email].filter(Boolean).join("  •  ") || null,
    ].filter(Boolean).join("\n") || "—",
    cardW - 8,
  );
  doc.text(billLines, M + 4, cardY + 24);

  const fromX = M + cardW + 6;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(fromX, cardY, cardW, cardH, 3, 3, "F");
  iconBox(doc, fromX + 4, cardY + 4);
  iconBuilding(doc, fromX + 4, cardY + 4, 8);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...TXT);
  doc.text("From:", fromX + 15, cardY + 9);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, fromX + 4, cardY + 18);
  doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...SUB);
  const fromLines = doc.splitTextToSize(
    `${COMPANY.address}\n${COMPANY.phone}  •  ${COMPANY.email}`,
    cardW - 8,
  );
  doc.text(fromLines, fromX + 4, cardY + 24);

  // ===== Subject strip =====
  const subjY = cardY + cardH + 6;
  const subjH = 11;
  doc.setFillColor(...PURPLE_SOFT);
  doc.roundedRect(M, subjY, PW - 2 * M, subjH, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...PURPLE_DK);
  doc.text("SUBJECT", M + 4, subjY + subjH / 2 + 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...TXT);
  doc.text(
    doc.splitTextToSize(q.subject || "—", PW - 2 * M - 30)[0] ?? "—",
    M + 26, subjY + subjH / 2 + 1.3,
  );

  // ===== Scope of Work Table =====
  const tY = subjY + subjH + 4;
  const colQty = M + 118;
  const colUnit = M + 140;
  const colTotal = PW - M - 4;
  doc.setFillColor(...PURPLE);
  doc.roundedRect(M, tY, PW - 2 * M, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("#", M + 6, tY + 5.8);
  doc.text("SCOPE OF WORK", M + 20, tY + 5.8);
  doc.text("QTY", colQty, tY + 5.8, { align: "center" });
  doc.text("UNIT PRICE", colUnit, tY + 5.8, { align: "center" });
  doc.text(`TOTAL (${q.currency})`, colTotal, tY + 5.8, { align: "right" });

  const scopeLines = doc.splitTextToSize(q.scope || "—", 96);
  const rowH = Math.max(14, scopeLines.length * 4.2 + 6);
  const rY = tY + 11;
  doc.setFillColor(...PURPLE_SOFT);
  doc.roundedRect(M, rY, PW - 2 * M, rowH, 2, 2, "F");
  doc.setTextColor(...SUB); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("01", M + 6, rY + rowH / 2 + 1);
  iconBox(doc, M + 13, rY + rowH / 2 - 3.5, 7);
  iconCode(doc, M + 13, rY + rowH / 2 - 3.5, 7);
  doc.setTextColor(...TXT); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const scopeStartY = scopeLines.length > 1 ? rY + 6 : rY + rowH / 2 + 1;
  doc.text(scopeLines, M + 24, scopeStartY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(String(q.quantity ?? 0), colQty, rY + rowH / 2 + 1, { align: "center" });
  doc.text(fmtPKR(q.unit_price), colUnit, rY + rowH / 2 + 1, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(fmtPKR((q.quantity ?? 0) * (q.unit_price ?? 0)), colTotal, rY + rowH / 2 + 1, { align: "right" });

  // ===== Terms / QR / Totals =====
  const secY = rY + rowH + 6;
  const secH = 46;
  const colW = (PW - 2 * M - 8) / 3;

  // Commercial terms
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("COMMERCIAL TERMS", M + 4, secY + 6);
  const terms: [string, string][] = [
    ["Delivery", q.delivery_time ?? "—"],
    ["Payment", q.payment_terms ?? "—"],
    ["Warranty", q.warranty ?? "—"],
    ["Prepared By", q.prepared_by ?? "—"],
  ];
  let tt = secY + 12;
  const termLabelW = 22;
  for (const [k, v] of terms) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...SUB);
    doc.text(k, M + 4, tt);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...TXT);
    const vl = doc.splitTextToSize(v, colW - termLabelW - 8);
    doc.text(vl, M + 4 + termLabelW, tt);
    tt += Math.max(5, vl.length * 4.2);
  }

  // Scan (QR)
  const qrColX = M + colW + 4;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(qrColX, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("SCAN QUOTE", qrColX + 4, secY + 6);
  const qr = await QRCode.toDataURL(
    `QUOTE:${q.quote_no}|CLIENT:${q.client}|TOTAL:${q.total}|VALID:${q.valid_until ?? ""}`,
    { margin: 0, width: 220, errorCorrectionLevel: "M" },
  );
  doc.addImage(qr, "PNG", qrColX + colW / 2 - 11, secY + 10, 22, 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...SUB);
  doc.text("Scan to view quote details.", qrColX + colW / 2, secY + 38, { align: "center", maxWidth: colW - 6 });

  // Totals column
  const tCol = qrColX + colW + 4;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(tCol, secY, colW, secH, 3, 3, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TXT);
  let ttY = secY + 8;
  const row = (l: string, v: string, opts?: { bold?: boolean; muted?: boolean }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setTextColor(...(opts?.muted ? SUB : TXT));
    doc.text(l, tCol + 4, ttY);
    doc.text(v, tCol + colW - 4, ttY, { align: "right" });
    ttY += 5.6;
  };
  row("Subtotal", fmtPKR(q.subtotal));
  if (q.discount) row("Discount", `- ${fmtPKR(q.discount)}`, { muted: true });
  row(`GST (${q.gst_rate ?? 0}%)`, fmtPKR(q.gst_amount));
  doc.setDrawColor(210, 215, 225); doc.setLineWidth(0.25);
  doc.line(tCol + 4, ttY - 2.5, tCol + colW - 4, ttY - 2.5);
  row("Sub Total", fmtPKR(q.total), { bold: true });
  doc.setFillColor(...PURPLE_DK);
  doc.roundedRect(tCol + 2, ttY, colW - 4, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text("Grand Total", tCol + 5, ttY + 6);
  doc.text(fmtPKR(q.total), tCol + colW - 5, ttY + 6, { align: "right" });

  // ===== Notes + Bank Details =====
  const pmY = secY + secH + 6;
  const cardsH = 26;
  const pmW = (PW - 2 * M - 6) * 0.5;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, pmY, pmW, cardsH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("NOTES", M + 4, pmY + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.6); doc.setTextColor(...SUB);
  doc.text(doc.splitTextToSize(q.notes || "Thank you for the opportunity. This quotation is valid until the date specified.", pmW - 8), M + 4, pmY + 11, { lineHeightFactor: 1.35 });

  const bkX = M + pmW + 6;
  const bkW = PW - 2 * M - pmW - 6;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(bkX, pmY, bkW, cardsH, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TXT);
  doc.text("BANK DETAILS", bkX + 4, pmY + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.4); doc.setTextColor(...TXT);
  const b = COMPANY.bank;
  const bankL = [
    `${b.title}  •  ${b.bank_name}`,
    `${b.branch}`,
    `A/C: ${b.account_no}    IBAN: ${b.iban}`,
    `SWIFT: ${b.swift}`,
  ];
  doc.text(bankL, bkX + 4, pmY + 11, { lineHeightFactor: 1.3 });

  // ===== Footer purple bar =====
  const fY = PH - 26;
  doc.setFillColor(...PURPLE_DK);
  doc.rect(0, fY, PW, 26, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  iconPin(doc, M, fY + 5, 4);
  doc.text(doc.splitTextToSize(COMPANY.address, 70), M + 6, fY + 8);
  const c2 = M + 80;
  iconPhone(doc, c2, fY + 5, 4);
  doc.text(COMPANY.phone, c2 + 6, fY + 8);
  iconMail(doc, c2, fY + 11, 4);
  doc.text(COMPANY.email, c2 + 6, fY + 14);
  iconGlobe(doc, c2, fY + 17, 4);
  doc.text(COMPANY.website, c2 + 6, fY + 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text(`NTN: ${COMPANY.ntn}`, PW - M, fY + 8, { align: "right" });
  doc.text(`SECP CUIN: ${COMPANY.secp_cuin}`, PW - M, fY + 13, { align: "right" });
  doc.text(`STRN: ${COMPANY.strn}`, PW - M, fY + 18, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(230, 225, 255);
  doc.text(q.quote_no, PW - M, fY + 20, { align: "right" });

  doc.save(`${q.quote_no}.pdf`);
}

