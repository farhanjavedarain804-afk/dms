import { useState, useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentUploader } from "@/components/dms/DocumentUploader";
import { FileAttachment } from "@/components/dms/FileAttachment";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export type FieldDef<T> = {
  name: keyof T & string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "time" | "select" | "multiselect" | "combobox" | "textarea" | "tel" | "computed" | "document_upload" | "file_attachment";
  uploadFolder?: string;
  options?: { value: string; label: string }[];
  optionsFrom?: (values: Record<string, any>) => { value: string; label: string }[];
  onAddOption?: (value: string, values: Record<string, any>) => void;
  required?: boolean;
  placeholder?: string;
  hideInTable?: boolean;
  section?: string;
  fullWidth?: boolean;
  compute?: (values: Record<string, any>) => string;
  render?: (value: any, row: T) => ReactNode;
};

type Props<T extends { id: number }> = {
  title: string;
  fields: FieldDef<T>[];
  api: {
    list: () => Promise<T[]>;
    create: (b: Omit<T, "id">) => Promise<T>;
    update: (id: number, b: Partial<T>) => Promise<T>;
    remove: (id: number) => Promise<any>;
  };
  queryKey: string;
  searchable?: (keyof T & string)[];
  defaults?: Partial<T>;
  rowActions?: (row: T) => ReactNode;
  onAfterCreate?: (row: T) => void;
  filter?: (row: T) => boolean;
  toolbar?: ReactNode;
  formHeader?: (patch: (values: Record<string, any>) => void) => ReactNode;
};

export function CrudTable<T extends { id: number }>({
  title, fields, api, queryKey, searchable = [], defaults = {}, rowActions, onAfterCreate, filter, toolbar, formHeader,
}: Props<T>) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: api.list,
    retry: (failureCount, error: any) => {
      const msg = String(error?.message ?? "");
      // Retry transient network hiccups aggressively (Supabase URL blips, CORS preflight timeouts)
      const transient = /Failed to fetch|NetworkError|fetch failed|ETIMEDOUT|ECONNRESET|Load failed/i.test(msg);
      return transient && failureCount < 4;
    },
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<T | null>(null);


  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const createMut = useMutation({
    mutationFn: (body: Omit<T, "id">) => api.create(body),
    onSuccess: (row) => { invalidate(); toast.success(`${title} created`); setOpen(false); onAfterCreate?.(row); },
    onError: (e: any) => toast.error(e.message ?? "Failed to create"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<T> }) => api.update(id, body),
    onSuccess: () => { invalidate(); toast.success(`${title} updated`); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });
  const removeMut = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => { invalidate(); toast.success(`${title} deleted`); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const rows = (query.data ?? []).filter((r) => {
    if (filter && !filter(r)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return searchable.some((k) => String(r[k] ?? "").toLowerCase().includes(q));
  });

  const visibleFields = fields.filter((f) => !f.hideInTable).slice(0, 6);

  const total = rows.length;

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-56 max-w-md rounded-lg border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40 transition">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          {toolbar}
          <span className="hidden sm:inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? "record" : "records"}
          </span>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)} className="shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> New {title}
            </Button>
          </DialogTrigger>
          <FormDialog
            key={editing ? `edit-${editing.id}` : "new"}
            title={editing ? `Edit ${title}` : `New ${title}`}
            fields={fields}
            initial={editing ?? (defaults as any)}
            submitting={createMut.isPending || updateMut.isPending}
            formHeader={editing ? undefined : formHeader}
            onSubmit={(values) => {
              if (editing) updateMut.mutate({ id: editing.id, body: values as Partial<T> });
              else createMut.mutate(values as Omit<T, "id">);
            }}
          />

        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {visibleFields.map((f) => (
                <TableHead key={f.name} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </TableHead>
              ))}
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow><TableCell colSpan={visibleFields.length + 1} className="text-center text-sm text-muted-foreground py-10">Loading…</TableCell></TableRow>
            )}
            {query.isError && (
              <TableRow><TableCell colSpan={visibleFields.length + 1} className="text-center py-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-destructive max-w-md">
                    {(query.error as any)?.message ?? "Failed to load"}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
                    {query.isFetching ? "Retrying…" : "Retry"}
                  </Button>
                </div>
              </TableCell></TableRow>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} className="text-center py-14">
                  <div className="mx-auto flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No {title.toLowerCase()} records yet</p>
                    <p className="text-xs">Click "New {title}" to add your first entry.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                {visibleFields.map((f) => (
                  <TableCell key={f.name} className="align-middle">
                    {f.render ? f.render((row as any)[f.name], row) : String((row as any)[f.name] ?? "—")}
                  </TableCell>
                ))}
                <TableCell className="text-right whitespace-nowrap">
                  {rowActions?.(row)}
                  <Button size="sm" variant="ghost" title="View" onClick={() => setViewing(row)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(row); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleteId(row.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {title.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && removeMut.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title} details</DialogTitle>
          </DialogHeader>
          {viewing && (() => {
            const groups: { section: string; items: FieldDef<T>[] }[] = [];
            for (const f of fields) {
              const s = f.section ?? "Details";
              let g = groups.find((x) => x.section === s);
              if (!g) { g = { section: s, items: [] }; groups.push(g); }
              g.items.push(f);
            }
            const fmt = (f: FieldDef<T>) => {
              if (f.type === "computed" && f.compute) return f.compute(viewing as any) || "—";
              const v = (viewing as any)[f.name];
              if (f.type === "document_upload") {
                if (!v) return "—";
                return (
                  <button
                    type="button"
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                    onClick={async () => {
                      const { data, error } = await (await import("@/lib/db-client")).supabase
                        .storage.from("employee-documents").createSignedUrl(v, 300);
                      if (error) return;
                      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open merged PDF
                  </button>
                );
              }
              if (f.type === "file_attachment") {
                if (!v) return "—";
                const idx = String(v).indexOf("::");
                const path = idx === -1 ? String(v) : String(v).slice(0, idx);
                const name = idx === -1 ? path.split("/").pop() ?? path : String(v).slice(idx + 2);
                const openSigned = async (download?: boolean) => {
                  const { supabase } = await import("@/lib/db-client");
                  const { data, error } = await db.storage
                    .from("docs-attachments")
                    .createSignedUrl(path, 300, download ? { download: name } : undefined);
                  if (error) return;
                  if (download) window.location.href = data.signedUrl;
                  else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                };
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 hover:opacity-80 text-sm truncate max-w-[240px]"
                      title={name}
                      onClick={() => openSigned(false)}
                    >
                      {name}
                    </button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openSigned(false)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openSigned(true)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </Button>
                  </div>
                );
              }
              if (f.render) return f.render(v, viewing);
              if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "—";
              if (f.type === "select" && f.options) {
                return f.options.find((o) => o.value === v)?.label ?? String(v);
              }
              if (f.type === "multiselect" && Array.isArray(v)) {
                const labels = v.map((x: string) => f.options?.find((o) => o.value === x)?.label ?? x);
                return labels.join(", ");
              }
              return String(v);
            };
            return (
              <div className="space-y-6">
                {groups.map((g) => (
                  <div key={g.section} className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                      {g.section}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                      {g.items.map((f) => (
                        <div key={f.name} className={(f.fullWidth || f.type === "textarea" || f.type === "document_upload" || f.type === "file_attachment") ? "md:col-span-2" : ""}>
                          <div className="text-xs text-muted-foreground">{f.label}</div>
                          <div className="text-sm font-medium whitespace-pre-wrap break-words">{fmt(f)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                  <Button onClick={() => { setEditing(viewing); setViewing(null); setOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormDialog<T>({
  title, fields, initial, onSubmit, submitting, formHeader,
}: {
  title: string;
  fields: FieldDef<T>[];
  initial: Partial<T>;
  submitting: boolean;
  onSubmit: (values: Partial<T>) => void;
  formHeader?: (patch: (values: Record<string, any>) => void) => ReactNode;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => ({ ...initial }));
  const patch = (v: Record<string, any>) => setValues((s) => ({ ...s, ...v }));

  // Group fields by section, preserving order
  const groups: { section: string; items: FieldDef<T>[] }[] = [];
  for (const f of fields) {
    const s = f.section ?? "Details";
    let g = groups.find((x) => x.section === s);
    if (!g) { g = { section: s, items: [] }; groups.push(g); }
    g.items.push(f);
  }

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {formHeader && <div className="mb-2">{formHeader(patch)}</div>}
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const cleaned: Record<string, any> = {};
          for (const f of fields) {
            if (f.type === "computed") continue;
            let v = values[f.name];
            if (f.type === "number" && v !== "" && v != null) v = Number(v);
            cleaned[f.name] = v ?? null;
          }
          onSubmit(cleaned as Partial<T>);
        }}
      >
        {groups.map((g) => (
          <div key={g.section} className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              {g.section}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {g.items.map((f) => {
                const wide = f.fullWidth || f.type === "textarea" || f.type === "document_upload" || f.type === "file_attachment";
                return (
                  <div key={f.name} className={wide ? "md:col-span-2" : ""}>
                    <Label htmlFor={f.name}>
                      {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                    {f.type === "select" ? (
                      <select
                        id={f.name}
                        required={f.required}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select…</option>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : f.type === "combobox" ? (
                      <Combobox
                        options={(f.optionsFrom ? f.optionsFrom(values) : f.options) ?? []}
                        value={values[f.name] ?? ""}
                        onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                        onAddOption={f.onAddOption ? (v) => f.onAddOption!(v, values) : undefined}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    ) : f.type === "multiselect" ? (
                      <MultiSelect
                        options={f.options ?? []}
                        value={Array.isArray(values[f.name]) ? values[f.name] : []}
                        onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                        placeholder={f.placeholder}
                      />
                    ) : f.type === "textarea" ? (
                      <textarea
                        id={f.name}
                        required={f.required}
                        placeholder={f.placeholder}
                        rows={3}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                      />
                    ) : f.type === "computed" ? (
                      <Input
                        id={f.name}
                        readOnly
                        placeholder={f.placeholder}
                        value={f.compute ? f.compute(values) : (values[f.name] ?? "")}
                        className="bg-muted/50 cursor-not-allowed"
                      />
                    ) : f.type === "document_upload" ? (
                      <DocumentUploader
                        value={values[f.name] ?? null}
                        folder={f.uploadFolder ?? "employees"}
                        onChange={(path) => setValues((s) => ({ ...s, [f.name]: path }))}
                      />
                    ) : f.type === "file_attachment" ? (
                      <FileAttachment
                        value={values[f.name] ?? null}
                        folder={f.uploadFolder ?? "docs"}
                        onChange={(val) => setValues((s) => ({ ...s, [f.name]: val }))}
                      />
                    ) : (
                      <Input
                        id={f.name}
                        type={f.type ?? "text"}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function MultiSelect({ options, value, onChange, placeholder }: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full text-left rounded-md border border-input bg-background px-3 py-2 text-sm min-h-10">
        {value.length === 0
          ? <span className="text-muted-foreground">{placeholder ?? "Select…"}</span>
          : <span className="flex flex-wrap gap-1">
              {value.map((v) => (
                <span key={v} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                  {options.find((o) => o.value === v)?.label ?? v}
                </span>
              ))}
            </span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md p-1">
          {options.length === 0 && <div className="text-xs text-muted-foreground px-2 py-1.5">No options</div>}
          {options.map((o) => {
            const checked = value.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            );
          })}
          <div className="border-t mt-1 pt-1 px-1">
            <button type="button" onClick={() => setOpen(false)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Combobox({ options, value, onChange, onAddOption, placeholder, required }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  onAddOption?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;
  const exact = options.some((o) => o.label.toLowerCase() === q);
  const pick = (v: string) => { onChange(v); setQuery(""); setOpen(false); };
  const add = () => {
    const v = query.trim();
    if (!v) return;
    onAddOption?.(v);
    pick(v);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        required={required}
        placeholder={placeholder ?? "Search or type to add…"}
        value={open ? query : value}
        onFocus={() => { setQuery(value ?? ""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (filtered.length > 0) pick(filtered[0].value);
            else if (onAddOption) add();
          }
        }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover shadow-md">
          {filtered.length === 0 && !q && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No options yet — type to add one</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
              onClick={() => pick(o.value)}
            >
              {o.label}
            </button>
          ))}
          {q && !exact && onAddOption && (
            <button
              type="button"
              className="block w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent border-t"
              onClick={add}
            >
              + Add "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
