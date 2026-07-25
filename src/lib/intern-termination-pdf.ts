// Intern Termination Letter — rendered on the Devionic letterhead.
import { downloadLetterhead, type LetterhaedPdfOptions } from "@/lib/letterhead-pdf";
import { generatedDocs } from "@/lib/generated-docs";
import { COMPANY } from "@/lib/company";

export type InternTerminationInput = {
  id: string;
  intern_code: string;
  name: string;
  father_name?: string;
  cnic?: string;
  department: string;
  supervisor?: string;
  start_date: string;
  end_date?: string;
  reason?: string;
  effective_date?: string;
};

function fmt(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
}

export function buildInternTerminationOpts(i: InternTerminationInput): { refNo: string; opts: LetterhaedPdfOptions } {
  const today = new Date();
  const refNo = `DEV/HR/INT-TERM/${today.getFullYear()}/${i.intern_code}`;
  const dateStr = today.toLocaleDateString("en-GB");
  const effective = i.effective_date ? fmt(i.effective_date) : dateStr;
  const reason = (i.reason && i.reason.trim())
    || "unsatisfactory performance, breach of internship policy and repeated failure to meet the assigned deliverables during the evaluation period";

  const body =
`Dear ${i.name.split(" ")[0] || i.name},

With reference to your internship engagement with ${COMPANY.name} under Intern ID ${i.intern_code} in the ${i.department} department${i.supervisor ? ` under the supervision of ${i.supervisor}` : ""}, commencing ${fmt(i.start_date)}, this letter serves as formal notification of the termination of your internship with the Company.

After a thorough review conducted by the HR & Departmental Heads, and following prior verbal / written counselling, the management has decided to discontinue your internship on account of ${reason}.

Termination Details:
• Intern Name: ${i.name}
• Intern ID: ${i.intern_code}
${i.cnic ? `• CNIC: ${i.cnic}\n` : ""}• Department: ${i.department}
${i.supervisor ? `• Supervisor: ${i.supervisor}\n` : ""}• Original Term: ${fmt(i.start_date)} to ${fmt(i.end_date)}
• Effective Date of Termination: ${effective}

You are advised to:
1. Return all Company property, access cards, laptops, credentials and confidential material issued to you on or before the effective date.
2. Complete the exit clearance form with the HR and IT departments.
3. Collect any pending stipend (if applicable) after clearance is signed off.
4. Continue to honour the Confidentiality and Non-Disclosure obligations as per the Internship Agreement.

Please note that ${COMPANY.name} will not be issuing an Internship Completion Certificate for this engagement. Any experience letter, if requested in future, shall reflect only the actual period served and the reason for early termination as recorded in our HR records.

We wish you the best for your future academic and professional endeavours.

For any queries related to clearance or dues, kindly contact the HR Department at ${COMPANY.email} or ${COMPANY.phone}.`;

  const opts: LetterhaedPdfOptions = {
    refNo,
    date: dateStr,
    subject: `Termination of Internship — ${i.name} (${i.intern_code})`,
    recipientLines: [
      `To: ${i.name}`,
      i.father_name ? `S/O / D/O: ${i.father_name}` : "",
      `Intern ID: ${i.intern_code}`,
      `Department: ${i.department}`,
    ].filter(Boolean) as string[],
    salutation: "",
    body,
    closing: `For ${COMPANY.name}`,
    signatoryName: "Head of Human Resources",
    signatoryTitle: "HR Department",
  };

  return { refNo, opts };
}

export async function downloadInternTerminationLetter(i: InternTerminationInput) {
  const { refNo, opts } = buildInternTerminationOpts(i);
  await downloadLetterhead(`intern_termination_${i.intern_code}`, opts);

  // Register in Docs & Records (system-generated) so it surfaces there.
  try {
    generatedDocs.add({
      doc_no: refNo,
      title: opts.subject || `Internship Termination — ${i.name}`,
      template_id: "intern_termination_letter",
      template_name: "Intern Termination Letter",
      category: "hr_letter",
      party: i.name,
      owner: "Head of Human Resources",
      signatory_title: "HR Department",
      date: opts.date || new Date().toLocaleDateString("en-GB"),
      opts,
    });
  } catch { /* noop */ }
}
