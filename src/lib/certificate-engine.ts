import jsPDF from "jspdf";
import QRCode from "qrcode";
import { COMPANY } from "@/lib/company";
const devionicLogoAsset = "/devionic-logo.png";
import devionicSealAsset from "@/assets/devionic-seal.png.asset.json";

// Shared Brand Palette
export const NAVY: [number, number, number] = [20, 41, 74];
export const GOLD: [number, number, number] = [45, 212, 191];
export const GOLD_LIGHT: [number, number, number] = [153, 232, 220];
export const INK: [number, number, number] = [20, 41, 74];
export const MUTED: [number, number, number] = [100, 116, 139];
export const FRAME: [number, number, number] = [30, 58, 95];

export const PW = 210, PH = 297;
export const EMBLEM_MAX_W = 60;
export const EMBLEM_MAX_H = 18;
export const EMBLEM_MARGIN = 6;

let _logoCache: string | null = null;
export async function getLogoDataUrl(): Promise<string | null> {
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
  } catch { return null; }
}

let _sealCache: string | null = null;
export async function getSealDataUrl(): Promise<string | null> {
  if (_sealCache) return _sealCache;
  try {
    const res = await fetch(devionicSealAsset);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob);
    });
    _sealCache = dataUrl; return dataUrl;
  } catch { return null; }
}

export async function makeQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: "#14294A", light: "#ffffff" } });
  } catch { return null; }
}

export function drawHologramBackground(doc: jsPDF) {
  const step = 3.2;
  const colors: [number, number, number][] = [
    [220, 245, 240], [225, 235, 250], [235, 250, 247], [230, 240, 252],
  ];
  doc.setLineWidth(0.15);
  let ci = 0;
  for (let x = -PH; x < PW + PH; x += step) {
    const c = colors[ci++ % colors.length];
    doc.setDrawColor(c[0], c[1], c[2]); doc.line(x, 0, x + PH, PH);
  }
  ci = 0;
  for (let x = -PH; x < PW + PH; x += step) {
    const c = colors[(ci++ + 2) % colors.length];
    doc.setDrawColor(c[0], c[1], c[2]); doc.line(x, PH, x + PH, 0);
  }
  doc.setLineWidth(0.1);
  const cx = PW / 2, cy = PH / 2;
  for (let r = 4; r < 70; r += 1.6) {
    const shade = 235 + (r % 3) * 5;
    doc.setDrawColor(shade, shade - 5, 245); doc.circle(cx, cy, r, "S");
  }
}

export function drawOrnateBorder(doc: jsPDF) {
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.rect(5, 5, PW - 10, PH - 10, "S");
  doc.setDrawColor(...NAVY); doc.setLineWidth(1.6); doc.rect(8, 8, PW - 16, PH - 16, "S");
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.35);
  doc.rect(10.5, 10.5, PW - 21, PH - 21, "S");
  doc.rect(11.8, 11.8, PW - 23.6, PH - 23.6, "S");

  doc.setDrawColor(...FRAME); doc.setLineWidth(0.25);
  const meander = (x: number, y: number, horiz: boolean, flip: boolean) => {
    const s = 1.4; const d = flip ? -1 : 1;
    if (horiz) {
      doc.lines([[4*s,0],[0,d*2*s],[-3*s,0],[0,d*-1*s],[2*s,0],[0,d*-0.5*s]], x, y, [1,1], "S", false);
    } else {
      doc.lines([[0,4*s],[d*2*s,0],[0,-3*s],[d*-1*s,0],[0,2*s],[d*-0.5*s,0]], x, y, [1,1], "S", false);
    }
  };
  const tile = 5.6;
  for (let x = 16; x < PW - 20; x += tile) { meander(x, 10.9, true, false); meander(x, PH - 10.9, true, true); }
  for (let y = 16; y < PH - 20; y += tile) { meander(10.9, y, false, false); meander(PW - 10.9, y, false, true); }

  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(14.5, 14.5, PW - 29, PH - 29, "S");

  const corner = (cx: number, cy: number, rx: number, ry: number) => {
    doc.setDrawColor(...NAVY); doc.setFillColor(...GOLD); doc.setLineWidth(0.4);
    doc.lines([[rx*4,-ry*4],[rx*4,ry*4],[-rx*4,ry*4],[-rx*4,-ry*4]], cx, cy, [1,1], "FD", true);
    doc.setFillColor(...GOLD_LIGHT);
    doc.lines([[rx*2.2,-ry*2.2],[rx*2.2,ry*2.2],[-rx*2.2,ry*2.2],[-rx*2.2,-ry*2.2]], cx, cy, [1,1], "FD", true);
    doc.setFillColor(...NAVY); doc.circle(cx, cy, 0.8, "F");
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.3);
    doc.line(cx - 6, cy, cx - 3, cy); doc.line(cx + 3, cy, cx + 6, cy);
    doc.line(cx, cy - 6, cx, cy - 3); doc.line(cx, cy + 3, cx, cy + 6);
  };
  corner(14.5, 14.5, 0.6, 0.6); corner(PW - 14.5, 14.5, 0.6, 0.6);
  corner(14.5, PH - 14.5, 0.6, 0.6); corner(PW - 14.5, PH - 14.5, 0.6, 0.6);
}

export function drawEmblem(doc: jsPDF, cx: number, cy: number, logo: string | null) {
  if (!logo) return;
  let w = EMBLEM_MAX_W;
  let h = EMBLEM_MAX_H;
  try {
    const props = doc.getImageProperties(logo);
    const ratio = props.width / props.height;
    if (EMBLEM_MAX_W / ratio <= EMBLEM_MAX_H) {
      w = EMBLEM_MAX_W; h = EMBLEM_MAX_W / ratio;
    } else {
      h = EMBLEM_MAX_H; w = EMBLEM_MAX_H * ratio;
    }
  } catch { }
  try { doc.addImage(logo, "PNG", cx - w / 2, cy - h / 2, w, h); } catch { }
}

export function drawGoldSeal(doc: jsPDF, cx: number, cy: number, r: number, seal: string | null) {
  const size = r * 2;
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
    } catch { }
    doc.addImage(seal, "PNG", cx - w / 2, cy - h / 2, w, h);
  } catch { }
}
