// Data-access layer for Devionic DMS — backed by Lovable Cloud.
import { supabase } from "@/integrations/supabase/client";

export type Employee = {
  id: number;
  name: string;
  father_husband_name?: string;
  cnic?: string;
  date_of_birth?: string;
  nationality?: string;
  email: string;
  department?: string;
  position?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  city?: string;
  tehsil?: string;
  district?: string;
  province?: string;
  postal_address?: string;
  permanent_address?: string;
  emergency_name?: string;
  emergency_relation?: string;
  emergency_phone?: string;
  emergency_whatsapp?: string;
  education?: string;
  work_experience?: string;
  documents?: string;
  join_date?: string;
  status: "active" | "inactive" | "on_leave";

  // For Office Use Only
  employee_code?: string;
  reporting_manager?: string;
  work_location?: string;
  employment_type?: string;
  probation_period?: string;
  confirmation_date?: string;
  gross_salary?: number;
  bank_name?: string;
  bank_account?: string;
  tax_number?: string;
  contract_type?: string;
  office_remarks?: string;
  verified_by?: string;
  approval_status?: string;
  approved_by?: string;
  approval_date?: string;

  // Salary breakdown
  basic_salary?: number;
  house_rent_allowance?: number;
  medical_allowance?: number;
  conveyance_allowance?: number;
  other_allowances?: number;
  income_tax?: number;
  eobi?: number;
  provident_fund?: number;
  other_deductions?: number;
  net_salary?: number;

  // Document checklist (Yes/No/N/A)
  chk_cnic_copy?: string;
  chk_photograph?: string;
  chk_edu_certs?: string;
  chk_exp_letters?: string;
  chk_reference_letters?: string;
  chk_bank_details?: string;
  chk_ntn_cert?: string;
  chk_offer_letter?: string;
  chk_nda?: string;
  chk_medical?: string;
  chk_police?: string;
  chk_emergency_form?: string;

  // HR Verification & Approval Record
  received_by?: string;
  received_date?: string;
  cnic_verified?: string;
  documents_verified?: string;
  references_checked?: string;
  background_check?: string;
  medical_check?: string;
  hr_verification_remarks?: string;

  // Signatures
  hr_officer_name?: string;
  hr_officer_date?: string;
  head_of_hr_name?: string;
  head_of_hr_date?: string;
  md_name?: string;
  md_date?: string;
  applicant_signature_date?: string;
};


export type Project = {
  id: number;
  name: string;
  client?: string;
  status: "planning" | "in_progress" | "on_hold" | "completed";
  progress: number;
  deadline?: string;
  budget?: number;
  // Project Management extensions
  code?: string;
  department?: string;
  category?: string;
  manager?: string;
  priority?: "low" | "medium" | "high" | "critical";
  currency?: string;
  estimated_hours?: number;
  description?: string;
  color?: string;
  tags?: string[];
  start_date?: string;
  archived?: boolean;
  favorite?: boolean;
  team_members?: string[];
  attachment?: string;
  status_history?: { at: string; title: string; description?: string; updated_by?: string; status?: string }[];
};

export type Task = {
  id: number;
  title: string;
  project_id?: number | null;
  assignee?: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  due_date?: string;
  start_date?: string;
  description?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  attachment?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  status_history?: { at: string; title: string; description?: string; updated_by?: string; status?: string }[];
};

export type ProjectMember = {
  id: number;
  project_id?: number;
  employee_id?: number;
  employee_name?: string;
  role?: string;
  allocation?: number;
  joined_on?: string;
};

export type Milestone = {
  id: number;
  project_id?: number;
  title: string;
  description?: string;
  due_date?: string;
  progress?: number;
  status?: string;
  budget?: number;
};

export type Timesheet = {
  id: number;
  project_id?: number;
  task_id?: number;
  employee_id?: number;
  employee_name?: string;
  entry_date?: string;
  minutes?: number;
  billable?: boolean;
  note?: string;
};

export type ProjectDocument = {
  id: number;
  project_id?: number;
  name: string;
  path?: string;
  size_bytes?: number;
  uploaded_by?: string;
};

export type Meeting = {
  id: number;
  project_id?: number;
  title: string;
  meeting_at?: string;
  duration_min?: number;
  attendees?: string[];
  agenda?: string;
  notes?: string;
  action_items?: string;
  status?: string;
};

export type Budget = {
  id: number;
  project_id?: number;
  category?: string;
  estimated?: number;
  approved?: number;
  spent?: number;
  notes?: string;
};

export type Expense = {
  id: number;
  project_id?: number;
  category?: string;
  amount: number;
  spent_on?: string;
  vendor?: string;
  note?: string;
};

export type ActivityLog = {
  id: number;
  project_id?: number;
  actor?: string;
  action?: string;
  meta?: any;
  created_at?: string;
};

export type TaskComment = {
  id: number;
  task_id?: number;
  author?: string;
  body: string;
  created_at?: string;
};

export type TaskChecklist = {
  id: number;
  task_id?: number;
  label: string;
  done?: boolean;
};



export type Attendance = {
  id: number;
  employee_id?: number;
  employee_name?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: "present" | "absent" | "late" | "leave";
};

export type FeedbackCall = {
  id: number;
  customer_id?: number | null;
  customer_name: string;
  phone?: string;
  email?: string;
  project_ref?: string;
  q1_service: number;
  q2_communication: number;
  q3_quality: number;
  q4_recommend: number;
  q5_timeline: number;
  total_score?: number;
  called_by_employee_id?: number | null;
  called_by_name?: string;
  notes?: string;
  call_date?: string;
  created_at?: string;
};

function crud<T extends { id: number }>(table: string) {
  const t = () => (supabase.from as any)(table);
  return {
    list: async (): Promise<T[]> => {
      const { data, error } = await t().select("*").order("id", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
    get: async (id: number): Promise<T> => {
      const { data, error } = await t().select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    create: async (body: Omit<T, "id">): Promise<T> => {
      const clean = stripEmpty(body);
      const { data, error } = await t().insert(clean).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    update: async (id: number, body: Partial<T>): Promise<T> => {
      const clean = stripEmpty(body);
      const { data, error } = await t().update(clean).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    remove: async (id: number) => {
      const { error } = await t().delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  };
}

function stripEmpty(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export const resources = {
  employees: crud<Employee>("employees"),
  projects: crud<Project>("projects"),
  tasks: crud<Task>("tasks"),
  attendance: crud<Attendance>("attendance"),
  // Project Management
  projectMembers: crud<ProjectMember>("project_members"),
  milestones: crud<Milestone>("project_milestones"),
  timesheets: crud<Timesheet>("project_timesheets"),
  projectDocuments: crud<ProjectDocument>("project_documents"),
  meetings: crud<Meeting>("project_meetings"),
  budgets: crud<Budget>("project_budgets"),
  expenses: crud<Expense>("project_expenses"),
  activityLogs: crud<ActivityLog>("project_activity_logs"),
  taskComments: crud<TaskComment>("project_task_comments"),
  taskChecklists: crud<TaskChecklist>("project_task_checklists"),
  feedbackCalls: crud<FeedbackCall>("feedback_calls"),
};

