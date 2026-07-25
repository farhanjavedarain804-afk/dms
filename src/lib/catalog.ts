// Shared Products & Services catalog. Items feed Quotations & Invoices via picker.
import { localCrud } from "@/lib/local-store";

export type CatalogKind = "service" | "product" | "subscription" | "package";

export type CatalogItem = {
  id: number;
  code: string;
  name: string;
  kind: CatalogKind;
  category?: string;
  description: string;
  unit: string;                  // e.g. "hour", "month", "license", "pcs"
  unit_price: number;
  currency: string;
  gst_rate: number;              // %
  wht_rate: number;              // %
  discount: number;              // PKR default
  delivery_time?: string;        // for quotations
  warranty?: string;
  payment_terms?: string;
  billing_cycle?: string;        // subscription: monthly / yearly / one-time
  active: boolean;
  notes?: string;
};

export const CATALOG_KIND_META: Record<CatalogKind, { label: string; hint: string }> = {
  service:      { label: "Services",      hint: "Consulting, development, support" },
  product:      { label: "Products",      hint: "Licenses, hardware, one-time items" },
  subscription: { label: "Subscriptions", hint: "Recurring plans (monthly / yearly)" },
  package:      { label: "Packages",      hint: "Bundled offerings and combos" },
};

export const catalogApi = localCrud<CatalogItem>("catalog", [
  { code: "SVC-ERP-CUSTOM", name: "ERP Customization", kind: "service", category: "Development",
    description: "Custom ERP module development and integration with existing systems.",
    unit: "hour", unit_price: 8000, currency: "PKR", gst_rate: 18, wht_rate: 3, discount: 0,
    delivery_time: "4–8 weeks", warranty: "3 months bug-fix support",
    payment_terms: "50% advance, 50% on delivery", active: true },
  { code: "SVC-MOBILE-APP", name: "Mobile App Development", kind: "service", category: "Development",
    description: "Cross-platform mobile app (iOS + Android) with cloud sync.",
    unit: "project", unit_price: 850000, currency: "PKR", gst_rate: 18, wht_rate: 3, discount: 0,
    delivery_time: "8–12 weeks", warranty: "6 months",
    payment_terms: "30/40/30 milestone billing", active: true },
  { code: "SVC-CLOUD-MIG", name: "Cloud Migration", kind: "service", category: "Cloud",
    description: "Full migration of on-prem systems to AWS / Azure with zero-downtime cutover.",
    unit: "project", unit_price: 450000, currency: "PKR", gst_rate: 18, wht_rate: 3, discount: 0,
    delivery_time: "3–5 weeks", warranty: "2 months post-migration support",
    payment_terms: "50% advance, 50% on completion", active: true },

  { code: "PRD-POS-LIC", name: "POS Terminal License (Perpetual)", kind: "product", category: "Licenses",
    description: "Perpetual license for a single POS terminal — includes 1 year updates.",
    unit: "license", unit_price: 45000, currency: "PKR", gst_rate: 18, wht_rate: 0, discount: 0,
    delivery_time: "Instant delivery", warranty: "12 months",
    payment_terms: "Full advance", active: true },
  { code: "PRD-THERMAL-PRN", name: "80mm Thermal Receipt Printer", kind: "product", category: "Hardware",
    description: "USB + LAN thermal printer, auto-cutter, 250mm/s.",
    unit: "pcs", unit_price: 18500, currency: "PKR", gst_rate: 18, wht_rate: 0, discount: 0,
    delivery_time: "3–5 business days", warranty: "12 months manufacturer warranty",
    payment_terms: "COD or bank transfer", active: true },

  { code: "SUB-ERP-BASIC", name: "ERP Cloud — Basic", kind: "subscription", category: "SaaS",
    description: "Up to 10 users, 5GB storage, email support.",
    unit: "month", unit_price: 15000, currency: "PKR", gst_rate: 18, wht_rate: 0, discount: 0,
    billing_cycle: "monthly", warranty: "99.5% uptime SLA",
    payment_terms: "Monthly in advance", active: true },
  { code: "SUB-ERP-PRO", name: "ERP Cloud — Professional", kind: "subscription", category: "SaaS",
    description: "Up to 50 users, 50GB storage, priority support, API access.",
    unit: "month", unit_price: 45000, currency: "PKR", gst_rate: 18, wht_rate: 0, discount: 0,
    billing_cycle: "monthly", warranty: "99.9% uptime SLA",
    payment_terms: "Monthly / annual (10% off)", active: true },

  { code: "PKG-STARTUP", name: "Startup Digital Package", kind: "package", category: "Bundles",
    description: "Website + branding + ERP Basic subscription (3 months) + POS setup.",
    unit: "package", unit_price: 275000, currency: "PKR", gst_rate: 18, wht_rate: 3, discount: 25000,
    delivery_time: "4 weeks", warranty: "6 months support",
    payment_terms: "50% advance, 50% on go-live", active: true },
  { code: "PKG-RETAIL", name: "Retail Chain Package (5 outlets)", kind: "package", category: "Bundles",
    description: "Cloud POS for 5 outlets, inventory sync, dashboard, 3 months support & training.",
    unit: "package", unit_price: 650000, currency: "PKR", gst_rate: 18, wht_rate: 3, discount: 0,
    delivery_time: "6 weeks from PO", warranty: "6 months",
    payment_terms: "50% advance, 50% on delivery", active: true },
]);

// Convert a catalog item + optional qty into invoice-ready line values.
export function catalogToInvoiceDefaults(item: CatalogItem, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1);
  const gross = item.unit_price * qty;
  const subtotal = Math.max(0, gross - (item.discount || 0));
  const gst_amount = Math.round((subtotal * (item.gst_rate || 0)) / 100);
  const wht_amount = Math.round((subtotal * (item.wht_rate || 0)) / 100);
  const total = subtotal + gst_amount - wht_amount;
  return {
    item_description: `${item.code} — ${item.name}\n${item.description}`,
    quantity: qty,
    unit_price: item.unit_price,
    subtotal,
    discount: item.discount || 0,
    gst_rate: item.gst_rate || 0,
    gst_amount,
    wht_rate: item.wht_rate || 0,
    wht_amount,
    total,
    amount_paid: 0,
    balance_due: total,
    currency: item.currency || "PKR",
  };
}

// Convert a catalog item into quotation defaults (no WHT on quotes).
export function catalogToQuotationDefaults(item: CatalogItem, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1);
  const gross = item.unit_price * qty;
  const subtotal = Math.max(0, gross - (item.discount || 0));
  const gst_amount = Math.round((subtotal * (item.gst_rate || 0)) / 100);
  const total = subtotal + gst_amount;
  return {
    subject: item.name,
    scope: `${item.code} — ${item.name}\n${item.description}`,
    quantity: qty,
    unit_price: item.unit_price,
    subtotal,
    discount: item.discount || 0,
    gst_rate: item.gst_rate || 0,
    gst_amount,
    total,
    currency: item.currency || "PKR",
    delivery_time: item.delivery_time,
    warranty: item.warranty,
    payment_terms: item.payment_terms,
  };
}
