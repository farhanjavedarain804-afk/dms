import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, RefreshCw, Boxes, DollarSign } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { Button } from "@/components/ui/button";
import { catalogApi, CATALOG_KIND_META, type CatalogItem, type CatalogKind } from "@/lib/catalog";
import { fmtPKR } from "@/lib/pk";

const TABS: { key: CatalogKind; label: string; icon: typeof Wrench; hint: string }[] = [
  { key: "service",      label: "Services",      icon: Wrench,   hint: CATALOG_KIND_META.service.hint },
  { key: "product",      label: "Products",      icon: Package,  hint: CATALOG_KIND_META.product.hint },
  { key: "subscription", label: "Subscriptions", icon: RefreshCw, hint: CATALOG_KIND_META.subscription.hint },
  { key: "package",      label: "Packages",      icon: Boxes,    hint: CATALOG_KIND_META.package.hint },
];

function baseFields(kind: CatalogKind): FieldDef<CatalogItem>[] {
  const rows: FieldDef<CatalogItem>[] = [
    { name: "code", label: "Code / SKU", required: true, section: "Item" },
    { name: "name", label: "Name", required: true, section: "Item" },
    { name: "category", label: "Category", section: "Item" },
    { name: "unit", label: "Unit", required: true, section: "Item",
      placeholder: kind === "subscription" ? "month / year" : kind === "service" ? "hour / project" : "pcs / license" },
    { name: "description", label: "Description", type: "textarea", required: true, section: "Item", fullWidth: true, hideInTable: true },

    { name: "unit_price", label: "Unit Price (PKR)", type: "number", required: true, section: "Pricing",
      render: (v) => fmtPKR(v) },
    { name: "currency", label: "Currency", section: "Pricing", hideInTable: true },
    { name: "discount", label: "Default Discount (PKR)", type: "number", section: "Pricing", hideInTable: true,
      render: (v) => fmtPKR(v) },
    { name: "gst_rate", label: "GST %", type: "number", section: "Pricing" },
    { name: "wht_rate", label: "WHT %", type: "number", section: "Pricing", hideInTable: true },
  ];

  if (kind === "subscription") {
    rows.push({ name: "billing_cycle", label: "Billing Cycle", type: "select", section: "Terms", options: [
      { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" },
      { value: "yearly", label: "Yearly" }, { value: "one-time", label: "One-time" },
    ] });
  }

  rows.push(
    { name: "delivery_time", label: "Delivery / Lead Time", section: "Terms", hideInTable: true },
    { name: "warranty", label: "Warranty / SLA", section: "Terms", hideInTable: true },
    { name: "payment_terms", label: "Payment Terms", type: "textarea", section: "Terms", fullWidth: true, hideInTable: true },
    { name: "notes", label: "Internal Notes", type: "textarea", section: "Terms", fullWidth: true, hideInTable: true },
    { name: "active", label: "Active", type: "select", section: "Terms", options: [
      { value: true as any, label: "Active" }, { value: false as any, label: "Inactive" },
    ] },
  );

  return rows;
}

function CatalogPage() {
  const [tab, setTab] = useState<CatalogKind>("service");
  const q = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.list });
  const all = q.data ?? [];

  const scopedApi = useMemo(() => ({
    list: async () => (await catalogApi.list()).filter((r) => r.kind === tab),
    get: catalogApi.get,
    create: (body: Omit<CatalogItem, "id">) => catalogApi.create({ ...body, kind: tab } as any),
    update: catalogApi.update,
    remove: catalogApi.remove,
  }), [tab]);

  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = all.filter((r) => r.kind === t.key).length; return acc;
  }, {});

  const stats = TABS.map((t) => ({
    label: t.label, value: counts[t.key] ?? 0, hint: t.hint, icon: t.icon,
  }));

  const totalValue = all.filter((r) => r.active).reduce((s, r) => s + Number(r.unit_price || 0), 0);
  const activeCount = all.filter((r) => r.active).length;

  const fields = useMemo(() => baseFields(tab), [tab]);

  return (
    <AppLayout>
      <PageHeader
        title="Products & Services"
        description="Central catalog used by Quotations & Invoices. Search and insert items with one click to auto-fill pricing, GST and terms."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "catalog",
              moduleLabel: "Products & Services",
              title: "Catalog Report",
              subtitle: `${all.length} item(s) · ${activeCount} active`,
              meta: [{ label: "Catalog Value", value: fmtPKR(totalValue) }],
              sections: [{
                title: "Catalog Items",
                columns: [
                  { key: "code", label: "Code" },
                  { key: "name", label: "Name" },
                  { key: "kind", label: "Kind" },
                  { key: "category", label: "Category" },
                  { key: "unit", label: "Unit" },
                  { key: "unit_price", label: "Price", format: (v) => fmtPKR(v ?? 0) },
                  { key: "gst_rate", label: "GST%" },
                  { key: "active", label: "Active", format: (v) => v ? "Yes" : "No" },
                ],
                rows: all,
              }],
            })}
          />
        }
      />

      <StatsCards loading={q.isLoading} stats={[
        ...stats,
        { label: "Active Items", value: activeCount, hint: fmtPKR(totalValue) + " catalog value", icon: DollarSign, tint: "oklch(0.68 0.18 155)" },
      ]} />

      <div className="flex flex-wrap gap-1.5 border-b pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <Button key={t.key} size="sm" variant={active ? "default" : "ghost"}
              onClick={() => setTab(t.key)} className="gap-1.5">
              <Icon className="h-4 w-4" /> {t.label}
              <span className={"ml-1 text-xs " + (active ? "opacity-90" : "text-muted-foreground")}>
                {counts[t.key] ?? 0}
              </span>
            </Button>
          );
        })}
      </div>

      <CrudTable<CatalogItem>
        key={tab}
        title={CATALOG_KIND_META[tab].label.replace(/s$/, "")}
        fields={fields}
        api={scopedApi as any}
        queryKey="catalog"
        searchable={["code", "name", "category", "description"]}
        defaults={{
          kind: tab, currency: "PKR", gst_rate: 18, wht_rate: 0, discount: 0,
          unit: tab === "subscription" ? "month" : tab === "service" ? "hour" : "pcs",
          unit_price: 0, active: true,
          billing_cycle: tab === "subscription" ? "monthly" : undefined,
        } as any}
      />
      <ModuleReportsCard module="catalog" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Products & Services — Devionic DMS" }] }),
  component: CatalogPage,
});
