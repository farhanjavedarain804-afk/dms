
-- Attachments columns
ALTER TABLE public.internal_notices ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  participant_names TEXT[] NOT NULL DEFAULT '{}',
  room_name TEXT NOT NULL UNIQUE,
  meeting_type TEXT NOT NULL DEFAULT 'video',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  recording_url TEXT,
  audience TEXT NOT NULL DEFAULT 'specific',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View accessible meetings"
  ON public.meetings FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR audience = 'all'
    OR host_id = auth.uid()
    OR auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Any user creates meetings"
  ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host or admin updates meetings"
  ON public.meetings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR host_id = auth.uid());

CREATE POLICY "Host or admin deletes meetings"
  ON public.meetings FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR host_id = auth.uid());

CREATE TRIGGER meetings_touch
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();

-- Storage RLS on comm-attachments bucket
CREATE POLICY "Auth users read comm attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comm-attachments');

CREATE POLICY "Auth users upload comm attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comm-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete their comm attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comm-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
