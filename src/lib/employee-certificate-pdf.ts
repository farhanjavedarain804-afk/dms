// Certificate of Registration & Records Verification — A4 formal certificate
// Classic decorative style with hologram / guilloché security effects.
import jsPDF from "jspdf";
import { COMPANY } from "@/lib/company";
import type { Employee } from "@/lib/api";
import {
  NAVY, GOLD, INK, MUTED, PW, PH, EMBLEM_MAX_H, EMBLEM_MARGIN,
  getLogoDataUrl, getSealDataUrl, makeQrDataUrl,
  drawHologramBackground, drawOrnateBorder, drawEmblem, drawGoldSeal
} from "./certificate-engine";

const PW = 210, PH = 297;

const today = () => {
  const d = new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
};

const certNo = (emp: Employee) => {
  const y = new Date().getFullYear();
  const idPart = String(emp.id ?? Math.floor(Math.random() * 9000 + 1000)).padStart(4, "0");
  return `DEV/HR/CERT/${y}/${idPart}`;
};






export async function generateCertificatePdf(emp: Employee): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Layer 1: Holographic security background
  drawHologramBackground(doc);
  // Watermark removed per request — cleaner background.

  // Layer 2: Ornate frame
  drawOrnateBorder(doc);

  // Layer 3: Header — meta strip (logo shown as centered emblem below)
  const logo = await getLogoDataUrl();
  const seal = await getSealDataUrl();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`CERTIFICATE NO: ${certNo(emp)}`, PW - 20, 24, { align: "right" });
  doc.text(`DATE: ${today().toUpperCase()}`, PW - 20, 28, { align: "right" });
  doc.text("OFFICE OF THE CEO", 20, 24);
  doc.text("REGISTRAR & VERIFICATION DIVISION", 20, 28);

  // Emblem — centered Devionic logo
  drawEmblem(doc, PW / 2, 20 + EMBLEM_MAX_H / 2 + EMBLEM_MARGIN / 2 + 18, logo);


  // Registry title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(COMPANY.name.toUpperCase(), PW / 2, 62, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("OFFICE OF THE CEO  •  REGISTRAR & VERIFICATION DIVISION", PW / 2, 67, { align: "center" });
  doc.text(COMPANY.address, PW / 2, 71.5, { align: "center" });

  // Certificate title (classic)
  doc.setFont("times", "bolditalic");
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text("Certificate of Registration", PW / 2, 87, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text("& Records Verification", PW / 2, 95, { align: "center" });

  // Ornamental divider
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(PW / 2 - 40, 99, PW / 2 - 6, 99);
  doc.line(PW / 2 + 6, 99, PW / 2 + 40, 99);
  doc.setFillColor(...GOLD);
  doc.circle(PW / 2, 99, 1.1, "F");

  // Body preamble
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  const p1 = `IN THE MATTER OF THE EMPLOYEE REGISTRATION & RECORDS`;
  const p2 = `VERIFICATION PROTOCOL of ${COMPANY.name}, Revised Edition ${new Date().getFullYear()};`;
  doc.text(p1, PW / 2, 108, { align: "center" });
  doc.text(p2, PW / 2, 113.5, { align: "center" });

  const intro =
    `AND IN THE MATTER of the application duly submitted for registration ` +
    `and for the issuance of a Certificate of Registration & Records Verification ` +
    `in favour of the person named hereunder:`;
  const introLines = doc.splitTextToSize(intro, PW - 60);
  doc.text(introLines, PW / 2, 122, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("IT IS HEREBY CERTIFIED THAT", PW / 2, 138, { align: "center" });

  // Employee name — hero
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize((emp.name || "—").toUpperCase(), PW - 60);
  doc.text(nameLines, PW / 2, 150, { align: "center" });

  // Sub-identifier line
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  const codeLine = `(Employee Code: ${emp.employee_code || "—"}${emp.cnic ? `  •  CNIC: ${emp.cnic}` : ""})`;
  doc.text(codeLine, PW / 2, 160, { align: "center" });

  // Body statement
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  const stmt =
    `has been duly enrolled and registered as an employee of ${COMPANY.name}, ` +
    `and that the personal, contact, academic and employment particulars submitted ` +
    `at the time of registration have been examined, cross-checked and verified in ` +
    `accordance with the aforesaid Human Resources Protocol and stand recorded in ` +
    `the Official Registry of the Company.`;
  const stmtLines = doc.splitTextToSize(stmt, PW - 60);
  doc.text(stmtLines, PW / 2, 170, { align: "center" });

  // Key facts (three inline pill lines — kept concise, formal)
  const facts: string[] = [];
  if (emp.position) facts.push(`Designation: ${emp.position}`);
  if (emp.department) facts.push(`Department: ${emp.department}`);
  if (emp.join_date) facts.push(`Date of Joining: ${emp.join_date}`);
  if (emp.employment_type) facts.push(`Type: ${emp.employment_type.replace(/_/g, " ")}`);
  if (emp.work_location) facts.push(`Location: ${emp.work_location}`);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const factLines = doc.splitTextToSize(facts.join("  •  "), PW - 60);
  doc.text(factLines, PW / 2, 190, { align: "center" });

  // Closing "GIVEN under my hand..."
  const given =
    `GIVEN under my hand and the official seal of the Office of the CEO — Registrar & Verification Division, ${COMPANY.short_name}, ` +
    `this ${today()}.`;
  const givenLines = doc.splitTextToSize(given, PW - 70);
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(givenLines, PW / 2, 210, { align: "center" });

  // Signature (left) + seal (right)
  const sigX = 50, sigY = 240;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(sigX - 25, sigY, sigX + 25, sigY);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(emp.approved_by || "Authorised Signatory", sigX, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("OFFICE OF THE CEO", sigX, sigY + 10, { align: "center" });
  doc.text("REGISTRAR & VERIFICATION DIVISION", sigX, sigY + 14, { align: "center" });

  // Gold hologram seal
  drawGoldSeal(doc, PW - 55, sigY + 8, 22, seal);

  // QR (small, bottom-left inside frame)
  const qrPayload = JSON.stringify({
    co: COMPANY.short_name,
    cert: certNo(emp),
    id: emp.id ?? null,
    code: emp.employee_code ?? null,
    name: emp.name ?? null,
    cnic: emp.cnic ?? null,
    issued: new Date().toISOString().slice(0, 10),
  });
  const qr = await makeQrDataUrl(qrPayload);
  const qrSize = 16;
  const qrX = PW - 20 - qrSize, qrY = 36;
  if (qr) {
    try { doc.addImage(qr, "PNG", qrX, qrY, qrSize, qrSize); } catch { /* noop */ }
  }

  // ============ Footer ============
  // Two centered lines, auto-wrapped to fit within the inner frame,
  // vertically balanced above the bottom edge.
  const FOOTER_INSET = 28;
  const INNER_W = PW - FOOTER_INSET * 2;
  const LINE_H = 3.6;

  // Build strings with tight bullet spacing so they fit on one line.
  const contactText =
    `${COMPANY.address}  \u2022  ${COMPANY.phone}  \u2022  ${COMPANY.email}  \u2022  ${COMPANY.website}`;
  const legalText =
    "CONFIDENTIAL  \u2014  Electronically issued and property of the Company. Authenticity may be verified via the QR reference printed above.";

  // Measure with the intended font for each line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setCharSpace(0);
  const contactLines = doc.splitTextToSize(contactText, INNER_W) as string[];

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.2);
  const legalLines = doc.splitTextToSize(legalText, INNER_W) as string[];

  const totalLines = contactLines.length + legalLines.length;
  const blockH = totalLines * LINE_H;

  // Place the block a bit higher above the page bottom
  const blockBottom = PH - 18;
  const firstY = blockBottom - blockH + LINE_H; // baseline of first line


  // Contact lines — centered
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(...INK);
  contactLines.forEach((ln, i) => {
    doc.text(ln, PW / 2, firstY + i * LINE_H, { align: "center" });
  });

  // Legal lines — centered italic
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.2);
  doc.setTextColor(...MUTED);
  legalLines.forEach((ln, i) => {
    doc.text(ln, PW / 2, firstY + (contactLines.length + i) * LINE_H, { align: "center" });
  });

  doc.setCharSpace(0);



  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s: string) {
  return (s || "employee").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

export async function downloadEmployeeCertificate(emp: Employee) {
  const bytes = await generateCertificatePdf(emp);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificate_${safeName(emp.name)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function printEmployeeCertificate(emp: Employee) {
  const bytes = await generateCertificatePdf(emp);
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
