-- Migration: 20260714124543_5537f59c-758b-41a4-bf05-9cecd3cdd24d.sql
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

-- Migration: 20260714135446_8e5e8d7b-61da-40e5-a64e-eff00ca06bef.sql
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

-- Migration: 20260714140433_ff9fc7cd-e411-4f5a-a3f1-8fa60a2e76ad.sql

-- Migration: 20260715134855_e68f940a-fe95-4ff4-801c-f78ad2b62c6f.sql
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

-- Migration: 20260715141557_82d2a564-e7b6-4a4b-9867-6fb6adc5542d.sql
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS passport_no text,
  ADD COLUMN IF NOT EXISTS driving_licence text,
  ADD COLUMN IF NOT EXISTS residence_status text;

-- Migration: 20260717111057_65631e00-23c6-4a63-9c87-a5bfde5cbefd.sql
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

-- Migration: 20260717114908_af869e5b-46ee-4a06-9014-4d3ce7f66201.sql
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
  ADD COLUMN IF NOT EXISTS archived tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at datetime DEFAULT CURRENT_TIMESTAMP;
-- ============ project_members ============
CREATE TABLE IF NOT EXISTS project_members (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  employee_name text,
  role text,
  allocation integer DEFAULT 100,
  joined_on date DEFAULT CURDATE(),
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
);
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
);
-- ============ project_task_comments ============
CREATE TABLE IF NOT EXISTS project_task_comments (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  author text,
  body text NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);
-- ============ project_task_checklists ============
CREATE TABLE IF NOT EXISTS project_task_checklists (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
ne tinyint(1) DEFAULT 0,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);
-- ============ project_timesheets ============
CREATE TABLE IF NOT EXISTS project_timesheets (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  employee_name text,
  entry_date date DEFAULT CURDATE(),
  started_at datetime,
ed_at datetime,
  minutes integer DEFAULT 0,
  billable tinyint(1) DEFAULT 1,
  note text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
);
-- ============ project_documents ============
CREATE TABLE IF NOT EXISTS project_documents (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text,
  size_bytes bigint,
  uploaded_by text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);
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
);
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
);
-- ============ project_expenses ============
CREATE TABLE IF NOT EXISTS project_expenses (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  category text,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  spent_on date DEFAULT CURDATE(),
  vendor text,
  note text,
  receipt_path text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP
);
-- ============ project_activity_logs ============
CREATE TABLE IF NOT EXISTS project_activity_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  actor text,
  action text,
  meta json,
  created_at datetime DEFAULT CURRENT_TIMESTAMP
);

-- Migration: 20260717133856_daac2a9b-d259-4ff0-b3ca-2eb429f70c8c.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_members json DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS attachment text;

-- Migration: 20260717134410_dd3516a2-375c-49a5-b394-bba1788aec87.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_history json NOT NULL DEFAULT '[]';

-- Migration: 20260717135640_feaeaa40-e5bc-4215-9b4e-f010ae1d49cb.sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS estimated_hours decimal(15,2),
  ADD COLUMN IF NOT EXISTS actual_hours decimal(15,2),
  ADD COLUMN IF NOT EXISTS tags json,
  ADD COLUMN IF NOT EXISTS attachment text,
  ADD COLUMN IF NOT EXISTS completed_at datetime,
  ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migration: 20260717141212_ff211332-9b84-4d40-9ea6-386039853582.sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_history json NOT NULL DEFAULT '[]';

-- Migration: 20260718130614_b6becfa9-f65b-494e-bee3-c52e8f421a2a.sql

-- Migration: 20260718142728_78cc9cbe-aff4-440c-9e68-5fdd74663103.sql
-- Role enum


-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id varchar(36) PRIMARY KEY DEFAULT (uuid()),
  user_id varchar(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role)
);
-- has_role helper
CREATE TABLE IF NOT EXISTS app_users (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) UNIQUE REFERENCES app_users(id) ON DELETE SET NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  department TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at datetime,
  total_online_seconds BIGINT NOT NULL DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- user_activity_logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) REFERENCES app_users(id) ON DELETE SET NULL,
  username TEXT,
  full_name TEXT,
  action TEXT NOT NULL,
  module TEXT,
  description TEXT,
  meta json,
  ip_address TEXT,
  user_agent TEXT,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- user_login_logs
CREATE TABLE IF NOT EXISTS user_login_logs (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  auth_user_id varchar(36) REFERENCES app_users(id) ON DELETE SET NULL,
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
);

-- Migration: 20260718144142_026c8c56-2d7e-4bd0-863f-6a713290ec57.sql
CREATE TABLE IF NOT EXISTS departments (
  id BIGint AUTO_INCREMENT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;

-- Migration: 20260718144707_5d074edc-d2cd-4ced-89de-76fb8479ac88.sql
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

-- Migration: 20260718192307_d5deb57a-ec1f-47ba-9a6d-46e23c54672a.sql
-- INTERNAL NOTICES
CREATE TABLE internal_notices (
  id varchar(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  sender_id varchar(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  audience TEXT NOT NULL DEFAULT 'all',
  recipient_ids json NOT NULL DEFAULT '[]',
  read_by json NOT NULL DEFAULT '[]',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- INTERNAL MESSAGES
CREATE TABLE internal_messages (
  id varchar(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  thread_id varchar(36) NOT NULL DEFAULT (uuid()),
  sender_id varchar(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  recipient_id varchar(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read tinyint(1) NOT NULL DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_internal_messages_thread ON internal_messages(thread_id, created_at);
CREATE INDEX idx_internal_messages_recipient ON internal_messages(recipient_id);
CREATE INDEX idx_internal_messages_sender ON internal_messages(sender_id);

-- Migration: 20260718193000_e469be13-b5de-4b8c-9367-764783a7f6f5.sql
-- Attachments columns
ALTER TABLE internal_notices ADD COLUMN IF NOT EXISTS attachments json NOT NULL DEFAULT '[]';
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS attachments json NOT NULL DEFAULT '[]';
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
-- Meetings table
CREATE TABLE meetings (
  id varchar(36) NOT NULL DEFAULT (uuid()) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  host_id varchar(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  participant_ids json NOT NULL DEFAULT '[]',
  participant_names json NOT NULL DEFAULT '[]',
  room_name TEXT NOT NULL UNIQUE,
  meeting_type TEXT NOT NULL DEFAULT 'video',
  scheduled_at datetime,
  started_at datetime,
ed_at datetime,
  status TEXT NOT NULL DEFAULT 'scheduled',
  recording_url TEXT,
  audience TEXT NOT NULL DEFAULT 'specific',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Storage RLS on comm-attachments bucket
CREATE POLICY "Auth users read comm attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comm-attachments');
-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE internal_notices;

-- Migration: 20260718234640_09a9d881-9641-4c6b-b818-64e8f318c07d.sql
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at datetime,
  ADD COLUMN IF NOT EXISTS lock_reason text,
  ADD COLUMN IF NOT EXISTS known_ips json NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_hash text,
  ADD COLUMN IF NOT EXISTS pending_otp_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_expires_at datetime;

-- Migration: 20260718235254_960ac7eb-47d4-402d-8097-73c27aaa9f5c.sql

-- Migration: 20260719000008_dd2ad6a0-6a62-49af-ac5c-291caee0f81f.sql
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

-- Migration: 20260719002022_705e9c94-8133-4536-8125-ba4496ccb23e.sql
-- 1) leave_types
CREATE TABLE leave_types (
  id varchar(36) PRIMARY KEY DEFAULT (uuid()),
  name text NOT NULL UNIQUE,
  code text,
  color text DEFAULT '#3b82f6',
  default_days decimal(15,2) NOT NULL DEFAULT 0,
  paid tinyint(1) NOT NULL DEFAULT 1,
  description text,
  active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 2) leave_balances
CREATE TABLE leave_balances (
  id varchar(36) PRIMARY KEY DEFAULT (uuid()),
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
);
CREATE INDEX leave_balances_emp_year_idx ON leave_balances(employee_id, year);
-- 3) leave_requests
CREATE TABLE leave_requests (
  id varchar(36) PRIMARY KEY DEFAULT (uuid()),
  employee_id varchar(36) NOT NULL,
  employee_name text,
  leave_type_id varchar(36) REFERENCES leave_types(id) ON DELETE SET NULL,
  leave_type_name text,
  start_date date NOT NULL,
_date date NOT NULL,
  days decimal(15,2) NOT NULL DEFAULT 1,
  half_day tinyint(1) NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  applied_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at datetime,
  reviewer text,
  reviewer_comment text,
  attachment_url text,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX leave_requests_emp_idx ON leave_requests(employee_id);
CREATE INDEX leave_requests_status_idx ON leave_requests(status);
CREATE INDEX leave_requests_dates_idx ON leave_requests(start_date, end_date);
-- 4) holidays
CREATE TABLE holidays (
  id varchar(36) PRIMARY KEY DEFAULT (uuid()),
  name text NOT NULL,
  holiday_date date NOT NULL,
  type text NOT NULL DEFAULT 'public',
  recurring tinyint(1) NOT NULL DEFAULT 0,
  description text,
  color text DEFAULT '#ef4444',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX holidays_date_idx ON holidays(holiday_date);
-- seed default leave types
INSERT INTO leave_types (name, code, color, default_days, paid, description) VALUES
  ('Annual Leave', 'AL', '#3b82f6', 14, 1, 'Yearly paid vacation'),
  ('Casual Leave', 'CL', '#22c55e', 10, 1, 'Short-notice personal leave'),
  ('Sick Leave', 'SL', '#f97316', 8, 1, 'Medical / illness'),
  ('Maternity Leave', 'ML', '#ec4899', 90, 1, 'Maternity as per Pakistan labour law'),
  ('Paternity Leave', 'PL', '#8b5cf6', 7, 1, 'Paternity leave'),
  ('Hajj Leave', 'HJ', '#14b8a6', 30, 0, 'Once-in-service Hajj leave'),
  ('Bereavement', 'BL', '#64748b', 3, 1, 'Death in family'),
  ('Unpaid Leave', 'UL', '#94a3b8', 0, 0, 'Leave without pay')
ON CONFLICT (name) DO NOTHING;
-- seed common Pakistan public holidays (2026)
INSERT INTO holidays (name, holiday_date, type, recurring) VALUES
  ('Kashmir Day', '2026-02-05', 'public', 1),
  ('Pakistan Day', '2026-03-23', 'public', 1),
  ('Eid ul-Fitr (Day 1)', '2026-03-20', 'religious', 0),
  ('Eid ul-Fitr (Day 2)', '2026-03-21', 'religious', 0),
  ('Eid ul-Fitr (Day 3)', '2026-03-22', 'religious', 0),
  ('Labour Day', '2026-05-01', 'public', 1),
  ('Eid ul-Adha (Day 1)', '2026-05-27', 'religious', 0),
  ('Eid ul-Adha (Day 2)', '2026-05-28', 'religious', 0),
  ('Eid ul-Adha (Day 3)', '2026-05-29', 'religious', 0),
  ('Ashura (9th Muharram)', '2026-06-25', 'religious', 0),
  ('Ashura (10th Muharram)', '2026-06-26', 'religious', 0),
  ('Independence Day', '2026-08-14', 'public', 1),
  ('Eid Milad-un-Nabi', '2026-08-25', 'religious', 0),
  ('Iqbal Day', '2026-11-09', 'public', 1),
  ('Quaid-e-Azam Day / Christmas', '2026-12-25', 'public', 1)
;

-- Add custom authentication columns to app_users
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS salt VARCHAR(64),
ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at DATETIME,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS known_ips JSON,
ADD COLUMN IF NOT EXISTS pending_otp_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS pending_otp_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS pending_otp_expires_at DATETIME,
ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;

-- Add user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(96) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed admin user
INSERT INTO app_users (email, full_name, username, role, password_hash, salt) 
VALUES ('farhanjaved357@gmail.com', 'Ch. Farhan Javed', 'farhan', 'Super Admin', '14175f263f52dda14391a4d647e3bdba3c425ea30bbdc4d8701f3fc7cf90b857', '477118d681cc3b9ecd72044f830b8edafe08c192f8cc9b1ec5cbea74e3f22659')
ON DUPLICATE KEY UPDATE email=email;
