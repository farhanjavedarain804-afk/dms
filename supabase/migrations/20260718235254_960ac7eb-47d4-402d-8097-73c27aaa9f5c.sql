
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'employees','attendance','tasks','projects','project_members','project_milestones',
  'project_task_checklists','project_task_comments','project_timesheets','project_expenses',
  'project_budgets','project_documents','project_meetings','project_activity_logs',
  'app_users','user_roles','user_activity_logs','user_login_logs',
  'internal_messages','internal_notices','meetings','feedback_calls',
  'departments'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
             WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;
