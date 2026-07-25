
CREATE TABLE public.employees (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  department text,
  position text,
  phone text,
  join_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.projects (
  id bigint generated always as identity primary key,
  name text not null,
  client text,
  status text not null default 'planning',
  progress int not null default 0,
  deadline date,
  budget numeric,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  project_id bigint references public.projects(id) on delete set null,
  assignee text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.attendance (
  id bigint generated always as identity primary key,
  employee_id bigint,
  employee_name text,
  date date not null,
  check_in text,
  check_out text,
  status text not null default 'present',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
