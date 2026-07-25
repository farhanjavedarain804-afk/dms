ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS team_members text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS attachment text;