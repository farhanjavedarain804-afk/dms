
-- 1) leave_types
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  color text DEFAULT '#3b82f6',
  default_days numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT true,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read leave_types" ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write leave_types" ON public.leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2) leave_balances
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year int NOT NULL,
  allocated numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  carried_forward numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, year)
);
CREATE INDEX leave_balances_emp_year_idx ON public.leave_balances(employee_id, year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT ALL ON public.leave_balances TO service_role;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read leave_balances" ON public.leave_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) leave_requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  employee_name text,
  leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  leave_type_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL DEFAULT 1,
  half_day boolean NOT NULL DEFAULT false,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer text,
  reviewer_comment text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leave_requests_emp_idx ON public.leave_requests(employee_id);
CREATE INDEX leave_requests_status_idx ON public.leave_requests(status);
CREATE INDEX leave_requests_dates_idx ON public.leave_requests(start_date, end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read leave_requests" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) holidays
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  type text NOT NULL DEFAULT 'public',
  recurring boolean NOT NULL DEFAULT false,
  description text,
  color text DEFAULT '#ef4444',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX holidays_date_idx ON public.holidays(holiday_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read holidays" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write holidays" ON public.holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at triggers (reuse existing pattern)
CREATE OR REPLACE FUNCTION public.leaves_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_leave_types_updated BEFORE UPDATE ON public.leave_types
FOR EACH ROW EXECUTE FUNCTION public.leaves_touch_updated_at();
CREATE TRIGGER trg_leave_balances_updated BEFORE UPDATE ON public.leave_balances
FOR EACH ROW EXECUTE FUNCTION public.leaves_touch_updated_at();
CREATE TRIGGER trg_leave_requests_updated BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.leaves_touch_updated_at();
CREATE TRIGGER trg_holidays_updated BEFORE UPDATE ON public.holidays
FOR EACH ROW EXECUTE FUNCTION public.leaves_touch_updated_at();

-- seed default leave types
INSERT INTO public.leave_types (name, code, color, default_days, paid, description) VALUES
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
INSERT INTO public.holidays (name, holiday_date, type, recurring) VALUES
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
