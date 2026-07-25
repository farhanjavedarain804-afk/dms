import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, Wrench, RefreshCw, Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { catalogApi, CATALOG_KIND_META, type CatalogItem, type CatalogKind } from "@/lib/catalog";
import { fmtPKR } from "@/lib/pk";

const ICONS: Record<CatalogKind, typeof Wrench> = {
  service: Wrench, product: Package, subscription: RefreshCw, package: Boxes,
};

const TABS: (CatalogKind | "all")[] = ["all", "service", "product", "subscription", "package"];

export function CatalogPicker({
  open, onOpenChange, onPick, title = "Insert from Catalog",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (item: CatalogItem, quantity: number) => void;
  title?: string;
}) {
  const q = useQuery({ queryKey: ["catalog"], queryFn: catalogApi.list, enabled: open });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CatalogKind | "all">("all");
  const [qty, setQty] = useState<Record<number, number>>({});

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((r) => {
      if (!r.active) return false;
      if (tab !== "all" && r.kind !== tab) return false;
      if (!s) return true;
      return [r.code, r.name, r.description, r.category ?? ""]
        .some((t) => t.toLowerCase().includes(s));
    });
  }, [q.data, search, tab]);

  const pick = (item: CatalogItem) => {
    onPick(item, Math.max(1, qty[item.id] || 1));
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Search and pick from your Products &amp; Services catalog to auto-fill line details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by code, name, or category…" className="pl-8"
              value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const label = t === "all" ? "All" : CATALOG_KIND_META[t].label;
              const count = t === "all"
                ? (q.data ?? []).filter((r) => r.active).length
                : (q.data ?? []).filter((r) => r.active && r.kind === t).length;
              return (
                <Button key={t} size="sm" variant={tab === t ? "default" : "outline"}
                  onClick={() => setTab(t)}>
                  {label} <span className="ml-1.5 text-xs opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>

          <div className="max-h-[420px] overflow-y-auto border rounded-md divide-y">
            {rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {q.isLoading ? "Loading…" : "No matching items."}
              </div>
            )}
            {rows.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <div key={item.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => pick(item)}>
                  <div className="mt-0.5 h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">{item.code}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{item.kind}</Badge>
                      {item.category && <span className="text-xs text-muted-foreground">· {item.category}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="text-foreground font-semibold">{fmtPKR(item.unit_price)}</span>
                      {" "}/ {item.unit}
                      {item.gst_rate ? ` · GST ${item.gst_rate}%` : ""}
                      {item.wht_rate ? ` · WHT ${item.wht_rate}%` : ""}
                      {item.billing_cycle ? ` · ${item.billing_cycle}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Input type="number" min={1} className="w-16 h-8"
                      value={qty[item.id] ?? 1}
                      onChange={(e) => setQty((s) => ({ ...s, [item.id]: Math.max(1, Number(e.target.value) || 1) }))} />
                    <Button size="sm" onClick={() => pick(item)}>Insert</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
