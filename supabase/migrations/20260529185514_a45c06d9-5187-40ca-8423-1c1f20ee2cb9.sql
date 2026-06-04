
-- 1. Add subtitle/description to categories
ALTER TABLE public.studio_categories
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Resources table (pdf, article, link)
CREATE TABLE IF NOT EXISTS public.studio_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('pdf','article','link')),
  title text NOT NULL,
  description text,
  url text,              -- for link or stored pdf public url
  file_path text,        -- storage path when type=pdf
  content text,          -- article body (markdown / plain)
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_resources TO authenticated;
GRANT ALL ON public.studio_resources TO service_role;

ALTER TABLE public.studio_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their resources select"
  ON public.studio_resources FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches insert their resources"
  ON public.studio_resources FOR INSERT
  WITH CHECK (auth.uid() = coach_id AND public.is_coach_category(category_id, auth.uid()));

CREATE POLICY "Coaches update their resources"
  ON public.studio_resources FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches delete their resources"
  ON public.studio_resources FOR DELETE
  USING (auth.uid() = coach_id);

CREATE POLICY "Members view resources of assigned categories"
  ON public.studio_resources FOR SELECT
  USING (public.is_category_assigned_to_member(category_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_studio_resources_category ON public.studio_resources(category_id);

-- 3. Storage bucket for PDFs (public read; access enforced at app/category layer)
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-resources', 'studio-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Studio resources public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'studio-resources');

CREATE POLICY "Coaches upload studio resources"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'studio-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coaches delete own studio resources"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'studio-resources' AND auth.uid()::text = (storage.foldername(name))[1]);
