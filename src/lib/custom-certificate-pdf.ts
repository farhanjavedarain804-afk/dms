// Custom Certificate PDF — same formal design as the employee certificate
// (A4 portrait, holographic security bg, ornate frame, corner medallions,
//  official seal, QR authenticity). Rendered dynamically per certificate.
import jsPDF from "jspdf";
import { COMPANY } from "@/lib/company";
import {
  NAVY, GOLD, GOLD_LIGHT, INK, MUTED, FRAME, PW, PH, EMBLEM_MAX_H, EMBLEM_MARGIN,
  getLogoDataUrl, getSealDataUrl, makeQrDataUrl,
  drawHologramBackground, drawOrnateBorder, drawEmblem, drawGoldSeal
} from "./certificate-engine";

export type CustomCertificate = {
  id: number;
  cert_no: string;
  cert_type: string;
  recipient: string;
  title: string;
  body: string;
  issue_date: string;
  issued_by: string;
  signer_designation?: string;
  reference?: string;
  status: "active" | "revoked";
  created_at?: string;
};


const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const prettyDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return iso; }
};

async function generatePdf(c: CustomCertificate): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawHologramBackground(doc);
  drawOrnateBorder(doc);

  const logo = await getLogoDataUrl();
  const seal = await getSealDataUrl();

  // Header meta strip
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(`CERTIFICATE NO: ${c.cert_no}`, PW - 20, 24, { align: "right" });
  doc.text(`DATE: ${prettyDate(c.issue_date).toUpperCase()}`, PW - 20, 28, { align: "right" });
  doc.text("OFFICE OF THE CEO", 20, 24);
  doc.text("REGISTRAR & VERIFICATION DIVISION", 20, 28);

  drawEmblem(doc, PW / 2, 40, logo);

  // Company
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...NAVY);
  doc.text(COMPANY.name.toUpperCase(), PW / 2, 62, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("OFFICE OF THE CEO  \u2022  REGISTRAR & VERIFICATION DIVISION", PW / 2, 67, { align: "center" });
  doc.text(COMPANY.address, PW / 2, 71.5, { align: "center" });

  // Certificate title
  doc.setFont("times", "bolditalic"); doc.setFontSize(26); doc.setTextColor(...NAVY);
  doc.text(c.title || c.cert_type || "Certificate", PW / 2, 90, { align: "center" });
  if (c.cert_type && c.cert_type !== c.title) {
    doc.setFont("times", "italic"); doc.setFontSize(13); doc.setTextColor(...GOLD);
    doc.text(c.cert_type, PW / 2, 98, { align: "center" });
  }

  // Divider
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4);
  doc.line(PW / 2 - 40, 103, PW / 2 - 6, 103);
  doc.line(PW / 2 + 6, 103, PW / 2 + 40, 103);
  doc.setFillColor(...GOLD); doc.circle(PW / 2, 103, 1.1, "F");

  // Presentation
  doc.setFont("times", "italic"); doc.setFontSize(11.5); doc.setTextColor(...MUTED);
  doc.text("This certificate is proudly presented to", PW / 2, 115, { align: "center" });

  // Recipient
  doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize((c.recipient || "-").toUpperCase(), PW - 60);
  doc.text(nameLines, PW / 2, 130, { align: "center" });

  // Body
  doc.setFont("times", "normal"); doc.setFontSize(11.5); doc.setTextColor(...INK);
  const body = (c.body || "in recognition of outstanding contribution and dedication.").trim();
  const bodyLines = doc.splitTextToSize(body, PW - 60);
  const bodyStartY = 148;
  bodyLines.slice(0, 7).forEach((ln: string, i: number) => {
    doc.text(ln, PW / 2, bodyStartY + i * 6.2, { align: "center" });
  });

  // Reference pill
  if (c.reference) {
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text(`Reference: ${c.reference}`, PW / 2, 200, { align: "center" });
  }

  // Given under my hand
  const given = `GIVEN under my hand and the official seal of ${COMPANY.short_name}, this ${prettyDate(c.issue_date)}.`;
  doc.setFont("times", "italic"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  const givenLines = doc.splitTextToSize(given, PW - 70);
  doc.text(givenLines, PW / 2, 215, { align: "center" });

  // Signature (left)
  const sigX = 50, sigY = 244;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4);
  doc.line(sigX - 25, sigY, sigX + 25, sigY);
  doc.setFont("times", "bolditalic"); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(c.issued_by || "Authorised Signatory", sigX, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text((c.signer_designation || "Authorised Signatory").toUpperCase(), sigX, sigY + 10, { align: "center" });
  doc.text(COMPANY.short_name.toUpperCase(), sigX, sigY + 14, { align: "center" });

  // Seal (right)
  drawGoldSeal(doc, PW - 55, sigY + 8, 22, seal);

  // QR (top-right small)
  const qrPayload = JSON.stringify({
    co: COMPANY.short_name, cert: c.cert_no, to: c.recipient, date: c.issue_date, ref: c.reference || null, status: c.status,
  });
  const qr = await makeQrDataUrl(qrPayload);
  if (qr) { try { doc.addImage(qr, "PNG", PW - 36, 36, 16, 16); } catch { /* noop */ } }

  // Footer
  const FOOTER_INSET = 28;
  const INNER_W = PW - FOOTER_INSET * 2;
  const LINE_H = 3.6;
  const contactText = `${COMPANY.address}  \u2022  ${COMPANY.phone}  \u2022  ${COMPANY.email}  \u2022  ${COMPANY.website}`;
  const legalText = `CONFIDENTIAL  \u2014  Electronically issued and property of the Company. Verify authenticity via Cert #${c.cert_no}${c.reference ? "  \u2022  Ref: " + c.reference : ""}.`;
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); doc.setCharSpace(0);
  const contactLines = doc.splitTextToSize(contactText, INNER_W) as string[];
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.2);
  const legalLines = doc.splitTextToSize(legalText, INNER_W) as string[];
  const totalLines = contactLines.length + legalLines.length;
  const blockH = totalLines * LINE_H;
  const blockBottom = PH - 18;
  const firstY = blockBottom - blockH + LINE_H;
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); doc.setTextColor(...INK);
  contactLines.forEach((ln, i) => doc.text(ln, PW / 2, firstY + i * LINE_H, { align: "center" }));
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.2); doc.setTextColor(...MUTED);
  legalLines.forEach((ln, i) => doc.text(ln, PW / 2, firstY + (contactLines.length + i) * LINE_H, { align: "center" }));

  // REVOKED overlay
  if (c.status === "revoked") {
    doc.saveGraphicsState();
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold"); doc.setFontSize(90);
    doc.text("REVOKED", PW / 2, PH / 2 + 10, { align: "center", angle: 30 } as any);
    doc.restoreGraphicsState();
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s: string) {
  return (s || "certificate").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export async function downloadCustomCertificate(c: CustomCertificate) {
  const bytes = await generatePdf(c);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${c.cert_no}_${safeName(c.recipient)}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printCustomCertificate(c: CustomCertificate) {
  const bytes = await generatePdf(c);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) w.addEventListener("load", () => { try { w.focus(); w.print(); } catch { /* noop */ } });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
