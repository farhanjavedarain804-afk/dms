// Accent color system — applied globally by overriding CSS variables.

export type AccentKey =
  | "teal" | "indigo" | "emerald" | "amber" | "rose"
  | "sky" | "violet" | "fuchsia" | "cyan" | "orange" | "lime" | "red";

export const ACCENTS: Record<AccentKey, { hex: string; primary: string; primaryFg: string; ring: string }> = {
  teal:    { hex: "#14b8a6", primary: "oklch(0.72 0.14 190)", primaryFg: "oklch(0.15 0.02 190)", ring: "oklch(0.72 0.14 190 / 0.5)" },
  indigo:  { hex: "#6366f1", primary: "oklch(0.55 0.22 275)", primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.55 0.22 275 / 0.5)" },
  emerald: { hex: "#10b981", primary: "oklch(0.68 0.17 160)", primaryFg: "oklch(0.15 0.02 160)", ring: "oklch(0.68 0.17 160 / 0.5)" },
  amber:   { hex: "#f59e0b", primary: "oklch(0.78 0.16 75)",  primaryFg: "oklch(0.18 0.02 75)",  ring: "oklch(0.78 0.16 75 / 0.5)" },
  rose:    { hex: "#f43f5e", primary: "oklch(0.66 0.22 15)",  primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.66 0.22 15 / 0.5)" },
  sky:     { hex: "#0ea5e9", primary: "oklch(0.70 0.15 235)", primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.70 0.15 235 / 0.5)" },
  violet:  { hex: "#8b5cf6", primary: "oklch(0.60 0.22 295)", primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.60 0.22 295 / 0.5)" },
  fuchsia: { hex: "#d946ef", primary: "oklch(0.66 0.26 325)", primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.66 0.26 325 / 0.5)" },
  cyan:    { hex: "#06b6d4", primary: "oklch(0.74 0.13 205)", primaryFg: "oklch(0.15 0.02 205)", ring: "oklch(0.74 0.13 205 / 0.5)" },
  orange:  { hex: "#f97316", primary: "oklch(0.72 0.19 50)",  primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.72 0.19 50 / 0.5)" },
  lime:    { hex: "#84cc16", primary: "oklch(0.78 0.18 130)", primaryFg: "oklch(0.18 0.02 130)", ring: "oklch(0.78 0.18 130 / 0.5)" },
  red:     { hex: "#ef4444", primary: "oklch(0.62 0.23 27)",  primaryFg: "oklch(0.99 0 0)",       ring: "oklch(0.62 0.23 27 / 0.5)" },
};

export const ACCENT_LABEL: Record<AccentKey, string> = {
  teal: "Teal", indigo: "Indigo", emerald: "Emerald", amber: "Amber", rose: "Rose",
  sky: "Sky", violet: "Violet", fuchsia: "Fuchsia", cyan: "Cyan", orange: "Orange", lime: "Lime", red: "Red",
};

export function applyAccent(key: AccentKey) {
  if (typeof document === "undefined") return;
  const a = ACCENTS[key] ?? ACCENTS.teal;
  const el = document.documentElement;
  el.style.setProperty("--primary", a.primary);
  el.style.setProperty("--primary-foreground", a.primaryFg);
  el.style.setProperty("--sidebar-primary", a.primary);
  el.style.setProperty("--sidebar-primary-foreground", a.primaryFg);
  el.style.setProperty("--ring", a.ring);
  el.setAttribute("data-accent", key);
}

export function loadAccentFromPrefs(): AccentKey {
  if (typeof window === "undefined") return "teal";
  try {
    const p = JSON.parse(window.localStorage.getItem("dms:preferences") || "{}");
    const key = (p?.accent as AccentKey) || "teal";
    return (key in ACCENTS) ? key : "teal";
  } catch { return "teal"; }
}

export function bootAccent() {
  applyAccent(loadAccentFromPrefs());
}
