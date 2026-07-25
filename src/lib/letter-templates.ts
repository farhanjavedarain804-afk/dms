// Letter templates for the Document Center.
// Each template exposes default body text with {{merge}} tokens.
// Users can edit the body freely before generating the PDF on Devionic letterhead.

export type LetterFieldType = "text" | "date" | "number" | "textarea";

export type LetterField = {
  name: string;
  label: string;
  type?: LetterFieldType;
  required?: boolean;
  placeholder?: string;
};

export type LetterTemplate = {
  id: string;
  name: string;
  category: "hr" | "client" | "notification";
  description: string;
  subject: string;
  fields: LetterField[];
  body: string;
  closing?: string;
};

const HR_FIELDS: LetterField[] = [
  { name: "employee_name", label: "Employee Name", required: true },
  { name: "father_name", label: "Father / Husband Name" },
  { name: "cnic", label: "CNIC" },
  { name: "designation", label: "Designation", required: true },
  { name: "department", label: "Department" },
  { name: "join_date", label: "Join Date", type: "date" },
  { name: "salary", label: "Gross Monthly Salary (PKR)", type: "number" },
  { name: "reporting_to", label: "Reporting To" },
  { name: "work_location", label: "Work Location", placeholder: "Head Office / Remote" },
];

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: "offer_letter",
    name: "Offer Letter",
    category: "hr",
    description: "Formal job offer to a prospective employee.",
    subject: "Offer of Employment",
    fields: HR_FIELDS,
    body: `Dear {{employee_name}},

We are pleased to offer you the position of {{designation}} at Devionic (Private) Limited. Based on our discussions and the assessment of your qualifications and experience, we believe you will make a valuable contribution to our team.

Terms of the Offer:
• Designation: {{designation}}
• Department: {{department}}
• Reporting To: {{reporting_to}}
• Work Location: {{work_location}}
• Proposed Joining Date: {{join_date}}
• Gross Monthly Salary: PKR {{salary}}

This offer is contingent upon successful completion of background verification and submission of the required documents (CNIC copy, academic certificates, experience letters, and two recent photographs).

Kindly confirm your acceptance by signing and returning a copy of this letter within seven (7) days of receipt. We look forward to welcoming you to the Devionic family.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "appointment_letter",
    name: "Appointment Letter",
    category: "hr",
    description: "Confirms appointment after the offer has been accepted.",
    subject: "Letter of Appointment",
    fields: HR_FIELDS,
    body: `Dear {{employee_name}},

With reference to your acceptance of our offer dated ______________, we are pleased to formally appoint you as {{designation}} in the {{department}} department of Devionic (Private) Limited with effect from {{join_date}}.

Terms & Conditions of Appointment:
1. Designation: {{designation}}, reporting to {{reporting_to}}.
2. Work Location: {{work_location}}. You may be transferred to any office or project site as required.
3. Remuneration: Your gross monthly salary shall be PKR {{salary}}, payable on the last working day of each month, subject to statutory deductions.
4. Probation: You shall be on probation for a period of three (3) months, extendable at the discretion of management.
5. Working Hours: Monday to Friday, 09:00 to 18:00, with one hour lunch break. Additional hours may be required based on project needs.
6. Leave: You shall be entitled to leave as per the Company's leave policy, in line with the applicable labour laws of Pakistan.
7. Confidentiality: You shall maintain strict confidentiality of all Company information, client data, source code and business dealings during and after your employment.
8. Termination: Either party may terminate this appointment by giving thirty (30) days written notice or one month's basic salary in lieu thereof.
9. This appointment is governed by the Company's HR Policy and the laws of the Islamic Republic of Pakistan.

Please sign and return the duplicate copy of this letter as a token of your acceptance of the above terms.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "employee_agreement",
    name: "Employee Agreement",
    category: "hr",
    description: "Full employment agreement including NDA and IP assignment.",
    subject: "Employment Agreement",
    fields: HR_FIELDS,
    body: `This Employment Agreement ("Agreement") is entered into between Devionic (Private) Limited, having its registered office at Head Office Devionic, Multan Road, Chowk Azam, Tehsil & District Layyah, Punjab, Pakistan — Postal Code 31450 ("Company"), and {{employee_name}}, S/o {{father_name}}, holder of CNIC {{cnic}} ("Employee"), effective {{join_date}}.

1. Position & Duties
   The Employee is engaged as {{designation}} in the {{department}} department and shall perform the duties assigned by the Company diligently and to the best of their ability.

2. Compensation
   The Company shall pay the Employee a gross monthly salary of PKR {{salary}}, subject to statutory deductions in accordance with the laws of Pakistan.

3. Confidentiality & Non-Disclosure
   The Employee shall not, during the term of this Agreement or at any time thereafter, disclose to any third party any confidential information, trade secrets, client data, source code, financial records or business plans of the Company.

4. Intellectual Property
   All work product, inventions, code, designs and creative works developed by the Employee during the course of employment shall be the sole and exclusive property of the Company.

5. Non-Compete & Non-Solicitation
   For a period of twelve (12) months following termination of employment, the Employee shall not directly or indirectly solicit any client, customer or employee of the Company, nor engage in a business that is in direct competition with the Company.

6. Termination
   Either party may terminate this Agreement by providing thirty (30) days written notice. The Company reserves the right to terminate immediately in case of misconduct, breach of confidentiality, or violation of Company policies.

7. Governing Law
   This Agreement shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lahore.

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "experience_letter",
    name: "Experience Letter",
    category: "hr",
    description: "Certifies past service after resignation or contract completion.",
    subject: "Experience Certificate",
    fields: [
      ...HR_FIELDS,
      { name: "leaving_date", label: "Last Working Day", type: "date" },
    ],
    body: `TO WHOM IT MAY CONCERN

This is to certify that Mr./Ms. {{employee_name}}, S/o/D/o {{father_name}}, holder of CNIC {{cnic}}, was a valued member of Devionic (Private) Limited from {{join_date}} to {{leaving_date}}.

During the tenure of employment, {{employee_name}} served in the capacity of {{designation}} in the {{department}} department. Throughout this period, we found them to be sincere, hardworking, professional, and technically competent. They discharged their duties with dedication and consistently demonstrated a positive attitude towards work and colleagues.

We wish {{employee_name}} continued success in all future endeavours.

This certificate is issued at the request of the employee for whatever legitimate purpose it may serve.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "relieving_letter",
    name: "Relieving Letter",
    category: "hr",
    description: "Confirms release of an employee after resignation.",
    subject: "Relieving Letter",
    fields: [
      ...HR_FIELDS,
      { name: "leaving_date", label: "Last Working Day", type: "date" },
    ],
    body: `Dear {{employee_name}},

This has reference to your resignation letter and the discussion thereafter. We hereby confirm that you have been relieved from your services with Devionic (Private) Limited with effect from close of business on {{leaving_date}}.

You joined the Company on {{join_date}} in the position of {{designation}} in the {{department}} department. We acknowledge that you have handed over the assigned responsibilities and Company property as per exit formalities.

We thank you for your contributions during your tenure with us and wish you the very best for your future endeavours.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "warning_letter",
    name: "Warning Letter",
    category: "hr",
    description: "Formal warning for misconduct or performance issues.",
    subject: "Formal Warning",
    fields: [
      ...HR_FIELDS,
      { name: "incident", label: "Incident / Reason", type: "textarea", required: true },
    ],
    body: `Dear {{employee_name}},

This letter serves as a formal written warning regarding the following matter:

{{incident}}

The above conduct/performance is not in line with the standards expected of employees of Devionic (Private) Limited and constitutes a violation of the Company's policies. You are hereby advised to take immediate corrective measures and ensure that such incidents do not recur.

Please note that any repetition of such behaviour or failure to demonstrate the required improvement may result in further disciplinary action, up to and including termination of your employment without further notice.

We trust you will take this warning in the right spirit and align your conduct with the Company's expectations.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "salary_certificate",
    name: "Salary Certificate",
    category: "hr",
    description: "For bank / visa / loan purposes.",
    subject: "Salary Certificate",
    fields: HR_FIELDS,
    body: `TO WHOM IT MAY CONCERN

This is to certify that Mr./Ms. {{employee_name}}, S/o/D/o {{father_name}}, holder of CNIC {{cnic}}, is a permanent employee of Devionic (Private) Limited since {{join_date}}. He/She is currently serving in the position of {{designation}} in the {{department}} department.

His/Her current gross monthly salary is PKR {{salary}} (Pakistani Rupees only), payable through bank transfer on the last working day of each month.

This certificate is issued at the request of the employee for the purpose of ________________________ and does not constitute any financial obligation on the part of the Company.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "client_contract",
    name: "Client Service Contract",
    category: "client",
    description: "Master service agreement with a client.",
    subject: "Service Contract",
    fields: [
      { name: "client_name", label: "Client Name", required: true },
      { name: "client_address", label: "Client Address", type: "textarea" },
      { name: "project_name", label: "Project / Scope Title", required: true },
      { name: "start_date", label: "Effective Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "contract_value", label: "Contract Value (PKR)", type: "number" },
      { name: "payment_terms", label: "Payment Terms", placeholder: "e.g. 50% advance, 50% on delivery" },
    ],
    body: `This Service Agreement ("Agreement") is made and entered into on {{start_date}} between Devionic (Private) Limited, having its registered office at Head Office Devionic, Multan Road, Chowk Azam, Tehsil & District Layyah, Punjab, Pakistan — Postal Code 31450 ("Service Provider"), and {{client_name}}, located at {{client_address}} ("Client").

1. Scope of Work
   The Service Provider shall design, develop and deliver the project titled "{{project_name}}" in accordance with the specifications mutually agreed between the parties.

2. Term
   This Agreement shall commence on {{start_date}} and shall remain in force until {{end_date}}, unless terminated earlier in accordance with the terms herein.

3. Fees & Payment
   The total contract value shall be PKR {{contract_value}}, exclusive of applicable taxes. Payment terms: {{payment_terms}}. All invoices shall be paid within fifteen (15) days of receipt.

4. Deliverables & Acceptance
   The Service Provider shall deliver the agreed milestones as per the project plan. The Client shall review each deliverable within seven (7) days; failure to respond within this period shall be deemed as acceptance.

5. Confidentiality
   Both parties agree to keep confidential all proprietary information, business plans, source code and data exchanged during the term of this Agreement.

6. Intellectual Property
   Upon full and final payment, ownership of the final deliverables shall vest with the Client. The Service Provider retains ownership of pre-existing tools, libraries and know-how.

7. Warranty & Support
   The Service Provider warrants the deliverables against defects for a period of ninety (90) days from acceptance and shall provide reasonable bug fixes at no additional cost during this period.

8. Termination
   Either party may terminate this Agreement by providing thirty (30) days written notice. The Client shall pay for all work completed up to the date of termination.

9. Governing Law
   This Agreement shall be governed by the laws of the Islamic Republic of Pakistan. Any dispute shall be subject to the exclusive jurisdiction of the courts of Lahore.

IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first written above.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "client_nda",
    name: "Client NDA",
    category: "client",
    description: "Mutual non-disclosure agreement with a client or vendor.",
    subject: "Non-Disclosure Agreement",
    fields: [
      { name: "client_name", label: "Counterparty Name", required: true },
      { name: "client_address", label: "Counterparty Address", type: "textarea" },
      { name: "purpose", label: "Purpose of Disclosure", type: "textarea", required: true },
      { name: "effective_date", label: "Effective Date", type: "date" },
    ],
    body: `This Non-Disclosure Agreement ("Agreement") is entered into on {{effective_date}} between Devionic (Private) Limited ("Devionic") and {{client_name}}, located at {{client_address}} ("Counterparty"). Devionic and the Counterparty are individually referred to as a "Party" and collectively as the "Parties".

Purpose: {{purpose}}

1. Confidential Information
   "Confidential Information" means any and all non-public information disclosed by one Party to the other, whether orally, in writing or in electronic form, including but not limited to business plans, source code, technical designs, client lists, pricing, and know-how.

2. Obligations
   Each Party agrees to (a) hold the Confidential Information in strict confidence, (b) use it solely for the Purpose stated above, and (c) not disclose it to any third party without prior written consent of the disclosing Party.

3. Exclusions
   Confidential Information does not include information that is (i) publicly known through no fault of the receiving Party, (ii) rightfully known before disclosure, or (iii) required to be disclosed by law or court order.

4. Term
   The obligations under this Agreement shall remain in effect for a period of three (3) years from the Effective Date.

5. Governing Law
   This Agreement shall be governed by the laws of the Islamic Republic of Pakistan.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "notice_general",
    name: "General Notification",
    category: "notification",
    description: "Company-wide notice or circular.",
    subject: "Notification",
    fields: [
      { name: "audience", label: "Addressed To", placeholder: "All Employees / Clients / Vendors", required: true },
      { name: "notice_title", label: "Notice Title", required: true },
      { name: "effective_date", label: "Effective Date", type: "date" },
    ],
    body: `To: {{audience}}

Subject: {{notice_title}}

This notification is issued to inform all concerned that, with effect from {{effective_date}}, the following shall apply:

[ Enter the details of the notice here. You may add multiple paragraphs, bullet points, or references to Company policies as required. ]

All concerned are advised to take note of the above and ensure strict compliance. Any queries in this regard may be directed to the HR & Admin department.`,
    closing: "For Devionic (Private) Limited",
  },
  {
    id: "notice_holiday",
    name: "Holiday Notification",
    category: "notification",
    description: "Public / company holiday announcement.",
    subject: "Holiday Notification",
    fields: [
      { name: "holiday_name", label: "Holiday Name", required: true },
      { name: "holiday_date", label: "Holiday Date", type: "date", required: true },
      { name: "resume_date", label: "Office Reopens On", type: "date" },
    ],
    body: `To: All Employees

Subject: Holiday Notification — {{holiday_name}}

This is to inform all employees that the Company shall remain closed on {{holiday_date}} on account of {{holiday_name}}.

Normal office operations shall resume on {{resume_date}}. Employees engaged on any critical project or client-facing support are requested to coordinate with their respective managers to ensure continuity of service during the holiday period.

Wishing everyone a pleasant and safe holiday.`,
    closing: "For Devionic (Private) Limited",
  },
];

export function fillTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => {
    const v = data[k];
    return v && v.trim() !== "" ? v : "____________";
  });
}
