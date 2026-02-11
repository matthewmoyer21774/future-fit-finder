
-- Create programmes table to store Vlerick programme catalogue
CREATE TABLE public.programmes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  fee TEXT DEFAULT '',
  format TEXT DEFAULT '',
  location TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  why_this_programme TEXT DEFAULT '',
  key_topics TEXT[] DEFAULT '{}',
  full_text TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

-- Public read access (programme data is not sensitive)
CREATE POLICY "Anyone can read programmes"
ON public.programmes
FOR SELECT
USING (true);

-- No public write access
CREATE POLICY "No public insert"
ON public.programmes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update"
ON public.programmes
FOR UPDATE
USING (false);

CREATE POLICY "No public delete"
ON public.programmes
FOR DELETE
USING (false);

-- Index for category filtering
CREATE INDEX idx_programmes_category ON public.programmes(category);
