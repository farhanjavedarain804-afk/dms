// Certificate of Registration & Records Verification — A4 formal certificate
// Classic decorative style with hologram / guilloché security effects.
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
const devionicLogoAsset = "/devionic-logo.png";
import devionicSealAsset from "@/assets/devionic-seal.png.asset.json";
import type { Employee } from "@/lib/api";

// Devionic brand palette — matches new logo (deep navy + teal accent).
const NAVY: [number, number, number] = [20, 41, 74];        // logo deep navy
const GOLD: [number, number, number] = [45, 212, 191];      // logo teal accent
const GOLD_LIGHT: [number, number, number] = [153, 232, 220]; // light teal glow
const INK: [number, number, number] = [20, 41, 74];
const MUTED: [number, number, number] = [100, 116, 139];
const FRAME: [number, number, number] = [30, 58, 95];       // mid navy frame



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

let _sealCache: string | null = null;
async function getSealDataUrl(): Promise<string | null> {
  if (_sealCache) return _sealCache;
  try {
    const res = await fetch(devionicSealAsset.url);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    _sealCache = dataUrl;
    return dataUrl;
  } catch { return null; }
}

async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M", margin: 1, width: 300,
      color: { dark: "#14294A", light: "#ffffff" },
    });
  } catch { return null; }
}

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

// ---------- Hologram / guilloché background ----------
function drawHologramBackground(doc: jsPDF) {
  // Iridescent diagonal cross-hatch (very faint) — simulates holographic foil.
  const step = 3.2;
  const colors: [number, number, number][] = [
    [220, 245, 240], // pale teal
    [225, 235, 250], // pale navy
    [235, 250, 247], // mint teal
    [230, 240, 252], // ice blue
  ];


  doc.setLineWidth(0.15);
  let ci = 0;
  for (let x = -PH; x < PW + PH; x += step) {
    const c = colors[ci++ % colors.length];
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.line(x, 0, x + PH, PH);
  }
  ci = 0;
  for (let x = -PH; x < PW + PH; x += step) {
    const c = colors[(ci++ + 2) % colors.length];
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.line(x, PH, x + PH, 0);
  }
  // Concentric guilloché rosette (center watermark)
  doc.setLineWidth(0.1);
  const cx = PW / 2, cy = PH / 2;
  for (let r = 4; r < 70; r += 1.6) {
    const shade = 235 + (r % 3) * 5;
    doc.setDrawColor(shade, shade - 5, 245);
    doc.circle(cx, cy, r, "S");
  }
}

// Faint diagonal "DEVIONIC • VERIFIED • SECURE" watermark — laid out on a
// true rotated grid so every row is parallel, evenly spaced, and identically
// offset. Letter-spacing is uniform and rows tile corner-to-corner.
function drawWatermarkText(doc: jsPDF) {
  const angle = -30;                      // consistent tilt
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  // Unit vectors: u = along baseline, v = perpendicular (row-to-row).
  const ux = cos, uy = sin;
  const vx = -sin, vy = cos;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(224, 240, 236);
  doc.setCharSpace(1.6);                  // uniform tracking

  // One repeating token with equal breathing room on each side of the bullets.
  const token = "DEVIONIC   \u2022   VERIFIED   \u2022   SECURE";
  const gap = "        ";                 // fixed spacer between repeats
  const line = (token + gap).repeat(8);   // long enough to cross the page

  // Cover the full page diagonally: half-diagonal ~ 182mm.
  const half = Math.ceil(Math.hypot(PW, PH) / 2) + 20;
  const rowGap = 22;                      // perpendicular spacing between rows
  const cx = PW / 2, cy = PH / 2;

  for (let t = -half; t <= half; t += rowGap) {
    // Anchor point on the perpendicular axis, then walk back along the
    // baseline by `half` so the line enters from off-page and exits off-page.
    const ax = cx + vx * t - ux * half;
    const ay = cy + vy * t - uy * half;
    doc.text(line, ax, ay, { angle });
  }

  doc.setCharSpace(0);
}


// Celtic-knot / rope style ornate border (double frame + corner medallions).
function drawOrnateBorder(doc: jsPDF) {
  // ---- Elegant multi-layer border (art-deco inspired) ----

  // 1. Outer hairline teal
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(5, 5, PW - 10, PH - 10, "S");

  // 2. Bold navy frame band
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.6);
  doc.rect(8, 8, PW - 16, PH - 16, "S");

  // 3. Twin teal pinstripes
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.rect(10.5, 10.5, PW - 21, PH - 21, "S");
  doc.rect(11.8, 11.8, PW - 23.6, PH - 23.6, "S");

  // 4. Greek-key / meander motif band between stripes
  doc.setDrawColor(...FRAME);
  doc.setLineWidth(0.25);
  const meander = (x: number, y: number, horiz: boolean, flip: boolean) => {
    const s = 1.4;
    const d = flip ? -1 : 1;
    if (horiz) {
      // small square-spiral tile 4s x 2s
      doc.lines(
        [[4 * s, 0], [0, d * 2 * s], [-3 * s, 0], [0, d * -1 * s], [2 * s, 0], [0, d * -0.5 * s]],
        x, y, [1, 1], "S", false
      );
    } else {
      doc.lines(
        [[0, 4 * s], [d * 2 * s, 0], [0, -3 * s], [d * -1 * s, 0], [0, 2 * s], [d * -0.5 * s, 0]],
        x, y, [1, 1], "S", false
      );
    }
  };
  const tile = 5.6;
  for (let x = 16; x < PW - 20; x += tile) { meander(x, 10.9, true, false); meander(x, PH - 10.9, true, true); }
  for (let y = 16; y < PH - 20; y += tile) { meander(10.9, y, false, false); meander(PW - 10.9, y, false, true); }

  // 5. Inner hairline
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.rect(14.5, 14.5, PW - 29, PH - 29, "S");

  // 6. Elegant corner ornaments — fleur/diamond
  const corner = (cx: number, cy: number, rx: number, ry: number) => {
    // diamond
    doc.setDrawColor(...NAVY);
    doc.setFillColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.lines(
      [[rx * 4, -ry * 4], [rx * 4, ry * 4], [-rx * 4, ry * 4], [-rx * 4, -ry * 4]],
      cx, cy, [1, 1], "FD", true
    );
    // inner diamond
    doc.setFillColor(...GOLD_LIGHT);
    doc.lines(
      [[rx * 2.2, -ry * 2.2], [rx * 2.2, ry * 2.2], [-rx * 2.2, ry * 2.2], [-rx * 2.2, -ry * 2.2]],
      cx, cy, [1, 1], "FD", true
    );
    // center dot
    doc.setFillColor(...NAVY);
    doc.circle(cx, cy, 0.8, "F");
    // radiating lines
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(cx - 6, cy, cx - 3, cy);
    doc.line(cx + 3, cy, cx + 6, cy);
    doc.line(cx, cy - 6, cx, cy - 3);
    doc.line(cx, cy + 3, cx, cy + 6);
  };
  corner(14.5, 14.5, 0.6, 0.6);
  corner(PW - 14.5, 14.5, 0.6, 0.6);
  corner(14.5, PH - 14.5, 0.6, 0.6);
  corner(PW - 14.5, PH - 14.5, 0.6, 0.6);
}


// Official Devionic seal — rendered from the brand seal image (preserves aspect ratio).
function drawGoldSeal(doc: jsPDF, cx: number, cy: number, r: number, seal: string | null) {
  const size = r * 2;
  // subtle glow halo behind seal
  for (let i = 6; i > 0; i--) {
    const tint = 240 + i * 2;
    doc.setFillColor(Math.min(255, tint), 252, 250);
    doc.circle(cx, cy, r + i * 0.5, "F");
  }
  if (!seal) return;
  try {
    let w = size, h = size;
    try {
      const props = doc.getImageProperties(seal);
      const ratio = props.width / props.height;
      if (ratio >= 1) { w = size; h = size / ratio; }
      else { h = size; w = size * ratio; }
    } catch { /* defaults */ }
    doc.addImage(seal, "PNG", cx - w / 2, cy - h / 2, w, h);
  } catch { /* noop */ }
}


// Consistent logo sizing — fits the logo inside a target box while preserving
// its native aspect ratio, so it never stretches at any certificate size.
const EMBLEM_MAX_W = 60; // mm — max horizontal span
const EMBLEM_MAX_H = 18; // mm — max vertical span
const EMBLEM_MARGIN = 6; // mm — clear space around emblem

function drawEmblem(doc: jsPDF, cx: number, cy: number, logo: string | null) {
  if (!logo) return;
  let w = EMBLEM_MAX_W;
  let h = EMBLEM_MAX_H;
  try {
    const props = doc.getImageProperties(logo);
    const ratio = props.width / props.height;
    // Fit inside (EMBLEM_MAX_W x EMBLEM_MAX_H) preserving aspect ratio.
    if (EMBLEM_MAX_W / ratio <= EMBLEM_MAX_H) {
      w = EMBLEM_MAX_W;
      h = EMBLEM_MAX_W / ratio;
    } else {
      h = EMBLEM_MAX_H;
      w = EMBLEM_MAX_H * ratio;
    }
  } catch { /* fall back to defaults */ }
  try { doc.addImage(logo, "PNG", cx - w / 2, cy - h / 2, w, h); } catch { /* noop */ }
}




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
