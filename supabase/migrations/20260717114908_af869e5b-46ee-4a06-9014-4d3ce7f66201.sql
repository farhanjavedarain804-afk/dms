
-- ============ Extend existing projects table (nullable columns only) ============
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS manager text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.pm_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ project_members ============
CREATE TABLE IF NOT EXISTS public.project_members (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text,
  role text,
  allocation integer DEFAULT 100,
  joined_on date DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_members_id_seq TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_members" ON public.project_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_members_updated BEFORE UPDATE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_milestones ============
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  progress integer DEFAULT 0,
  status text DEFAULT 'planned',
  budget numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_milestones_id_seq TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_milestones" ON public.project_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_milestones_updated BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_task_comments ============
CREATE TABLE IF NOT EXISTS public.project_task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  author text,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_task_comments_id_seq TO authenticated;
GRANT ALL ON public.project_task_comments TO service_role;
ALTER TABLE public.project_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_task_comments" ON public.project_task_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ project_task_checklists ============
CREATE TABLE IF NOT EXISTS public.project_task_checklists (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_checklists TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_task_checklists_id_seq TO authenticated;
GRANT ALL ON public.project_task_checklists TO service_role;
ALTER TABLE public.project_task_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_task_checklists" ON public.project_task_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ project_timesheets ============
CREATE TABLE IF NOT EXISTS public.project_timesheets (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text,
  entry_date date DEFAULT current_date,
  started_at timestamptz,
  ended_at timestamptz,
  minutes integer DEFAULT 0,
  billable boolean DEFAULT true,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_timesheets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_timesheets_id_seq TO authenticated;
GRANT ALL ON public.project_timesheets TO service_role;
ALTER TABLE public.project_timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_timesheets" ON public.project_timesheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_timesheets_updated BEFORE UPDATE ON public.project_timesheets FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_documents ============
CREATE TABLE IF NOT EXISTS public.project_documents (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text,
  size_bytes bigint,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_documents_id_seq TO authenticated;
GRANT ALL ON public.project_documents TO service_role;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_documents" ON public.project_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ project_meetings ============
CREATE TABLE IF NOT EXISTS public.project_meetings (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_at timestamptz,
  duration_min integer DEFAULT 30,
  attendees text[],
  agenda text,
  notes text,
  action_items text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_meetings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_meetings_id_seq TO authenticated;
GRANT ALL ON public.project_meetings TO service_role;
ALTER TABLE public.project_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_meetings" ON public.project_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_meetings_updated BEFORE UPDATE ON public.project_meetings FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_budgets ============
CREATE TABLE IF NOT EXISTS public.project_budgets (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  category text,
  estimated numeric DEFAULT 0,
  approved numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_budgets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_budgets_id_seq TO authenticated;
GRANT ALL ON public.project_budgets TO service_role;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_budgets" ON public.project_budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_budgets_updated BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_expenses ============
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  spent_on date DEFAULT current_date,
  vendor text,
  note text,
  receipt_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_expenses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_expenses_id_seq TO authenticated;
GRANT ALL ON public.project_expenses TO service_role;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_expenses" ON public.project_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_project_expenses_updated BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- ============ project_activity_logs ============
CREATE TABLE IF NOT EXISTS public.project_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  actor text,
  action text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_activity_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.project_activity_logs_id_seq TO authenticated;
GRANT ALL ON public.project_activity_logs TO service_role;
ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_activity_logs" ON public.project_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
