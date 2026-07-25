// PDF generators for Internal Case Management — Notices, Orders, Committee Reports.
// All documents render on the Devionic letterhead.
import { COMPANY } from "@/lib/company";
import {
  downloadLetterhead,
  printLetterhead,
  type LetterhaedPdfOptions,
} from "@/lib/letterhead-pdf";

export type CaseCtx = {
  case_no: string;
  title: string;
  employee_name?: string;
  employee_designation?: string;
  employee_department?: string;
  allegation?: string;
  incident_date?: string;
  committee?: string;
  committee_members?: string[];
  reported_by?: string;
  filed_on?: string;
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

// -----------------------------
// NOTICE (Show-cause / Appearance / Warning / Suspension)
// -----------------------------
export type NoticeInput = {
  ref_no?: string;
  kind?: string; // Show-Cause / Appearance / Warning / Suspension / Final Notice
  to?: string;
  subject?: string;
  body?: string;
  issued_on?: string;
  response_due?: string;
  signatory_name?: string;
  signatory_title?: string;
};

export function buildNoticePdf(c: CaseCtx, n: NoticeInput): LetterhaedPdfOptions {
  const lines: string[] = [];
  lines.push(`Case Reference No.: ${c.case_no}`);
  lines.push(`Case Title: ${c.title}`);
  if (c.employee_name) {
    lines.push(
      `Employee: ${c.employee_name}` +
        (c.employee_designation ? `, ${c.employee_designation}` : "") +
        (c.employee_department ? ` (${c.employee_department})` : ""),
    );
  }
  if (c.incident_date) lines.push(`Date of Incident: ${fmtDate(c.incident_date)}`);
  lines.push("");
  if (c.allegation) {
    lines.push("Allegation / Background:");
    lines.push(c.allegation);
    lines.push("");
  }
  if (n.body) {
    lines.push(n.body);
    lines.push("");
  }
  if (n.response_due) {
    lines.push(
      `You are hereby required to submit your written reply / appear before the Committee on or before ${fmtDate(
        n.response_due,
      )}. Failure to comply may result in ex-parte proceedings and disciplinary action as per company policy.`,
    );
  }

  return {
    refNo: n.ref_no || c.case_no,
    date: fmtDate(n.issued_on),
    recipientLines: [n.to || c.employee_name || "", c.employee_department ?? ""].filter(Boolean),
    subject: n.subject || `${n.kind || "Notice"} — ${c.title}`,
    salutation: "Dear Sir/Madam,",
    body: lines.join("\n"),
    closing: "For and on behalf of\n" + COMPANY.name,
    signatoryName: n.signatory_name || c.committee || "Disciplinary Committee",
    signatoryTitle: n.signatory_title || c.committee || "HR & Disciplinary Committee",
  };
}

// -----------------------------
// ORDER (Interim / Final / Penalty)
// -----------------------------
export type OrderInput = {
  order_no?: string;
  kind?: string; // Interim / Final / Penalty / Dismissal / Reinstatement
  date?: string;
  issued_by?: string;
  content?: string;
  penalty?: string;
  effective_from?: string;
};

export function buildOrderPdf(c: CaseCtx, o: OrderInput): LetterhaedPdfOptions {
  const lines: string[] = [];
  lines.push(`ORDER No.: ${o.order_no || "—"}`);
  lines.push(`Case No.: ${c.case_no}`);
  lines.push(`Case Title: ${c.title}`);
  if (c.employee_name) {
    lines.push(
      `Respondent: ${c.employee_name}` +
        (c.employee_designation ? `, ${c.employee_designation}` : "") +
        (c.employee_department ? ` (${c.employee_department})` : ""),
    );
  }
  lines.push(`Order Type: ${o.kind || "Order"}`);
  lines.push("");
  if (c.allegation) {
    lines.push("Allegation:");
    lines.push(c.allegation);
    lines.push("");
  }
  if (o.content) {
    lines.push("Findings & Order:");
    lines.push(o.content);
    lines.push("");
  }
  if (o.penalty) {
    lines.push(`Penalty Imposed: ${o.penalty}`);
  }
  if (o.effective_from) {
    lines.push(`Effective From: ${fmtDate(o.effective_from)}`);
  }
  lines.push("");
  lines.push(
    "This order is issued pursuant to the company's HR and disciplinary policy. Any appeal against this order shall be preferred in writing within seven (7) days of receipt to the appellate authority.",
  );

  return {
    refNo: o.order_no || c.case_no,
    date: fmtDate(o.date),
    subject: `${o.kind || "Order"} in the matter of ${c.title}`,
    body: lines.join("\n"),
    closing: "For and on behalf of\n" + COMPANY.name,
    signatoryName: o.issued_by || c.committee || "Disciplinary Committee",
    signatoryTitle: "Issuing Authority",
  };
}

// -----------------------------
// COMMITTEE / INVESTIGATION REPORT
// -----------------------------
export type ReportInput = {
  title?: string;
  prepared_by?: string;
  date?: string;
  findings?: string;
  recommendations?: string;
};

export function buildReportPdf(c: CaseCtx, r: ReportInput): LetterhaedPdfOptions {
  const lines: string[] = [];
  lines.push(`Case No.: ${c.case_no}`);
  lines.push(`Case Title: ${c.title}`);
  if (c.employee_name) lines.push(`Employee: ${c.employee_name}`);
  if (c.committee) lines.push(`Committee: ${c.committee}`);
  if (c.committee_members && c.committee_members.length) {
    lines.push(`Committee Members: ${c.committee_members.filter(Boolean).join(", ")}`);
  }
  if (c.reported_by) lines.push(`Complainant: ${c.reported_by}`);
  if (c.filed_on) lines.push(`Case Filed On: ${fmtDate(c.filed_on)}`);
  lines.push("");
  if (c.allegation) {
    lines.push("1. Allegation:");
    lines.push(c.allegation);
    lines.push("");
  }
  if (r.findings) {
    lines.push("2. Findings:");
    lines.push(r.findings);
    lines.push("");
  }
  if (r.recommendations) {
    lines.push("3. Recommendations:");
    lines.push(r.recommendations);
    lines.push("");
  }

  return {
    refNo: c.case_no,
    date: fmtDate(r.date),
    subject: r.title || `Committee Report — ${c.title}`,
    body: lines.join("\n"),
    closing: "Respectfully submitted,",
    signatoryName: r.prepared_by || c.committee || "Inquiry Committee",
    signatoryTitle: c.committee || "Disciplinary Committee",
  };
}

// -----------------------------
// FULL CASE REPORT (comprehensive)
// -----------------------------
export function buildFullCaseReportPdf(
  c: CaseCtx,
  data: {
    hearings?: Array<any>;
    filings?: Array<any>;
    notices?: Array<any>;
    argumentsList?: Array<any>;
    orders?: Array<any>;
    reports?: Array<any>;
    status?: string;
  },
): LetterhaedPdfOptions {
  const L: string[] = [];
  L.push(`CASE FILE REPORT`);
  L.push(`Case No.: ${c.case_no}    Status: ${data.status ?? "—"}`);
  L.push(`Title: ${c.title}`);
  if (c.employee_name)
    L.push(
      `Respondent: ${c.employee_name}` +
        (c.employee_designation ? `, ${c.employee_designation}` : "") +
        (c.employee_department ? ` (${c.employee_department})` : ""),
    );
  if (c.reported_by) L.push(`Complainant: ${c.reported_by}`);
  if (c.filed_on) L.push(`Filed On: ${fmtDate(c.filed_on)}`);
  if (c.incident_date) L.push(`Incident Date: ${fmtDate(c.incident_date)}`);
  if (c.committee) L.push(`Committee: ${c.committee}`);
  if (c.committee_members?.length)
    L.push(`Members: ${c.committee_members.filter(Boolean).join(", ")}`);
  L.push("");
  if (c.allegation) {
    L.push("ALLEGATION");
    L.push(c.allegation);
    L.push("");
  }

  const section = (title: string, rows: string[]) => {
    L.push(title);
    if (rows.length === 0) L.push("  — Nil —");
    else rows.forEach((r) => L.push(r));
    L.push("");
  };

  section(
    "FILINGS",
    (data.filings ?? []).map(
      (f, i) =>
        `${i + 1}. ${f.title || "—"}${f.filed_by ? ` — by ${f.filed_by}` : ""}${f.date ? ` (${fmtDate(f.date)})` : ""}${
          f.description ? `\n   ${f.description}` : ""
        }`,
    ),
  );

  section(
    "NOTICES ISSUED",
    (data.notices ?? []).map(
      (n, i) =>
        `${i + 1}. [${n.kind || "Notice"}] Ref ${n.ref_no || "—"} to ${n.to || "—"} on ${fmtDate(n.issued_on)}${
          n.response_due ? `; reply due ${fmtDate(n.response_due)}` : ""
        }${n.subject ? `\n   Subject: ${n.subject}` : ""}${n.response ? `\n   Reply: ${n.response}` : ""}`,
    ),
  );

  section(
    "HEARINGS",
    (data.hearings ?? []).map(
      (h, i) =>
        `${i + 1}. ${fmtDate(h.date)}${h.time ? ` ${h.time}` : ""}${h.stage ? ` — ${h.stage}` : ""}${
          h.judge_name ? `\n   Chair: ${h.judge_name}` : ""
        }${h.judge_remarks ? `\n   Remarks: ${h.judge_remarks}` : ""}${
          h.our_argument ? `\n   Argument: ${h.our_argument}` : ""
        }${h.outcome ? `\n   Outcome: ${h.outcome}` : ""}`,
    ),
  );

  section(
    "ARGUMENTS / STATEMENTS",
    (data.argumentsList ?? []).map(
      (a, i) =>
        `${i + 1}. [${a.party || "—"}] ${a.name || "—"}${a.date ? ` (${fmtDate(a.date)})` : ""}${
          a.content ? `\n   ${a.content}` : ""
        }`,
    ),
  );

  section(
    "ORDERS",
    (data.orders ?? []).map(
      (o, i) =>
        `${i + 1}. [${o.kind || "Order"}] ${o.order_no || "—"} on ${fmtDate(o.date)}${
          o.issued_by ? ` by ${o.issued_by}` : ""
        }${o.content ? `\n   ${o.content}` : ""}${o.penalty ? `\n   Penalty: ${o.penalty}` : ""}`,
    ),
  );

  section(
    "COMMITTEE REPORTS",
    (data.reports ?? []).map(
      (r, i) =>
        `${i + 1}. ${r.title || "Report"}${r.prepared_by ? ` — ${r.prepared_by}` : ""}${
          r.date ? ` (${fmtDate(r.date)})` : ""
        }${r.findings ? `\n   Findings: ${r.findings}` : ""}${
          r.recommendations ? `\n   Recommendations: ${r.recommendations}` : ""
        }`,
    ),
  );

  return {
    refNo: c.case_no,
    date: fmtDate(),
    subject: `Full Case File Report — ${c.title}`,
    body: L.join("\n"),
    closing: "Certified true copy —",
    signatoryName: c.committee || "Disciplinary Committee",
    signatoryTitle: "Devionic HR & Disciplinary Committee",
  };
}

// -----------------------------
// Public helpers
// -----------------------------
export const casePdf = {
  downloadNotice: (c: CaseCtx, n: NoticeInput) =>
    downloadLetterhead(`notice-${c.case_no}-${n.kind || "notice"}`, buildNoticePdf(c, n)),
  printNotice: (c: CaseCtx, n: NoticeInput) => printLetterhead(buildNoticePdf(c, n)),

  downloadOrder: (c: CaseCtx, o: OrderInput) =>
    downloadLetterhead(`order-${c.case_no}-${o.order_no || "order"}`, buildOrderPdf(c, o)),
  printOrder: (c: CaseCtx, o: OrderInput) => printLetterhead(buildOrderPdf(c, o)),

  downloadReport: (c: CaseCtx, r: ReportInput) =>
    downloadLetterhead(`report-${c.case_no}`, buildReportPdf(c, r)),
  printReport: (c: CaseCtx, r: ReportInput) => printLetterhead(buildReportPdf(c, r)),

  downloadFullReport: (c: CaseCtx, data: Parameters<typeof buildFullCaseReportPdf>[1]) =>
    downloadLetterhead(`case-file-${c.case_no}`, buildFullCaseReportPdf(c, data)),
  printFullReport: (c: CaseCtx, data: Parameters<typeof buildFullCaseReportPdf>[1]) =>
    printLetterhead(buildFullCaseReportPdf(c, data)),
};
