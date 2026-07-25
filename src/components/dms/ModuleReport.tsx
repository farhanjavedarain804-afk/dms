// UI helpers for the Module Report feature — a header action button and a
// "Generated Reports" card that lists PDFs saved for the current module.
import { useEffect, useState } from "react";
import { Download, FileText, Trash2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  downloadModuleReport,
  listModuleReports,
  removeModuleReport,
  openModuleReport,
  downloadSavedReport,
  type ModuleReportEntry,
  type ModuleReportInput,
} from "@/lib/module-report";

export function ModuleReportButton({
  build,
  label = "Download Report",
  variant = "outline",
}: {
  build: () => ModuleReportInput | Promise<ModuleReportInput>;
  label?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const input = await build();
          await downloadModuleReport(input);
          toast.success("Report generated & saved");
        } catch (e: any) {
          toast.error(e?.message ?? "Failed to generate report");
        } finally {
          setBusy(false);
        }
      }}
      className="gap-1.5"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {label}
    </Button>
  );
}

export function ModuleReportsCard({ module, title = "Generated Reports" }: { module: string; title?: string }) {
  const [rows, setRows] = useState<ModuleReportEntry[]>(() => listModuleReports(module));
  useEffect(() => {
    const refresh = () => setRows(listModuleReports(module));
    window.addEventListener("dms:module_reports:changed", refresh as EventListener);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("dms:module_reports:changed", refresh as EventListener);
      window.removeEventListener("focus", refresh);
    };
  }, [module]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {title}
              <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>PDF reports generated for this module — also mirrored in Docs &amp; Records.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Title</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Records</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Generated</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                    No reports generated yet. Click <span className="font-medium text-foreground">Download Report</span> above to create one.
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-sm">{r.totalRows}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" title="Preview" onClick={() => openModuleReport(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Download" onClick={() => downloadSavedReport(r)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Remove" onClick={() => { removeModuleReport(r.id); setRows(listModuleReports(module)); toast.success("Removed"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
