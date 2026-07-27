// POS-style thermal receipt (80mm wide) — clean, minimal, Devionic-branded.
import jsPDF from "jspdf";
import QRCode from "qrcode";
const logoAsset = "/devionic-logo.png";
import { COMPANY } from "@/lib/company";
import { fmtPKR } from "@/lib/pk";

export type PosSlipData = {
  txn_id: string;
  invoice_no: string;
  invoice_date?: string;
  client: string;
  client_ntn?: string;
  item_description?: string;
  invoice_total: number;
  previously_paid: number;
  amount_now: number;
  balance_after: number;
  payment_method?: string;
  bank?: string;
  reference?: string;
  received_by?: string;
  paid_on: string;
  note?: string;
};

const money = (n: number) => fmtPKR(Number(n) || 0);
const INK: [number, number, number] = [20, 24, 40];
const MUTED: [number, number, number] = [110, 116, 132];
const LINE: [number, number, number] = [210, 214, 222];

async function qr(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M", margin: 1, width: 240,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch { return null; }
}

let _logoCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(logoAsset.url);
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

export async function generatePosSlipPdf(p: PosSlipData): Promise<Uint8Array> {
  const W = 80;
  const H = 240;
  const doc = new jsPDF({ unit: "mm", format: [W, H] });
  const M = 5;
  const CW = W - 2 * M;
  let y = 6;

  const hr = (dashed = false) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    if (dashed) {
      const step = 1.1;
      for (let x = M; x < W - M; x += step * 2) doc.line(x, y, Math.min(x + step, W - M), y);
    } else {
      doc.line(M, y, W - M, y);
    }
    y += 2.4;
  };

  const center = (text: string, size = 7, bold = false, color: [number, number, number] = INK) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CW);
    for (const l of lines) {
      doc.text(l, W / 2, y, { align: "center" });
      y += size * 0.42 + 0.6;
    }
  };

  const kv = (k: string, v: string, size = 7.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...MUTED);
    doc.text(k, M, y);
    doc.setTextColor(...INK);
    const vLines = doc.splitTextToSize(v || "-", CW - 22);
    for (let i = 0; i < vLines.length; i++) {
      doc.text(vLines[i], W - M, y, { align: "right" });
      y += size * 0.42 + 0.9;
    }
  };

  const row = (k: string, v: string, bold = false, size = 8) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...INK);
    doc.text(k, M, y);
    doc.text(v, W - M, y, { align: "right" });
    y += size * 0.45 + 1.1;
  };

  // ── Logo + wordmark (centered, minimal) ──
  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      const size = 14;
      doc.addImage(logo, "PNG", (W - size) / 2, y, size, size);
      y += size + 1.5;
    } catch { /* noop */ }
  }
  center(COMPANY.short_name.toUpperCase(), 11, true);
  center(COMPANY.name, 6.5, false, MUTED);
  center(COMPANY.address, 6, false, MUTED);
  center(`${COMPANY.phone}  •  ${COMPANY.email}`, 6, false, MUTED);
  center(`NTN ${COMPANY.ntn}  •  SECP ${COMPANY.secp_cuin}`, 6, false, MUTED);
  y += 1;
  hr();

  center("PAYMENT RECEIPT", 9, true);
  y += 0.5;
  hr(true);

  // ── Meta ──
  const d = new Date(p.paid_on);
  const dateStr = isNaN(d.getTime()) ? p.paid_on : d.toLocaleString("en-GB");
  kv("Txn ID", p.txn_id);
  kv("Date", dateStr);
  kv("Invoice", p.invoice_no);
  if (p.invoice_date) kv("Inv Date", p.invoice_date);
  kv("Client", p.client);
  if (p.client_ntn) kv("Client NTN", p.client_ntn);
  y += 0.4;
  hr(true);

  // ── Description ──
  if (p.item_description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Description", M, y);
    y += 3.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...INK);
    const dl = doc.splitTextToSize(p.item_description, CW);
    for (const l of dl) { doc.text(l, M, y); y += 3.1; }
    y += 0.5;
    hr(true);
  }

  // ── Amounts ──
  row("Invoice Total", money(p.invoice_total));
  row("Previously Paid", money(p.previously_paid));
  y += 0.4;
  hr();
  row("Amount Received", money(p.amount_now), true, 10);
  hr();
  row("Balance Due", money(p.balance_after), true, 8.5);
  y += 0.4;
  hr(true);

  // ── Payment details ──
  kv("Method", (p.payment_method || "-").replace(/_/g, " ").toUpperCase());
  if (p.bank) kv("Bank", p.bank);
  if (p.reference) kv("Reference", p.reference);
  if (p.received_by) kv("Received By", p.received_by);
  y += 0.6;

  // ── Status (simple bordered pill) ──
  const status = p.balance_after <= 0 ? "PAID IN FULL" : "PARTIAL PAYMENT";
  const sw = 46, sh = 7, sx = (W - sw) / 2;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.roundedRect(sx, y, sw, sh, 1, 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(status, W / 2, y + 4.8, { align: "center" });
  y += sh + 3;

  if (p.note) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    const nl = doc.splitTextToSize(`Note: ${p.note}`, CW);
    for (const l of nl) { doc.text(l, M, y); y += 3; }
    y += 0.5;
  }

  hr(true);

  // ── QR ──
  const payload = JSON.stringify({
    co: COMPANY.short_name, txn: p.txn_id, inv: p.invoice_no,
    amt: p.amount_now, bal: p.balance_after, on: p.paid_on,
  });
  const qrData = await qr(payload);
  if (qrData) {
    const size = 22;
    doc.addImage(qrData, "PNG", (W - size) / 2, y, size, size);
    y += size + 1.2;
  }
  center("Scan to verify", 6, false, MUTED);
  y += 1;
  hr(true);

  center("Thank you for your payment", 8, true);
  center(COMPANY.website, 6.5, false, MUTED);
  y += 0.6;
  center("Computer-generated receipt", 5.8, false, MUTED);

  return new Uint8Array(doc.output("arraybuffer"));
}

function safe(s: string) { return (s || "receipt").replace(/[^a-z0-9]+/gi, "_").toLowerCase(); }

export async function downloadPosSlip(p: PosSlipData) {
  const bytes = await generatePosSlipPdf(p);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `receipt_${safe(p.invoice_no)}_${p.txn_id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printPosSlip(p: PosSlipData) {
  const bytes = await generatePosSlipPdf(p);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) w.addEventListener("load", () => { try { w.focus(); w.print(); } catch { /* noop */ } });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
