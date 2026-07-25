
CREATE TABLE public.feedback_calls (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  project_ref TEXT,
  q1_service INT DEFAULT 0,
  q2_communication INT DEFAULT 0,
  q3_quality INT DEFAULT 0,
  q4_recommend INT DEFAULT 0,
  q5_timeline INT DEFAULT 0,
  total_score INT GENERATED ALWAYS AS (COALESCE(q1_service,0)+COALESCE(q2_communication,0)+COALESCE(q3_quality,0)+COALESCE(q4_recommend,0)+COALESCE(q5_timeline,0)) STORED,
  called_by_employee_id BIGINT,
  called_by_name TEXT,
  notes TEXT,
  call_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_calls TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_calls_id_seq TO authenticated;
GRANT ALL ON public.feedback_calls TO service_role;
GRANT ALL ON SEQUENCE public.feedback_calls_id_seq TO service_role;

ALTER TABLE public.feedback_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view feedback_calls" ON public.feedback_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert feedback_calls" ON public.feedback_calls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update feedback_calls" ON public.feedback_calls FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete feedback_calls" ON public.feedback_calls FOR DELETE TO authenticated USING (true);

CREATE TRIGGER feedback_calls_touch_updated_at BEFORE UPDATE ON public.feedback_calls
FOR EACH ROW EXECUTE FUNCTION public.pm_touch_updated_at();
