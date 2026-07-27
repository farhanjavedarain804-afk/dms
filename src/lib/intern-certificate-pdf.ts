// A4 Internship Completion Certificate — matches Employee Certificate design.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
const devionicLogoAsset = "/devionic-logo.png";
import devionicSealAsset from "@/assets/devionic-seal.png.asset.json";
import type { InternPdfData } from "@/lib/intern-form-pdf";

const NAVY: [number, number, number] = [20, 41, 74];
const GOLD: [number, number, number] = [45, 212, 191];
const GOLD_LIGHT: [number, number, number] = [153, 232, 220];
const INK: [number, number, number] = [20, 41, 74];
const MUTED: [number, number, number] = [100, 116, 139];
const FRAME: [number, number, number] = [30, 58, 95];

let _logoCache: string | null = null;
async function getLogo(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch(devionicLogoAsset.url); const blob = await res.blob();
    _logoCache = await new Promise((r, j) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.onerror = j; f.readAsDataURL(blob); });
    return _logoCache;
  } catch { return null; }
}
let _sealCache: string | null = null;
async function getSeal(): Promise<string | null> {
  if (_sealCache) return _sealCache;
  try {
    const res = await fetch(devionicSealAsset.url); const blob = await res.blob();
    _sealCache = await new Promise((r, j) => { const f = new FileReader(); f.onload = () => r(f.result as string); f.onerror = j; f.readAsDataURL(blob); });
    return _sealCache;
  } catch { return null; }
}
async function makeQr(text: string): Promise<string | null> {
  try { return await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#14294A", light: "#ffffff" } }); } catch { return null; }
}

const PW = 210, PH = 297;
const today = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const certNo = (i: InternPdfData) => {
  const y = new Date().getFullYear();
  const idPart = (i.intern_code || String(i.id ?? Math.floor(Math.random() * 9000 + 1000))).slice(-4).padStart(4, "0");
  return `DEV/INT/CERT/${y}/${idPart}`;
};

function drawHologramBackground(doc: jsPDF) {
  const step = 3.2;
  const colors: [number, number, number][] = [[220, 245, 240], [225, 235, 250], [235, 250, 247], [230, 240, 252]];
  doc.setLineWidth(0.15);
  let ci = 0;
  for (let x = -PH; x < PW + PH; x += step) { const c = colors[ci++ % 4]; doc.setDrawColor(c[0], c[1], c[2]); doc.line(x, 0, x + PH, PH); }
  ci = 0;
  for (let x = -PH; x < PW + PH; x += step) { const c = colors[(ci++ + 2) % 4]; doc.setDrawColor(c[0], c[1], c[2]); doc.line(x, PH, x + PH, 0); }
  doc.setLineWidth(0.1);
  for (let r = 4; r < 70; r += 1.6) { const s = 235 + (r % 3) * 5; doc.setDrawColor(s, s - 5, 245); doc.circle(PW / 2, PH / 2, r, "S"); }
}

function drawOrnateBorder(doc: jsPDF) {
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.rect(5, 5, PW - 10, PH - 10, "S");
  doc.setDrawColor(...NAVY); doc.setLineWidth(1.6); doc.rect(8, 8, PW - 16, PH - 16, "S");
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.35);
  doc.rect(10.5, 10.5, PW - 21, PH - 21, "S");
  doc.rect(11.8, 11.8, PW - 23.6, PH - 23.6, "S");
  doc.setDrawColor(...FRAME); doc.setLineWidth(0.25);
  const meander = (x: number, y: number, horiz: boolean, flip: boolean) => {
    const s = 1.4, d = flip ? -1 : 1;
    if (horiz) doc.lines([[4 * s, 0], [0, d * 2 * s], [-3 * s, 0], [0, d * -1 * s], [2 * s, 0], [0, d * -0.5 * s]], x, y, [1, 1], "S", false);
    else doc.lines([[0, 4 * s], [d * 2 * s, 0], [0, -3 * s], [d * -1 * s, 0], [0, 2 * s], [d * -0.5 * s, 0]], x, y, [1, 1], "S", false);
  };
  const tile = 5.6;
  for (let x = 16; x < PW - 20; x += tile) { meander(x, 10.9, true, false); meander(x, PH - 10.9, true, true); }
  for (let y = 16; y < PH - 20; y += tile) { meander(10.9, y, false, false); meander(PW - 10.9, y, false, true); }
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(14.5, 14.5, PW - 29, PH - 29, "S");
  const corner = (cx: number, cy: number, rx: number, ry: number) => {
    doc.setDrawColor(...NAVY); doc.setFillColor(...GOLD); doc.setLineWidth(0.4);
    doc.lines([[rx * 4, -ry * 4], [rx * 4, ry * 4], [-rx * 4, ry * 4], [-rx * 4, -ry * 4]], cx, cy, [1, 1], "FD", true);
    doc.setFillColor(...GOLD_LIGHT);
    doc.lines([[rx * 2.2, -ry * 2.2], [rx * 2.2, ry * 2.2], [-rx * 2.2, ry * 2.2], [-rx * 2.2, -ry * 2.2]], cx, cy, [1, 1], "FD", true);
    doc.setFillColor(...NAVY); doc.circle(cx, cy, 0.8, "F");
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.3);
    doc.line(cx - 6, cy, cx - 3, cy); doc.line(cx + 3, cy, cx + 6, cy);
    doc.line(cx, cy - 6, cx, cy - 3); doc.line(cx, cy + 3, cx, cy + 6);
  };
  corner(14.5, 14.5, 0.6, 0.6); corner(PW - 14.5, 14.5, 0.6, 0.6);
  corner(14.5, PH - 14.5, 0.6, 0.6); corner(PW - 14.5, PH - 14.5, 0.6, 0.6);
}

function drawSeal(doc: jsPDF, cx: number, cy: number, r: number, seal: string | null) {
  const size = r * 2;
  for (let i = 6; i > 0; i--) { const tint = 240 + i * 2; doc.setFillColor(Math.min(255, tint), 252, 250); doc.circle(cx, cy, r + i * 0.5, "F"); }
  if (!seal) return;
  try {
    let w = size, h = size;
    try { const p = doc.getImageProperties(seal); const ratio = p.width / p.height; if (ratio >= 1) { w = size; h = size / ratio; } else { h = size; w = size * ratio; } } catch {}
    doc.addImage(seal, "PNG", cx - w / 2, cy - h / 2, w, h);
  } catch {}
}

const EMBLEM_MAX_W = 60, EMBLEM_MAX_H = 18;
function drawEmblem(doc: jsPDF, cx: number, cy: number, logo: string | null) {
  if (!logo) return;
  let w = EMBLEM_MAX_W, h = EMBLEM_MAX_H;
  try {
    const p = doc.getImageProperties(logo); const ratio = p.width / p.height;
    if (EMBLEM_MAX_W / ratio <= EMBLEM_MAX_H) { w = EMBLEM_MAX_W; h = EMBLEM_MAX_W / ratio; }
    else { h = EMBLEM_MAX_H; w = EMBLEM_MAX_H * ratio; }
  } catch {}
  try { doc.addImage(logo, "PNG", cx - w / 2, cy - h / 2, w, h); } catch {}
}

export async function generateInternCertificatePdf(intern: InternPdfData): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHologramBackground(doc);
  drawOrnateBorder(doc);

  const logo = await getLogo();
  const seal = await getSeal();

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(`CERTIFICATE NO: ${certNo(intern)}`, PW - 20, 24, { align: "right" });
  doc.text(`DATE: ${today().toUpperCase()}`, PW - 20, 28, { align: "right" });
  doc.text("HUMAN RESOURCES", 20, 24);
  doc.text("INTERNSHIP DIVISION", 20, 28);

  drawEmblem(doc, PW / 2, 40, logo);

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

  drawSeal(doc, PW - 55, sigY + 8, 22, seal);

  // QR
  const qrPayload = JSON.stringify({ co: COMPANY.short_name, cert: certNo(intern), code: intern.intern_code, name: intern.name, cnic: intern.cnic, dept: intern.department, issued: new Date().toISOString().slice(0, 10) });
  const qr = await makeQr(qrPayload);
  const qrSize = 16;
  if (qr) { try { doc.addImage(qr, "PNG", PW - 20 - qrSize, 36, qrSize, qrSize); } catch {} }

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
