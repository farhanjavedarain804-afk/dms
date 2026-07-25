
CREATE TABLE IF NOT EXISTS public.departments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.departments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.departments_id_seq TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read departments" ON public.departments;
CREATE POLICY "Authenticated read departments" ON public.departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage departments" ON public.departments;
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES public.employees(id) ON DELETE SET NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='app_users_employee_id_key') THEN
    CREATE UNIQUE INDEX app_users_employee_id_key ON public.app_users(employee_id) WHERE employee_id IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_app_user_from_employee()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  UPDATE public.app_users SET
    full_name = COALESCE(NEW.name, full_name),
    email = COALESCE(NEW.email, email),
    phone = NEW.phone,
    department = NEW.department
  WHERE employee_id = NEW.id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_app_user_from_employee ON public.employees;
CREATE TRIGGER trg_sync_app_user_from_employee
AFTER UPDATE ON public.employees FOR EACH ROW
EXECUTE FUNCTION public.sync_app_user_from_employee();

CREATE OR REPLACE FUNCTION public.deactivate_app_user_on_employee_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  UPDATE public.app_users SET status='inactive' WHERE employee_id = OLD.id;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_deactivate_app_user_on_employee_delete ON public.employees;
CREATE TRIGGER trg_deactivate_app_user_on_employee_delete
BEFORE DELETE ON public.employees FOR EACH ROW
EXECUTE FUNCTION public.deactivate_app_user_on_employee_delete();
