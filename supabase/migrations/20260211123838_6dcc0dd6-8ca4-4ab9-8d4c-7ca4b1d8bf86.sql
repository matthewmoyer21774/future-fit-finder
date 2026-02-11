
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT,
  email TEXT,
  wants_info BOOLEAN NOT NULL DEFAULT false,
  profile JSONB,
  recommendations JSONB,
  outreach_email TEXT,
  input_method TEXT NOT NULL DEFAULT 'form'
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Anon can insert submissions
CREATE POLICY "Anyone can insert submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

-- No public SELECT - only service role can read (via edge function)
CREATE POLICY "No public read access"
  ON public.submissions FOR SELECT
  USING (false);
