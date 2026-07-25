import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  ListChecks,
  Printer,
  Save,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type AuditRunLike = {
  audit: { title: string };
  report: {
    executiveSummary: string;
    score: number;
    rating: string;
    kpis: { label: string; value: string; note?: string }[];
    sections: {
      heading: string;
      body: string;
      findings: { severity: "info" | "low" | "medium" | "high" | "critical"; text: string }[];
    }[];
    recommendations: { priority: "P1" | "P2" | "P3"; action: string; owner?: string }[];
    risks: { area: string; impact: "Low" | "Medium" | "High"; likelihood: "Low" | "Medium" | "High" }[];
    conclusion: string;
  };
  refNo: string;
  period: string;
  scope: string;
};

function severityColor(sev: string) {
  switch (sev) {
    case "critical": return "bg-red-100 text-red-800 border-red-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
    case "low": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function ratingColor(rating: string) {
  const r = rating.toLowerCase();
  if (r.includes("excellent")) return "text-emerald-600";
  if (r.includes("good")) return "text-teal-600";
  if (r.includes("needs")) return "text-amber-600";
  if (r.includes("poor")) return "text-orange-600";
  if (r.includes("critical")) return "text-red-600";
  return "text-slate-600";
}

export function AuditReportDialog({
  openReport,
  onClose,
  onPreview,
  onPrint,
  onDownload,
  onSave,
}: {
  openReport: AuditRunLike;
  onClose: () => void;
  onPreview: (run: any) => void | Promise<void>;
  onPrint: (run: any) => void | Promise<void>;
  onDownload: (run: any) => void | Promise<void>;
  onSave: (run: any) => void | Promise<void>;
}) {
  return (
    <Dialog open={!!openReport} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            {openReport.audit.title}
          </DialogTitle>
          <DialogDescription>
            {`${openReport.refNo} · ${openReport.period} · ${openReport.scope}`}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2 space-y-5">
          <div className="rounded-xl border p-4 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wider">Overall rating</div>
                <div className={`text-2xl font-bold ${ratingColor(openReport.report.rating)}`}>{openReport.report.rating}</div>
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Health score</span>
                  <span className="font-semibold">{openReport.report.score}/100</span>
                </div>
                <Progress value={openReport.report.score} />
              </div>
            </div>
            <p className="text-sm mt-3 leading-relaxed">{openReport.report.executiveSummary}</p>
          </div>

          {openReport.report.kpis?.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Key indicators
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openReport.report.kpis.map((k, i) => (
                  <div key={i} className="rounded-lg border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className="text-lg font-semibold">{k.value}</div>
                    {k.note && <div className="text-[11px] text-muted-foreground mt-0.5">{k.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {openReport.report.sections?.map((s, i) => (
            <div key={i}>
              <div className="text-sm font-semibold flex items-center gap-1 mb-1">
                <ListChecks className="h-4 w-4 text-primary" /> {s.heading}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              {s.findings?.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {s.findings.map((f, j) => (
                    <div key={j} className={`text-xs border rounded-md px-2.5 py-1.5 ${severityColor(f.severity)}`}>
                      <span className="font-semibold uppercase mr-1.5">{f.severity}</span>
                      {f.text}
                    </div>
                  ))}
                </div>
              )}
              <Separator className="mt-3" />
            </div>
          ))}

          {openReport.report.risks?.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Risk register
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {openReport.report.risks.map((r, i) => (
                  <div key={i} className="rounded-lg border p-2.5 text-xs bg-muted/20">
                    <div className="font-medium">{r.area}</div>
                    <div className="text-muted-foreground">Impact {r.impact} · Likelihood {r.likelihood}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openReport.report.recommendations?.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Recommendations
              </div>
              <div className="space-y-1.5">
                {openReport.report.recommendations.map((rec, i) => (
                  <div key={i} className="text-sm rounded-md border px-3 py-2 flex items-start gap-2 bg-emerald-500/5">
                    <Badge className="shrink-0 mt-0.5">{rec.priority}</Badge>
                    <div>
                      <div>{rec.action}</div>
                      {rec.owner && <div className="text-[11px] text-muted-foreground mt-0.5">Owner: {rec.owner}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-3">
            <div className="text-xs uppercase font-semibold text-primary mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Conclusion
            </div>
            <div className="text-sm leading-relaxed">{openReport.report.conclusion}</div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="gap-1" onClick={() => onPreview(openReport)}><Eye className="h-4 w-4" /> Preview PDF</Button>
          <Button variant="outline" className="gap-1" onClick={() => onPrint(openReport)}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="outline" className="gap-1" onClick={() => onDownload(openReport)}><Download className="h-4 w-4" /> Download</Button>
          <Button className="gap-1" onClick={() => onSave(openReport)}><Save className="h-4 w-4" /> Save to Docs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}