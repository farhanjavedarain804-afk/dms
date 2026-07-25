
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS lock_reason text,
  ADD COLUMN IF NOT EXISTS known_ips jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_hash text,
  ADD COLUMN IF NOT EXISTS pending_otp_ip text,
  ADD COLUMN IF NOT EXISTS pending_otp_expires_at timestamptz;
