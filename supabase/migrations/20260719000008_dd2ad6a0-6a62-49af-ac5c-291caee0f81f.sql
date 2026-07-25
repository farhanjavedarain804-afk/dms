
CREATE TABLE public.system_logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT,
  message TEXT NOT NULL,
  meta JSONB,
  auth_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.system_logs_id_seq TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
GRANT ALL ON SEQUENCE public.system_logs_id_seq TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read system_logs" ON public.system_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write system_logs" ON public.system_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.otp_logs (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  auth_user_id UUID,
  ip_address TEXT,
  purpose TEXT NOT NULL DEFAULT 'login',
  status TEXT NOT NULL DEFAULT 'sent', -- sent | verified | failed | expired
  message TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_logs TO authenticated;
GRANT SELECT, INSERT ON public.otp_logs TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.otp_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.otp_logs_id_seq TO anon;
GRANT ALL ON public.otp_logs TO service_role;
GRANT ALL ON SEQUENCE public.otp_logs_id_seq TO service_role;
ALTER TABLE public.otp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read otp_logs" ON public.otp_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write otp_logs" ON public.otp_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anon insert otp_logs" ON public.otp_logs FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE public.email_logs (
  id BIGSERIAL PRIMARY KEY,
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | failed | queued
  provider TEXT,
  error TEXT,
  meta JSONB,
  auth_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO authenticated;
GRANT SELECT, INSERT ON public.email_logs TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.email_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.email_logs_id_seq TO anon;
GRANT ALL ON public.email_logs TO service_role;
GRANT ALL ON SEQUENCE public.email_logs_id_seq TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read email_logs" ON public.email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write email_logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anon insert email_logs" ON public.email_logs FOR INSERT TO anon WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.otp_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
ALTER TABLE public.system_logs REPLICA IDENTITY FULL;
ALTER TABLE public.otp_logs REPLICA IDENTITY FULL;
ALTER TABLE public.email_logs REPLICA IDENTITY FULL;
