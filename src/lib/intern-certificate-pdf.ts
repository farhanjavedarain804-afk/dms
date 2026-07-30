// A4 Internship Completion Certificate — matches Employee Certificate design.
import jsPDF from "jspdf";
import { COMPANY } from "@/lib/company";
import type { InternPdfData } from "@/lib/intern-form-pdf";
import {
  NAVY, GOLD, GOLD_LIGHT, INK, MUTED, FRAME, PW, PH, EMBLEM_MAX_H, EMBLEM_MARGIN,
  getLogoDataUrl, getSealDataUrl, makeQrDataUrl,
  drawHologramBackground, drawOrnateBorder, drawEmblem, drawGoldSeal
} from "./certificate-engine";

const PW = 210, PH = 297;
const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const certNo = (i: InternPdfData) => {
  const y = new Date().getFullYear();
  const idPart = (i.intern_code || String(i.id ?? Math.floor(Math.random() * 9000 + 1000))).slice(-4).padStart(4, "0");
  return `DEV/INT/CERT/${y}/${idPart}`;
};

export async function generateInternCertificatePdf(intern: InternPdfData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHologramBackground(doc);
  drawOrnateBorder(doc);

  const logo = await getLogoDataUrl();
  const seal = await getSealDataUrl();
  const cert_no = certNo(intern);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`CERTIFICATE NO: ${cert_no}`, PW - 20, 24, { align: "right" });
  doc.text(`DATE: ${today().toUpperCase()}`, PW - 20, 28, { align: "right" });
  doc.text("HUMAN RESOURCES", 20, 24);
  doc.text("REGISTRAR & VERIFICATION DIVISION", 20, 28);

  drawEmblem(doc, PW / 2, 20 + EMBLEM_MAX_H / 2 + EMBLEM_MARGIN / 2 + 18, logo);

  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...NAVY);
  doc.text(COMPANY.name.toUpperCase(), PW / 2, 62, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text("HUMAN RESOURCES  •  INTERNSHIP & TRAINING DIVISION", PW / 2, 67, { align: "center" });
  doc.text(COMPANY.address, PW / 2, 71.5, { align: "center" });

  doc.setFont("times", "bolditalic"); doc.setFontSize(26); doc.setTextColor(...NAVY);
  doc.text("Certificate of Internship", PW / 2, 87, { align: "center" });
  doc.setFont("times", "italic"); doc.setFontSize(13); doc.setTextColor(...GOLD);
  doc.text("Successful Completion", PW / 2, 95, { align: "center" });

  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4);
  doc.line(PW / 2 - 40, 99, PW / 2 - 6, 99);
  doc.line(PW / 2 + 6, 99, PW / 2 + 40, 99);
  doc.setFillColor(...GOLD); doc.circle(PW / 2, 99, 1.1, "F");

  // Body
  doc.setFont("times", "italic"); doc.setFontSize(11); doc.setTextColor(...MUTED);
  doc.text("THIS IS TO CERTIFY THAT", PW / 2, 118, { align: "center" });

  doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize((intern.name || "—").toUpperCase(), PW - 60);
  doc.text(nameLines, PW / 2, 132, { align: "center" });

  doc.setFont("times", "italic"); doc.setFontSize(11); doc.setTextColor(...INK);
  const sub = `(Intern Code: ${intern.intern_code || "—"}${intern.university ? `  •  ${intern.university}` : ""})`;
  doc.text(sub, PW / 2, 143, { align: "center" });

  const period = intern.start_date && intern.end_date ? `from ${intern.start_date} to ${intern.end_date}` : (intern.duration_weeks ? `for a duration of ${intern.duration_weeks} weeks` : "for the stipulated internship period");
  const stmt =
    `has successfully completed the internship programme at ${COMPANY.name} ` +
    `in the ${intern.department || "assigned"} department${intern.supervisor ? ` under the supervision of ${intern.supervisor}` : ""}, ` +
    `${period}. ` +
    `During this period the intern demonstrated professional conduct, dedication and a keen willingness to learn, ` +
    `and contributed constructively to the assigned projects and responsibilities.`;
  doc.setFont("times", "normal"); doc.setFontSize(11); doc.setTextColor(...INK);
  const stmtLines = doc.splitTextToSize(stmt, PW - 60);
  doc.text(stmtLines, PW / 2, 156, { align: "center" });

  // Key facts
  const facts: string[] = [];
  if (intern.department) facts.push(`Department: ${intern.department}`);
  if (intern.project_assigned) facts.push(`Project: ${intern.project_assigned}`);
  if (intern.performance_rating) facts.push(`Performance: ${intern.performance_rating}/5`);
  if (intern.attendance_pct) facts.push(`Attendance: ${intern.attendance_pct}%`);
  doc.setFont("times", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
  const factLines = doc.splitTextToSize(facts.join("  •  "), PW - 60);
  doc.text(factLines, PW / 2, 190, { align: "center" });

  const given = `GIVEN under the seal and authority of the Human Resources Division, ${COMPANY.short_name}, this ${today()}.`;
  doc.setFont("times", "italic"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(given, PW - 70), PW / 2, 210, { align: "center" });

  // Signature + seal
  const sigX = 50, sigY = 240;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(sigX - 25, sigY, sigX + 25, sigY);
  doc.setFont("times", "bolditalic"); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(intern.supervisor || "Authorised Signatory", sigX, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("HEAD OF HUMAN RESOURCES", sigX, sigY + 10, { align: "center" });
  doc.text(`${COMPANY.short_name}`, sigX, sigY + 14, { align: "center" });
  
  // Company seal
  drawGoldSeal(doc, PW / 2, 240 - 2.5, 18, seal);

  // QR
  const qrPayload = JSON.stringify({ co: COMPANY.short_name, cert: certNo(intern), code: intern.intern_code, name: intern.name, cnic: intern.cnic, dept: intern.department, issued: new Date().toISOString().slice(0, 10) });
  const qrUrl = COMPANY.url + "/verify?id=" + encodeURIComponent(cert_no);
  const qr = await makeQrDataUrl(qrUrl);
  if (qr) doc.addImage(qr, "PNG", 18, PH - 45, 20, 20);

  // Footer
  const FOOTER_INSET = 28;
  const INNER_W = PW - FOOTER_INSET * 2;
  const LINE_H = 3.6;
  const contactText = `${COMPANY.address}  \u2022  ${COMPANY.phone}  \u2022  ${COMPANY.email}  \u2022  ${COMPANY.website}`;
  const legalText = "CONFIDENTIAL  \u2014  Electronically issued and property of the Company. Authenticity may be verified via the QR reference printed above.";
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

  return new Uint8Array(doc.output("arraybuffer"));
}

function safeName(s?: string) { return (s || "intern").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase(); }

export async function downloadInternCertificate(intern: InternPdfData) {
  const bytes = await generateInternCertificatePdf(intern);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `internship_certificate_${safeName(intern.name)}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
