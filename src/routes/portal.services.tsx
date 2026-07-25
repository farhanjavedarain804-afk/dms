import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Search, ShoppingCart, Sparkles, Boxes, Repeat, CheckCircle2, X } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { KEYS, readList, writeList, nextId, logPortal, type PortalService, type PortalBooking } from "@/lib/portal-data";
import { catalogApi, type CatalogItem, type CatalogKind } from "@/lib/catalog";
import { fmtPKR } from "@/lib/pk";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/services")({
  head: () => ({
    meta: [
      { title: "Services & Products — Devionic Client Portal" },
      { name: "description", content: "Browse and book Devionic services, products, subscriptions and packages." },
      { property: "og:title", content: "Services & Products — Devionic Client Portal" },
      { property: "og:description", content: "Browse and book Devionic services, products, subscriptions and packages." },
    ],
  }),
  component: PortalServices,
});

const KIND_META: Record<CatalogKind, { label: string; icon: any; tint: string }> = {
  service:      { label: "Services",      icon: Sparkles, tint: "bg-blue-500/15 text-blue-600" },
  product:      { label: "Products",      icon: Boxes,    tint: "bg-emerald-500/15 text-emerald-600" },
  subscription: { label: "Subscriptions", icon: Repeat,   tint: "bg-violet-500/15 text-violet-600" },
  package:      { label: "Packages",      icon: Package,  tint: "bg-amber-500/15 text-amber-600" },
};

function PortalServices() {
  const ident = usePortalIdentity();
  const clientKey = (ident.email || ident.company || ident.name).toLowerCase();

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [myServices, setMyServices] = useState<PortalService[]>([]);
  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [kind, setKind] = useState<CatalogKind | "all">("all");
  const [q, setQ] = useState("");
  const [bookFor, setBookFor] = useState<CatalogItem | null>(null);
  const [tab, setTab] = useState<"browse" | "mine" | "bookings">("browse");

  const refresh = () => {
    setBookings(readList<PortalBooking>(KEYS.bookings).filter((b) => b.client_key === clientKey));
    const mineCompanyKey = (ident.company || ident.name || ident.email).toLowerCase();
    setMyServices(readList<PortalService>(KEYS.services).filter((s) => s.client_key.toLowerCase() === mineCompanyKey));
  };

  useEffect(() => {
    (async () => {
      const items = await catalogApi.list();
      setCatalog(items.filter((r) => r.active));
    })();
    refresh();
     
  }, [clientKey]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return catalog
      .filter((c) => kind === "all" || c.kind === kind)
      .filter((c) => !t || [c.name, c.code, c.category, c.description].some((v) => (v ?? "").toLowerCase().includes(t)));
  }, [catalog, kind, q]);

  const kindCounts = useMemo(() => {
    const map: Record<string, number> = { all: catalog.length };
    catalog.forEach((c) => { map[c.kind] = (map[c.kind] || 0) + 1; });
    return map;
  }, [catalog]);

  const submitBooking = (item: CatalogItem, qty: number, prefStart: string, notes: string) => {
    const all = readList<PortalBooking>(KEYS.bookings);
    const quantity = Math.max(1, Number(qty) || 1);
    const subtotal = item.unit_price * quantity - (item.discount || 0);
    const gst = Math.round((subtotal * (item.gst_rate || 0)) / 100);
    const total = Math.max(0, subtotal + gst);
    const now = new Date().toISOString();
    const row: PortalBooking = {
      id: nextId(all),
      code: "BK-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      client_key: clientKey,
      client_name: ident.name || undefined,
      client_company: ident.company || undefined,
      catalog_id: item.id,
      catalog_code: item.code,
      catalog_kind: item.kind,
      name: item.name,
      category: item.category,
      quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total,
      currency: item.currency,
      billing_cycle: item.billing_cycle,
      preferred_start: prefStart || undefined,
      notes: notes || undefined,
      status: "requested",
      created_at: now,
      updated_at: now,
    };
    writeList(KEYS.bookings, [row, ...all]);
    logPortal(`booked ${item.code}`, clientKey, "/portal/services");
    toast.success(`Booking request submitted — ${row.code}`);
    setBookFor(null);
    refresh();
    setTab("bookings");
  };

  const cancelBooking = (id: number) => {
    const all = readList<PortalBooking>(KEYS.bookings);
    const next = all.map((b) => b.id === id && b.status === "requested"
      ? { ...b, status: "cancelled" as const, updated_at: new Date().toISOString() }
      : b);
    writeList(KEYS.bookings, next);
    refresh();
    toast.success("Booking cancelled");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services & Products</h2>
          <p className="text-sm text-muted-foreground">Browse our catalog, book instantly, or review what's already running on your account.</p>
        </div>
        <div className="inline-flex rounded-lg border bg-card p-1 text-sm">
          {[
            { k: "browse", label: `Browse (${catalog.length})` },
            { k: "bookings", label: `My Bookings (${bookings.length})` },
            { k: "mine", label: `Active (${myServices.length})` },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`h-8 px-3 rounded-md text-xs font-medium ${tab === t.k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "browse" && (
        <>
          <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search services, products, packages…"
                className="w-full h-9 pl-8 pr-3 rounded-md border bg-background text-sm" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all", "service", "product", "subscription", "package"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)}
                  className={`h-9 px-3 text-xs rounded-md border ${kind === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {k === "all" ? "All" : KIND_META[k].label} ({kindCounts[k] || 0})
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Package} text="No matching items in the catalog." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="rounded-xl border bg-card p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`h-9 w-9 rounded-lg grid place-items-center ${meta.tint}`}><Icon className="h-4 w-4" /></div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.tint}`}>{meta.label}</span>
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{item.code}{item.category ? ` · ${item.category}` : ""}</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{item.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/40 px-2 py-1.5">
                        <div className="text-muted-foreground">Price</div>
                        <div className="font-medium">{fmtPKR(item.unit_price)} / {item.unit}</div>
                      </div>
                      <div className="rounded-md bg-muted/40 px-2 py-1.5">
                        <div className="text-muted-foreground">{item.kind === "subscription" ? "Billing" : "Delivery"}</div>
                        <div className="font-medium truncate">{item.billing_cycle || item.delivery_time || "—"}</div>
                      </div>
                    </div>
                    <Button size="sm" className="mt-4 w-full" onClick={() => setBookFor(item)}>
                      <ShoppingCart className="h-3 w-3 mr-1" /> Book / Request
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "bookings" && (
        bookings.length === 0
          ? <EmptyState icon={ShoppingCart} text="You haven't booked anything yet. Head to Browse to get started." />
          : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Code</th>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-left px-4 py-2">Qty</th>
                      <th className="text-left px-4 py-2">Total</th>
                      <th className="text-left px-4 py-2">Preferred start</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 align-top">
                        <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-xs">{b.name}</div>
                          <div className="text-[11px] text-muted-foreground">{b.catalog_code} · {KIND_META[b.catalog_kind].label}</div>
                          {b.notes && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">"{b.notes}"</div>}
                          {b.admin_note && <div className="text-[11px] text-primary mt-1">Admin: {b.admin_note}</div>}
                        </td>
                        <td className="px-4 py-2 text-xs">{b.quantity} {b.unit}</td>
                        <td className="px-4 py-2 text-xs font-medium">{fmtPKR(b.total)}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{b.preferred_start || "—"}</td>
                        <td className="px-4 py-2"><BookingStatus s={b.status} /></td>
                        <td className="px-4 py-2 text-right">
                          {b.status === "requested" && (
                            <button onClick={() => cancelBooking(b.id)} className="text-xs text-rose-600 hover:underline">Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {tab === "mine" && (
        myServices.length === 0
          ? <EmptyState icon={CheckCircle2} text="No active services on your account yet." />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myServices.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.category ?? "Service"}</div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-emerald-500/15 text-emerald-600" : s.status === "paused" ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-medium">{fmtPKR(s.price ?? 0)} / {s.cycle ?? "—"}</div>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <div className="text-muted-foreground">Next renewal</div>
                      <div className="font-medium">{s.next_renewal ?? "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {bookFor && <BookDialog item={bookFor} onClose={() => setBookFor(null)} onSubmit={submitBooking} />}
    </div>
  );
}

function BookingStatus({ s }: { s: PortalBooking["status"] }) {
  const map: Record<string, string> = {
    requested: "bg-amber-500/15 text-amber-600",
    approved: "bg-blue-500/15 text-blue-600",
    in_progress: "bg-violet-500/15 text-violet-600",
    completed: "bg-emerald-500/15 text-emerald-600",
    declined: "bg-rose-500/15 text-rose-600",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[s]}`}>{s.replace("_", " ")}</span>;
}

function BookDialog({ item, onClose, onSubmit }: {
  item: CatalogItem;
  onClose: () => void;
  onSubmit: (item: CatalogItem, qty: number, prefStart: string, notes: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [prefStart, setPrefStart] = useState("");
  const [notes, setNotes] = useState("");
  const subtotal = item.unit_price * qty - (item.discount || 0);
  const gst = Math.round((subtotal * (item.gst_rate || 0)) / 100);
  const total = Math.max(0, subtotal + gst);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-background border shadow-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Book — {item.name}</div>
            <div className="text-xs text-muted-foreground">{item.code} · {fmtPKR(item.unit_price)} / {item.unit}</div>
          </div>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{item.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium block">
            Quantity ({item.unit})
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
              className="mt-1 w-full h-9 px-2 rounded-md border bg-background text-sm" />
          </label>
          <label className="text-xs font-medium block">
            Preferred start
            <input type="date" value={prefStart} onChange={(e) => setPrefStart(e.target.value)}
              className="mt-1 w-full h-9 px-2 rounded-md border bg-background text-sm" />
          </label>
        </div>
        <label className="text-xs font-medium block mt-3">
          Notes / requirements
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the team should know before starting…"
            className="mt-1 w-full px-2 py-1.5 rounded-md border bg-background text-sm" />
        </label>
        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtPKR(subtotal)}</span></div>
          {item.gst_rate ? <div className="flex justify-between"><span className="text-muted-foreground">GST ({item.gst_rate}%)</span><span>{fmtPKR(gst)}</span></div> : null}
          <div className="flex justify-between font-semibold text-sm pt-1 border-t"><span>Estimated total</span><span>{fmtPKR(total)}</span></div>
          <p className="text-[10px] text-muted-foreground pt-1">This is a booking request. Our team will confirm scope, timeline and final pricing before starting.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSubmit(item, qty, prefStart, notes)}>
            <ShoppingCart className="h-3 w-3 mr-1" /> Submit request
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      {text}
    </div>
  );
}
