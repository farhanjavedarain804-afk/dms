
-- Role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin','admin','manager','hr','finance','sales','support','employee','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_read_all_auth" ON public.user_roles;
CREATE POLICY "roles_read_all_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'));
$$;

-- app_users
CREATE TABLE IF NOT EXISTS public.app_users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'employee',
  department TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  total_online_seconds BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.app_users_id_seq TO authenticated;
GRANT ALL ON public.app_users TO service_role;
GRANT ALL ON SEQUENCE public.app_users_id_seq TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_users_read" ON public.app_users;
CREATE POLICY "app_users_read" ON public.app_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "app_users_self_update" ON public.app_users;
CREATE POLICY "app_users_self_update" ON public.app_users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "app_users_admin_write" ON public.app_users;
CREATE POLICY "app_users_admin_write" ON public.app_users FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "app_users_admin_delete" ON public.app_users;
CREATE POLICY "app_users_admin_delete" ON public.app_users FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.app_users_touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS app_users_touch ON public.app_users;
CREATE TRIGGER app_users_touch BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.app_users_touch_updated_at();

-- user_activity_logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  full_name TEXT,
  action TEXT NOT NULL,
  module TEXT,
  description TEXT,
  meta JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_activity_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_activity_logs_id_seq TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;
GRANT ALL ON SEQUENCE public.user_activity_logs_id_seq TO service_role;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_read" ON public.user_activity_logs;
CREATE POLICY "activity_read" ON public.user_activity_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "activity_insert_self" ON public.user_activity_logs;
CREATE POLICY "activity_insert_self" ON public.user_activity_logs FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);

-- user_login_logs
CREATE TABLE IF NOT EXISTS public.user_login_logs (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_seconds BIGINT
);
GRANT SELECT, INSERT, UPDATE ON public.user_login_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_login_logs_id_seq TO authenticated;
GRANT ALL ON public.user_login_logs TO service_role;
GRANT ALL ON SEQUENCE public.user_login_logs_id_seq TO service_role;
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_logs_read" ON public.user_login_logs;
CREATE POLICY "login_logs_read" ON public.user_login_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "login_logs_insert_self" ON public.user_login_logs;
CREATE POLICY "login_logs_insert_self" ON public.user_login_logs FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid() OR auth_user_id IS NULL);
DROP POLICY IF EXISTS "login_logs_update_self" ON public.user_login_logs;
CREATE POLICY "login_logs_update_self" ON public.user_login_logs FOR UPDATE TO authenticated USING (auth_user_id = auth.uid() OR auth_user_id IS NULL);
