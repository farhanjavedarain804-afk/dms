// Seeds demo cases (external + internal) into local storage on first load.
const SEED_FLAG = "dms:cases_v1:seeded";

type AnyCase = Record<string, unknown> & { id?: number };
type Api = {
  list: () => Promise<any[]>;
  create: (body: any) => Promise<any>;
};

export async function seedDummyCases(api: Api): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(SEED_FLAG)) return false;
  const existing = await api.list();
  if (existing.length > 0) {
    window.localStorage.setItem(SEED_FLAG, "1");
    return false;
  }

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const plus = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return iso(d);
  };

  const rows: Omit<AnyCase, "id">[] = [
    // ---------- AGAINST DEVIONIC ----------
    {
      case_no: "CV-2026-0417",
      type: "against",
      category: "Civil",
      title: "M/s Bright Retailers vs. Devionic (Pvt) Ltd — Software delivery dispute",
      status: "in_hearing",
      filed_on: plus(-58),
      court: "Civil Court, Lahore",
      bench: "Court No. 4",
      city: "Lahore",
      province: "Punjab",
      opposing_parties: ["M/s Bright Retailers", "Mr. Kamran Bhatti (Director)"],
      claim_amount: 1250000,
      our_lawyers: [
        { name: "Adv. Hafiz Muhammad Adnan", firm: "Adnan Law Associates", contact: "+92 300 4567890", cnic: "35202-1234567-1", license: "PBC-LHR-2011-887", address: "Fane Road, Lahore" },
      ],
      opposing_lawyers: [
        { name: "Adv. Sana Rauf", firm: "Rauf & Co.", contact: "+92 321 5566778", cnic: "35202-7654321-2", license: "PBC-LHR-2015-441", address: "Turner Road, Lahore" },
      ],
      description: "Plaintiff alleges delay in delivery of ERP module and seeks refund plus damages.",
      next_hearing: plus(9),
      next_hearing_time: "10:30",
      next_stage: "Evidence — Plaintiff Witness",
      hearings: [
        { date: plus(-40), time: "10:00", stage: "Framing of Issues", judge_name: "Mr. Zubair Ahmad, Civil Judge", judge_remarks: "Issues framed; both parties directed to file list of witnesses.", our_argument: "Contract clearly defines phased delivery; no default on our part.", outcome: "Adjourned for evidence.", next_date: plus(-15), next_time: "10:30", next_stage: "Evidence — Plaintiff Witness" },
        { date: plus(-15), time: "10:30", stage: "Evidence — PW-1", judge_name: "Mr. Zubair Ahmad, Civil Judge", judge_remarks: "PW-1 examined; cross partially completed.", our_argument: "Witness admitted receipt of Phase-1 deliverables.", outcome: "Adjourned for remaining cross.", next_date: plus(9), next_time: "10:30", next_stage: "Evidence — Plaintiff Witness" },
      ],
      attachments: [
        { title: "Plaint (Certified Copy)", from: "Civil Court, Lahore", to: "Devionic (Pvt) Ltd", date: plus(-58), description: "Certified copy of the plaint served on defendant." },
        { title: "Written Statement", from: "Devionic (Pvt) Ltd", to: "Civil Court, Lahore", date: plus(-45), description: "Filed within statutory period." },
      ],
    },
    {
      case_no: "TX-2026-0102",
      type: "against",
      category: "Tax",
      title: "FBR Show-Cause — Sales tax reconciliation FY 2024-25",
      status: "open",
      filed_on: plus(-20),
      court: "Commissioner Inland Revenue (Appeals), Lahore",
      city: "Lahore",
      province: "Punjab",
      opposing_parties: ["Federal Board of Revenue"],
      claim_amount: 640000,
      our_lawyers: [
        { name: "Adv. Sohail Nadeem (Tax Counsel)", firm: "Nadeem Tax Chambers", contact: "+92 333 1122334", cnic: "35202-9988776-3", license: "PBC-LHR-2009-201" },
      ],
      description: "Show-cause notice regarding input tax adjustment; reply under preparation.",
      next_hearing: plus(6),
      next_hearing_time: "11:00",
      next_stage: "Reply / Hearing",
      hearings: [],
      attachments: [
        { title: "Show-Cause Notice", from: "FBR RTO Lahore", to: "Devionic (Pvt) Ltd", date: plus(-20), description: "Notice u/s 11 & 33 of the Sales Tax Act." },
      ],
    },

    // ---------- BY DEVIONIC ----------
    {
      case_no: "REC-2026-0031",
      type: "by",
      category: "Corporate / Recovery",
      title: "Devionic vs. NexaMart Traders — Recovery of unpaid invoice",
      status: "open",
      filed_on: plus(-12),
      court: "Banking / Recovery Court, Lahore",
      city: "Lahore",
      province: "Punjab",
      opposing_parties: ["NexaMart Traders", "Mr. Faisal Nawaz (Proprietor)"],
      claim_amount: 875000,
      our_lawyers: [
        { name: "Adv. Hafiz Muhammad Adnan", firm: "Adnan Law Associates", contact: "+92 300 4567890", cnic: "35202-1234567-1", license: "PBC-LHR-2011-887" },
      ],
      opposing_lawyers: [
        { name: "Adv. Tariq Mehmood", firm: "Mehmood & Sons", contact: "+92 345 7788990", cnic: "35202-4455667-8", license: "PBC-LHR-2008-119" },
      ],
      description: "Suit for recovery of INV-2025-0416 for ERP customization services delivered and accepted.",
      next_hearing: plus(14),
      next_hearing_time: "09:30",
      next_stage: "Written Statement",
      hearings: [
        { date: plus(-3), time: "09:30", stage: "Preliminary", judge_name: "Ms. Aisha Rasheed", judge_remarks: "Notice issued to defendant.", our_argument: "Delivery challans and email acceptance placed on record.", outcome: "Notice issued; adjourned.", next_date: plus(14), next_time: "09:30", next_stage: "Written Statement" },
      ],
      attachments: [
        { title: "Suit + Annexures", from: "Devionic (Pvt) Ltd", to: "Recovery Court", date: plus(-12), description: "Invoice, delivery challan, email trail attached." },
      ],
    },
    {
      case_no: "CR-2026-0005",
      type: "by",
      category: "Criminal",
      title: "State (on complaint of Devionic) vs. Unknown — Data theft FIR",
      status: "open",
      filed_on: plus(-40),
      court: "Judicial Magistrate, Layyah",
      city: "Layyah",
      province: "Punjab",
      opposing_parties: ["Unknown accused"],
      fir_no: "FIR 214/2026",
      police_station: "PS City Layyah",
      our_lawyers: [
        { name: "Adv. Nauman Shafiq", firm: "Shafiq & Associates", contact: "+92 301 9988776", cnic: "36301-1122334-5", license: "PBC-DGK-2013-330" },
      ],
      description: "FIR lodged u/s 20 PECA 2016 regarding unauthorized exfiltration of customer database.",
      next_hearing: plus(21),
      next_hearing_time: "10:00",
      next_stage: "Investigation Progress",
      hearings: [],
      attachments: [
        { title: "FIR Copy", from: "PS City Layyah", to: "Devionic (Pvt) Ltd", date: plus(-40), description: "Certified copy of FIR 214/2026." },
      ],
    },

    // ---------- INTERNAL ----------
    {
      case_no: "INT-2026-0007",
      type: "internal",
      category: "Misconduct",
      title: "Inquiry against Mr. Bilal Yousuf — Unauthorized system access",
      status: "in_hearing",
      filed_on: plus(-25),
      employee_name: "Bilal Yousuf",
      allegation: "Accessed HR payroll database outside assigned scope on 3 occasions and shared screenshots on personal WhatsApp.",
      incident_date: plus(-30),
      reported_by: "Ms. Hina Aslam (HR Manager)",
      committee: "HR & Disciplinary Committee",
      committee_members: ["Mr. Usman Riaz (Chair, COO)", "Ms. Hina Aslam (HR)", "Mr. Zeeshan Latif (IT Head)"],
      description: "Committee constituted vide office order INT-OM-14/2026 to inquire into the matter.",
      next_hearing: plus(4),
      next_hearing_time: "14:00",
      next_stage: "Final Arguments",
      hearings: [
        { date: plus(-18), time: "14:00", stage: "First Appearance", judge_name: "Mr. Usman Riaz (Chair)", judge_remarks: "Charge read out; respondent denied allegations.", outcome: "Adjourned for evidence.", next_date: plus(-8), next_time: "14:00", next_stage: "Evidence" },
        { date: plus(-8), time: "14:00", stage: "Evidence", judge_name: "Mr. Usman Riaz (Chair)", judge_remarks: "IT logs presented and marked as Ex-C1. Respondent cross-examined witness.", outcome: "Adjourned for final arguments.", next_date: plus(4), next_time: "14:00", next_stage: "Final Arguments" },
      ],
      filings: [
        { title: "Complaint by HR", filed_by: "Ms. Hina Aslam", date: plus(-25), description: "Formal written complaint with audit logs attached." },
        { title: "Reply to Show-Cause", filed_by: "Mr. Bilal Yousuf", date: plus(-14), description: "Denies willful misconduct; claims curiosity access." },
      ],
      notices: [
        { ref_no: "INT-2026-0007/N-1", kind: "Show-Cause", to: "Mr. Bilal Yousuf", subject: "Show-cause for unauthorized access to HR payroll data", body: "You are called upon to explain in writing within 7 days why disciplinary action should not be initiated against you.", issued_on: plus(-22), response_due: plus(-15), response: "Reply received, denying willful intent.", response_on: plus(-14) },
        { ref_no: "INT-2026-0007/N-2", kind: "Appearance", to: "Mr. Bilal Yousuf", subject: "Appearance before Disciplinary Committee", body: "You are required to appear before the Committee on the date/time noted above.", issued_on: plus(-20), response_due: plus(-18) },
      ],
      arguments_list: [
        { party: "Complainant", name: "Ms. Hina Aslam", date: plus(-8), content: "IT audit logs conclusively show respondent accessed payroll DB using HR-VPN credentials of a colleague." },
        { party: "Respondent", name: "Mr. Bilal Yousuf", date: plus(-8), content: "Denies intent; states colleague's session was already open on shared workstation." },
        { party: "Witness", name: "Mr. Zeeshan Latif (IT Head)", date: plus(-8), content: "Confirmed authenticity of logs and access timestamps." },
      ],
      orders: [
        { order_no: "INT-2026-0007/O-1", kind: "Interim", date: plus(-17), issued_by: "HR & Disciplinary Committee", content: "Respondent's access to HR/Payroll systems suspended pending inquiry.", effective_from: plus(-17) },
      ],
      reports: [
        { title: "Interim Committee Report", prepared_by: "Mr. Usman Riaz (Chair)", date: plus(-9), findings: "Prima facie evidence of unauthorized access established through IT audit logs (Ex-C1).", recommendations: "Proceed to final arguments; consider written warning and mandatory security-awareness training subject to final findings." },
      ],
      attachments: [
        { title: "IT Access Audit Log", from: "IT Department", to: "Disciplinary Committee", date: plus(-24), description: "System-generated access log for HR-DB (30 days)." },
      ],
    },
    {
      case_no: "INT-2026-0008",
      type: "internal",
      category: "Attendance / Absenteeism",
      title: "Inquiry against Ms. Rabia Kanwal — Habitual absenteeism",
      status: "open",
      filed_on: plus(-6),
      employee_name: "Rabia Kanwal",
      allegation: "12 unauthorized absences within a rolling 60-day window without prior leave application.",
      incident_date: plus(-10),
      reported_by: "Mr. Adeel Cheema (Line Manager)",
      committee: "HR Committee",
      committee_members: ["Ms. Hina Aslam (HR)", "Mr. Adeel Cheema (Line Manager)"],
      description: "Preliminary review completed; show-cause issued.",
      next_hearing: plus(11),
      next_hearing_time: "11:30",
      next_stage: "First Appearance",
      hearings: [],
      filings: [
        { title: "Attendance Report", filed_by: "HR Systems", date: plus(-6), description: "System-generated absenteeism report for last 60 days." },
      ],
      notices: [
        { ref_no: "INT-2026-0008/N-1", kind: "Show-Cause", to: "Ms. Rabia Kanwal", subject: "Show-cause — habitual absenteeism", body: "You are directed to submit written explanation within 5 working days.", issued_on: plus(-5), response_due: plus(0) },
      ],
      arguments_list: [],
      orders: [],
      reports: [],
      attachments: [],
    },
  ];

  for (const r of rows) {
    // eslint-disable-next-line no-await-in-loop
    await api.create(r);
  }
  window.localStorage.setItem(SEED_FLAG, "1");
  return true;
}
