// Simple, clean PDF generator for Purchase Orders, GRNs and Vendor Bills.
import jsPDF from "jspdf";
import { COMPANY } from "@/lib/company";
import { fmtPKR } from "@/lib/pk";
const devionicLogoAsset = "/devionic-logo.png";

let _logo: string | null = null;
async function logoDataUrl(): Promise<string | null> {
  if (_logo) return _logo;
  try {
    const r = await fetch(devionicLogoAsset.url);
    const b = await r.blob();
    const u: string = await new Promise((res, rej) => {
      const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(b);
    });
    _logo = u; return u;
  } catch { return null; }
}

const NAVY: [number, number, number] = [12, 39, 74];
const TEAL: [number, number, number] = [45, 212, 204];
const INK: [number, number, number] = [30, 30, 45];
const SUB: [number, number, number] = [110, 110, 130];
const CARD: [number, number, number] = [240, 246, 250];

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  total?: number;
};

export type PurchaseDoc = {
  kind: "PURCHASE ORDER" | "GOODS RECEIPT NOTE" | "VENDOR BILL";
  doc_no: string;
  doc_date: string;
  ref_no?: string;
  vendor: string;
  vendor_ntn?: string;
  vendor_strn?: string;
  vendor_address?: string;
  vendor_contact?: string;
  items: LineItem[];
  subtotal: number;
  tax_amount: number;
  wht_amount?: number;
  total: number;
  status?: string;
  notes?: string;
  terms?: string;
  due_date?: string;
  warehouse?: string;
  po_reference?: string;
};

export async function downloadPurchaseDoc(d: PurchaseDoc) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 14;
  const logo = await logoDataUrl();

  // Header
  if (logo) { try { doc.addImage(logo, "PNG", M, 12, 46, 8); } catch { /* noop */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text(COMPANY.name, M, 26);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...SUB);
  doc.text(`${COMPANY.address}`, M, 30);
  doc.text(`Tel: ${COMPANY.phone}  •  ${COMPANY.email}  •  ${COMPANY.website}`, M, 33.5);
  doc.text(`NTN: ${COMPANY.ntn}  •  SECP UIN: ${COMPANY.secp_cuin}`, M, 37);

  // Title block right
  doc.setFillColor(...NAVY); doc.roundedRect(130, 12, 66, 30, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(d.kind, 163, 21, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`No: ${d.doc_no}`, 134, 28);
  doc.text(`Date: ${d.doc_date}`, 134, 32.5);
  if (d.due_date) doc.text(`Due: ${d.due_date}`, 134, 37);
  else if (d.po_reference) doc.text(`PO Ref: ${d.po_reference}`, 134, 37);

  // Vendor card
  const vY = 46;
  doc.setFillColor(...CARD); doc.roundedRect(M, vY, 96, 32, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Vendor / Supplier", M + 3, vY + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text(d.vendor, M + 3, vY + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...SUB);
  const vLines: string[] = [];
  if (d.vendor_address) vLines.push(...doc.splitTextToSize(d.vendor_address, 90));
  if (d.vendor_contact) vLines.push(d.vendor_contact);
  if (d.vendor_ntn) vLines.push(`NTN: ${d.vendor_ntn}${d.vendor_strn ? `  STRN: ${d.vendor_strn}` : ""}`);
  vLines.slice(0, 4).forEach((l, i) => doc.text(l, M + 3, vY + 16 + i * 4));

  // Meta card
  doc.setFillColor(...CARD); doc.roundedRect(115, vY, 81, 32, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text("Details", 118, vY + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
  const meta: [string, string][] = [
    ["Status", (d.status ?? "—").toUpperCase()],
    ...(d.warehouse ? [["Warehouse", d.warehouse] as [string, string]] : []),
    ...(d.ref_no ? [["Reference", d.ref_no] as [string, string]] : []),
  ];
  meta.forEach(([k, v], i) => {
    doc.setTextColor(...SUB); doc.text(k, 118, vY + 11 + i * 5);
    doc.setTextColor(...INK); doc.text(v, 193, vY + 11 + i * 5, { align: "right" });
  });

  // Items table
  let y = 86;
  doc.setFillColor(...NAVY); doc.rect(M, y, 182, 8, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("#", M + 2, y + 5.5);
  doc.text("Description", M + 10, y + 5.5);
  doc.text("Qty", M + 108, y + 5.5, { align: "right" });
  doc.text("Rate", M + 132, y + 5.5, { align: "right" });
  doc.text("Tax%", M + 150, y + 5.5, { align: "right" });
  doc.text("Amount", M + 180, y + 5.5, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
  d.items.forEach((it, idx) => {
    const desc = doc.splitTextToSize(it.description || "—", 90);
    const rowH = Math.max(6, desc.length * 4.2);
    if (idx % 2 === 0) { doc.setFillColor(248, 250, 253); doc.rect(M, y - 4, 182, rowH + 2, "F"); }
    doc.text(String(idx + 1), M + 2, y);
    doc.text(desc, M + 10, y);
    doc.text(String(it.quantity ?? 0), M + 108, y, { align: "right" });
    doc.text(fmtPKR(it.unit_price), M + 132, y, { align: "right" });
    doc.text(String(it.tax_rate ?? 0), M + 150, y, { align: "right" });
    const amt = (it.total ?? (Number(it.quantity) * Number(it.unit_price)));
    doc.text(fmtPKR(amt), M + 180, y, { align: "right" });
    y += rowH + 2;
  });

  // Totals
  y += 4;
  const tX = 130;
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.4);
  doc.line(tX, y, M + 182, y); y += 6;
  const totRows: [string, string][] = [
    ["Subtotal", fmtPKR(d.subtotal)],
    ["Tax (GST)", fmtPKR(d.tax_amount)],
    ...(d.wht_amount ? [["WHT", `- ${fmtPKR(d.wht_amount)}`] as [string, string]] : []),
  ];
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...SUB);
  totRows.forEach(([k, v]) => {
    doc.text(k, tX, y); doc.setTextColor(...INK); doc.text(v, M + 180, y, { align: "right" });
    doc.setTextColor(...SUB); y += 5;
  });
  y += 2;
  doc.setFillColor(...NAVY); doc.roundedRect(tX - 2, y - 4, M + 184 - tX, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("TOTAL", tX + 2, y + 1.5);
  doc.text(fmtPKR(d.total), M + 180, y + 1.5, { align: "right" });
  y += 12;

  // Notes / Terms
  if (d.notes || d.terms) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text("Notes & Terms", M, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK);
    const notes = [d.notes, d.terms].filter(Boolean).join("\n");
    const nl = doc.splitTextToSize(notes, 182);
    doc.text(nl, M, y); y += nl.length * 4;
  }

  // Footer
  doc.setDrawColor(...TEAL); doc.setLineWidth(0.3); doc.line(M, 282, M + 182, 282);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...SUB);
  doc.text(`${d.kind} • Generated by Devionic ERP • Confidential`, 105, 287, { align: "center" });

  doc.save(`${d.kind.replace(/\s+/g, "-").toLowerCase()}-${d.doc_no}.pdf`);
}
