import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";

export const Route = createFileRoute("/portal/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Devionic Client Portal" },
      { name: "description", content: "Access contracts, invoices, reports and certificates shared with you." },
      { property: "og:title", content: "Documents — Devionic Client Portal" },
      { property: "og:description", content: "Access documents shared by Devionic." },
    ],
  }),
  component: PortalDocs,
});

function PortalDocs() {
  const ident = usePortalIdentity();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    try {
      const all = JSON.parse(window.localStorage.getItem("dms:generated_docs") ?? "[]") as any[];
      const mine = all.filter((d) => {
        const subj = (d.subject ?? "").toLowerCase();
        const notes = (d.notes ?? "").toLowerCase();
        return (
          (ident.company && (subj.includes(ident.company.toLowerCase()) || notes.includes(ident.company.toLowerCase()))) ||
          (ident.name && (subj.includes(ident.name.toLowerCase()) || notes.includes(ident.name.toLowerCase())))
        );
      });
      setRows(mine);
    } catch { setRows([]); }
  }, [ident.company, ident.name]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground">Contracts, invoices, reports & certificates shared with your account.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No documents shared with you yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Document</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{d.subject ?? d.title ?? `#${d.id}`}</td>
                  <td className="px-4 py-2 text-muted-foreground">{d.category ?? d.type ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{(d.created_at ?? d.date ?? "").slice(0, 10) || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {d.url ? (
                      <a href={d.url} download className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">On request</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
