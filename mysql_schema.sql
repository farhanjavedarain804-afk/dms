-- Auto-generated MySQL Schema

CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  role VARCHAR(100) DEFAULT 'Member',
  password_hash VARCHAR(64) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employees (
  id bigint AUTO_INCREMENT PRIMARY KEY,
  name text not null,
  email text not null,
  department text,
  position text,
  phone text,
  join_date date,
  status text not null default 'active',
  created_at datetime not null default CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE projects (
  id bigint AUTO_INCREMENT PRIMARY KEY,
  name text not null,
  client text,
  status text not null default 'planning',
  progress int not null default 0,
  deadline date,
  budget decimal(15,2),
  created_at datetime not null default CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tasks (
  id bigint AUTO_INCREMENT PRIMARY KEY,
  title text not null,
  project_id bigint references projects(id) on delete set null,
  assignee text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  created_at datetime not null default CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendance (
  id bigint AUTO_INCREMENT PRIMARY KEY,
  employee_id bigint,
  employee_name text,
  date date not null,
  check_in text,
  check_out text,
  status text not null default 'present',
  created_at datetime not null default CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS father_husband_name text,
  ADD COLUMN IF NOT EXISTS cnic text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Pakistani',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS tehsil text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_address text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS emergency_name text,
  ADD COLUMN IF NOT EXISTS emergency_relation text,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS emergency_whatsapp text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS work_experience text,
  ADD COLUMN IF NOT EXISTS documents text;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS reporting_manager text,
  ADD COLUMN IF NOT EXISTS work_location text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS probation_period text,
  ADD COLUMN IF NOT EXISTS confirmation_date date,
  ADD COLUMN IF NOT EXISTS gross_salary decimal(15,2),
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS office_remarks text,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approval_date date;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS passport_no text,
  ADD COLUMN IF NOT EXISTS driving_licence text,
  ADD COLUMN IF NOT EXISTS residence_status text;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS basic_salary decimal(15,2),
  ADD COLUMN IF NOT EXISTS house_rent_allowance decimal(15,2),
  ADD COLUMN IF NOT EXISTS medical_allowance decimal(15,2),
  ADD COLUMN IF NOT EXISTS conveyance_allowance decimal(15,2),
  ADD COLUMN IF NOT EXISTS other_allowances decimal(15,2),
  ADD COLUMN IF NOT EXISTS income_tax decimal(15,2),
  ADD COLUMN IF NOT EXISTS eobi decimal(15,2),
  ADD COLUMN IF NOT EXISTS provident_fund decimal(15,2),
  ADD COLUMN IF NOT EXISTS other_deductions decimal(15,2),
  ADD COLUMN IF NOT EXISTS net_salary decimal(15,2),
  ADD COLUMN IF NOT EXISTS chk_cnic_copy text,
  ADD COLUMN IF NOT EXISTS chk_photograph text,
  ADD COLUMN IF NOT EXISTS chk_edu_certs text,
  ADD COLUMN IF NOT EXISTS chk_exp_letters text,
  ADD COLUMN IF NOT EXISTS chk_reference_letters text,
  ADD COLUMN IF NOT EXISTS chk_bank_details text,
  ADD COLUMN IF NOT EXISTS chk_ntn_cert text,
  ADD COLUMN IF NOT EXISTS chk_offer_letter text,
  ADD COLUMN IF NOT EXISTS chk_nda text,
  ADD COLUMN IF NOT EXISTS chk_medical text,
  ADD COLUMN IF NOT EXISTS chk_police text,
  ADD COLUMN IF NOT EXISTS chk_emergency_form text,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS cnic_verified text,
  ADD COLUMN IF NOT EXISTS documents_verified text,
  ADD COLUMN IF NOT EXISTS references_checked text,
  ADD COLUMN IF NOT EXISTS background_check text,
  ADD COLUMN IF NOT EXISTS medical_check text,
  ADD COLUMN IF NOT EXISTS hr_verification_remarks text,
  ADD COLUMN IF NOT EXISTS hr_officer_name text,
  ADD COLUMN IF NOT EXISTS hr_officer_date date,
  ADD COLUMN IF NOT EXISTS head_of_hr_name text,
  ADD COLUMN IF NOT EXISTS head_of_hr_date date,
  ADD COLUMN IF NOT EXISTS md_name text,
  ADD COLUMN IF NOT EXISTS md_date date,
  ADD COLUMN IF NOT EXISTS applicant_signature_date date;

-- ============ Extend existing projects table (nullable columns only) ============
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS estimated_hours decimal(15,2),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS tags json,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS archived tinyint(1) DEFAULT false,
  ADD COLUMN IF NOT EXISTS favorite tinyint(1) DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at datetime DEFAULT CURRENT_TIMESTAMP;

-- ============ project_members ============
CREATE TABLE IF NOT EXISTS project_members (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  employee_name text,
  role text,
  allocation integer DEFAULT 100,
  joined_on date DEFAULT current_date,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_milestones ============
CREATE TABLE IF NOT EXISTS project_milestones (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  progress integer DEFAULT 0,
  status text DEFAULT 'planned',
  budget decimal(15,2),
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_task_comments ============
CREATE TABLE IF NOT EXISTS project_task_comments (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  author text,
  body text NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_task_checklists ============
CREATE TABLE IF NOT EXISTS project_task_checklists (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  done tinyint(1) DEFAULT false,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_timesheets ============
CREATE TABLE IF NOT EXISTS project_timesheets (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  employee_name text,
  entry_date date DEFAULT current_date,
  started_at datetime,
  ended_at datetime,
  minutes integer DEFAULT 0,
  billable tinyint(1) DEFAULT true,
  note text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_documents ============
CREATE TABLE IF NOT EXISTS project_documents (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text,
  size_bytes bigint,
  uploaded_by text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_meetings ============
CREATE TABLE IF NOT EXISTS project_meetings (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_at datetime,
  duration_min integer DEFAULT 30,
  attendees json,
  agenda text,
  notes text,
  action_items text,
  status text DEFAULT 'scheduled',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_budgets ============
CREATE TABLE IF NOT EXISTS project_budgets (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  category text,
  estimated decimal(15,2) DEFAULT 0,
  approved decimal(15,2) DEFAULT 0,
  spent decimal(15,2) DEFAULT 0,
  notes text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_expenses ============
CREATE TABLE IF NOT EXISTS project_expenses (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  category text,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  spent_on date DEFAULT current_date,
  vendor text,
  note text,
  receipt_path text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ project_activity_logs ============
CREATE TABLE IF NOT EXISTS project_activity_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  actor text,
  action text,
  meta json,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_members json DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment text;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_history json NOT NULL DEFAULT '[]';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS estimated_hours decimal(15,2),
  ADD COLUMN IF NOT EXISTS actual_hours decimal(15,2),
  ADD COLUMN IF NOT EXISTS tags json,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS completed_at datetime,
  ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS tasks_touch_updated_at ON tasks;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_history json NOT NULL DEFAULT '[]';

-- Role enum
DO;

-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_varchar(36)(),
  user_id varchar(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP POLICY IF EXISTS "roles_read_all_auth" ON user_roles;

-- has_role helper
CREATE OR REPLACE FUNCTION has_role(_user_id varchar(36), _role app_role)
RETURNS tinyint(1) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS;

-- app_users
CREATE TABLE IF NOT EXISTS app_users (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  department TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at datetime,
  total_online_seconds BIGINT NOT NULL DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP POLICY IF EXISTS "app_users_read" ON app_users;

DROP POLICY IF EXISTS "app_users_self_update" ON app_users;

DROP POLICY IF EXISTS "app_users_admin_write" ON app_users;

DROP POLICY IF EXISTS "app_users_admin_delete" ON app_users;

DROP TRIGGER IF EXISTS app_users_touch ON app_users;

-- user_activity_logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  full_name TEXT,
  action TEXT NOT NULL,
  module TEXT,
  description TEXT,
  meta json,
  ip_address TEXT,
  user_agent TEXT,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP POLICY IF EXISTS "activity_read" ON user_activity_logs;

DROP POLICY IF EXISTS "activity_insert_self" ON user_activity_logs;

-- user_login_logs
CREATE TABLE IF NOT EXISTS user_login_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  full_name TEXT,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  city TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  login_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at datetime,
  duration_seconds BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP POLICY IF EXISTS "login_logs_read" ON user_login_logs;

DROP POLICY IF EXISTS "login_logs_insert_self" ON user_login_logs;

DROP POLICY IF EXISTS "login_logs_update_self" ON user_login_logs;

CREATE TABLE IF NOT EXISTS departments (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP POLICY IF EXISTS "Authenticated read departments" ON departments;

DROP POLICY IF EXISTS "Admins manage departments" ON departments;

DROP TRIGGER IF EXISTS trg_departments_updated ON departments;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;

DO;

DROP TRIGGER IF EXISTS trg_sync_app_user_from_employee ON employees;

DROP TRIGGER IF EXISTS trg_deactivate_app_user_on_employee_delete ON employees;

CREATE TABLE feedback_calls (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  project_ref TEXT,
  q1_service INT DEFAULT 0,
  q2_communication INT DEFAULT 0,
  q3_quality INT DEFAULT 0,
  q4_recommend INT DEFAULT 0,
  q5_timeline INT DEFAULT 0,
  total_score INT GENERATED ALWAYS AS (COALESCE(q1_service,0)+COALESCE(q2_communication,0)+COALESCE(q3_quality,0)+COALESCE(q4_recommend,0)+COALESCE(q5_timeline,0)) STORED,
  called_by_employee_id BIGINT,
  called_by_name TEXT,
  notes TEXT,
  call_date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INTERNAL NOTICES
CREATE TABLE internal_notices (
  id varchar(36) NOT NULL DEFAULT gen_random_varchar(36)() PRIMARY KEY,
  sender_id varchar(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  audience TEXT NOT NULL DEFAULT 'all',
  recipient_ids varchar(36)[] NOT NULL DEFAULT '{}',
  read_by varchar(36)[] NOT NULL DEFAULT '{}',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INTERNAL MESSAGES
CREATE TABLE internal_messages (
  id varchar(36) NOT NULL DEFAULT gen_random_varchar(36)() PRIMARY KEY,
  thread_id varchar(36) NOT NULL DEFAULT gen_random_varchar(36)(),
  sender_id varchar(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  recipient_id varchar(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read tinyint(1) NOT NULL DEFAULT false,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_internal_messages_thread ON internal_messages(thread_id, created_at);

CREATE INDEX idx_internal_messages_recipient ON internal_messages(recipient_id);

CREATE INDEX idx_internal_messages_sender ON internal_messages(sender_id);

-- Attachments columns
ALTER TABLE internal_notices ADD COLUMN IF NOT EXISTS attachments json NOT NULL DEFAULT '[]';

ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS attachments json NOT NULL DEFAULT '[]';

ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

-- Meetings table
CREATE TABLE meetings (
  id varchar(36) NOT NULL DEFAULT gen_random_varchar(36)() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  host_id varchar(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  participant_ids varchar(36)[] NOT NULL DEFAULT '{}',
  participant_names json NOT NULL DEFAULT '{}',
  room_name TEXT NOT NULL UNIQUE,
  meeting_type TEXT NOT NULL DEFAULT 'video',
  scheduled_at datetime,
  started_at datetime,
  ended_at datetime,
  status TEXT NOT NULL DEFAULT 'scheduled',
  recording_url TEXT,
  audience TEXT NOT NULL DEFAULT 'specific',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Storage RLS on comm-attachments bucket
CREATE POLICY "Auth users read comm attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comm-attachments');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE internal_notices;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked tinyint(1) NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at datetime,
  ADD COLUMN IF NOT EXISTS lock_reason text,
  ADD COLUMN IF NOT EXISTS known_ips json NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_hash text,
  ADD COLUMN IF NOT EXISTS pending_otp_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_expires_at datetime;

DO;

CREATE TABLE system_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT,
  message TEXT NOT NULL,
  meta json,
  auth_user_id varchar(36),
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE otp_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  email TEXT,
  auth_user_id varchar(36),
  ip_address TEXT,
  purpose TEXT NOT NULL DEFAULT 'login',
  status TEXT NOT NULL DEFAULT 'sent', -- sent | verified | failed | expired
  message TEXT,
  meta json,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | failed | queued
  provider TEXT,
  error TEXT,
  meta json,
  auth_user_id varchar(36),
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE system_logs REPLICA IDENTITY FULL;

ALTER TABLE otp_logs REPLICA IDENTITY FULL;

ALTER TABLE email_logs REPLICA IDENTITY FULL;

-- 1) leave_types
CREATE TABLE leave_types (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_varchar(36)(),
  name text NOT NULL UNIQUE,
  code text,
  color text DEFAULT '#3b82f6',
  default_days decimal(15,2) NOT NULL DEFAULT 0,
  paid tinyint(1) NOT NULL DEFAULT true,
  description text,
  active tinyint(1) NOT NULL DEFAULT true,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) leave_balances
CREATE TABLE leave_balances (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_varchar(36)(),
  employee_id varchar(36) NOT NULL,
  leave_type_id varchar(36) NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year int NOT NULL,
  allocated decimal(15,2) NOT NULL DEFAULT 0,
  used decimal(15,2) NOT NULL DEFAULT 0,
  carried_forward decimal(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (employee_id, leave_type_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX leave_balances_emp_year_idx ON leave_balances(employee_id, year);

-- 3) leave_requests
CREATE TABLE leave_requests (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_varchar(36)(),
  employee_id varchar(36) NOT NULL,
  employee_name text,
  leave_type_id varchar(36) REFERENCES leave_types(id) ON DELETE SET NULL,
  leave_type_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days decimal(15,2) NOT NULL DEFAULT 1,
  half_day tinyint(1) NOT NULL DEFAULT false,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  applied_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at datetime,
  reviewer text,
  reviewer_comment text,
  attachment_url text,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX leave_requests_emp_idx ON leave_requests(employee_id);

CREATE INDEX leave_requests_status_idx ON leave_requests(status);

CREATE INDEX leave_requests_dates_idx ON leave_requests(start_date, end_date);

-- 4) holidays
CREATE TABLE holidays (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_varchar(36)(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  type text NOT NULL DEFAULT 'public',
  recurring tinyint(1) NOT NULL DEFAULT false,
  description text,
  color text DEFAULT '#ef4444',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX holidays_date_idx ON holidays(holiday_date);

-- seed default leave types
INSERT INTO leave_types (name, code, color, default_days, paid, description) VALUES
  ('Annual Leave', 'AL', '#3b82f6', 14, true, 'Yearly paid vacation'),
  ('Casual Leave', 'CL', '#22c55e', 10, true, 'Short-notice personal leave'),
  ('Sick Leave', 'SL', '#f97316', 8, true, 'Medical / illness'),
  ('Maternity Leave', 'ML', '#ec4899', 90, true, 'Maternity as per Pakistan labour law'),
  ('Paternity Leave', 'PL', '#8b5cf6', 7, true, 'Paternity leave'),
  ('Hajj Leave', 'HJ', '#14b8a6', 30, false, 'Once-in-service Hajj leave'),
  ('Bereavement', 'BL', '#64748b', 3, true, 'Death in family'),
  ('Unpaid Leave', 'UL', '#94a3b8', 0, false, 'Leave without pay')
ON CONFLICT (name) DO NOTHING;

-- seed common Pakistan public holidays (2026)
INSERT INTO holidays (name, holiday_date, type, recurring) VALUES
  ('Kashmir Day', '2026-02-05', 'public', true),
  ('Pakistan Day', '2026-03-23', 'public', true),
  ('Eid ul-Fitr (Day 1)', '2026-03-20', 'religious', false),
  ('Eid ul-Fitr (Day 2)', '2026-03-21', 'religious', false),
  ('Eid ul-Fitr (Day 3)', '2026-03-22', 'religious', false),
  ('Labour Day', '2026-05-01', 'public', true),
  ('Eid ul-Adha (Day 1)', '2026-05-27', 'religious', false),
  ('Eid ul-Adha (Day 2)', '2026-05-28', 'religious', false),
  ('Eid ul-Adha (Day 3)', '2026-05-29', 'religious', false),
  ('Ashura (9th Muharram)', '2026-06-25', 'religious', false),
  ('Ashura (10th Muharram)', '2026-06-26', 'religious', false),
  ('Independence Day', '2026-08-14', 'public', true),
  ('Eid Milad-un-Nabi', '2026-08-25', 'religious', false),
  ('Iqbal Day', '2026-11-09', 'public', true),
  ('Quaid-e-Azam Day / Christmas', '2026-12-25', 'public', true)
ON CONFLICT DO NOTHING;

