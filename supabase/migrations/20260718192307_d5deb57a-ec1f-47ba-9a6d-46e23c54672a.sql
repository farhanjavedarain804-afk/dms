
-- INTERNAL NOTICES
CREATE TABLE public.internal_notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  audience TEXT NOT NULL DEFAULT 'all',
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notices TO authenticated;
GRANT ALL ON public.internal_notices TO service_role;

ALTER TABLE public.internal_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view relevant notices"
  ON public.internal_notices FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR audience = 'all'
    OR auth.uid() = ANY(recipient_ids)
    OR sender_id = auth.uid()
  );

CREATE POLICY "Admins create notices"
  ON public.internal_notices FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND sender_id = auth.uid());

CREATE POLICY "Admins or recipients update notices"
  ON public.internal_notices FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR audience = 'all'
    OR auth.uid() = ANY(recipient_ids)
  );

CREATE POLICY "Admins delete notices"
  ON public.internal_notices FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR sender_id = auth.uid());

CREATE TRIGGER internal_notices_touch
  BEFORE UPDATE ON public.internal_notices
  FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- INTERNAL MESSAGES
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_messages TO authenticated;
GRANT ALL ON public.internal_messages TO service_role;

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their messages or admins view all"
  ON public.internal_messages FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Any authenticated user sends messages"
  ON public.internal_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipient or admin updates messages"
  ON public.internal_messages FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR recipient_id = auth.uid()
    OR sender_id = auth.uid()
  );

CREATE POLICY "Sender or admin deletes messages"
  ON public.internal_messages FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR sender_id = auth.uid());

CREATE TRIGGER internal_messages_touch
  BEFORE UPDATE ON public.internal_messages
  FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

CREATE INDEX idx_internal_messages_thread ON public.internal_messages(thread_id, created_at);
CREATE INDEX idx_internal_messages_recipient ON public.internal_messages(recipient_id);
CREATE INDEX idx_internal_messages_sender ON public.internal_messages(sender_id);
