
-- Create storage bucket for studio videos
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-videos', 'studio-videos', true);

-- Storage policies: coaches can upload, members can view assigned videos
CREATE POLICY "Coaches can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'studio-videos' AND has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can delete their videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'studio-videos' AND has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Anyone authenticated can view studio videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-videos' AND auth.role() = 'authenticated');

-- Create studio_videos table
CREATE TABLE public.studio_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('abdominaux', 'jambes', 'haut_du_corps', 'dos_lombaires')),
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studio_videos ENABLE ROW LEVEL SECURITY;

-- Coaches can manage videos they created
CREATE POLICY "Coaches can view their videos"
ON public.studio_videos FOR SELECT
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert videos"
ON public.studio_videos FOR INSERT
WITH CHECK (auth.uid() = coach_id AND is_coach_of(auth.uid(), member_id));

CREATE POLICY "Coaches can delete their videos"
ON public.studio_videos FOR DELETE
USING (auth.uid() = coach_id);

-- Members can view videos assigned to them
CREATE POLICY "Members can view assigned videos"
ON public.studio_videos FOR SELECT
USING (auth.uid() = member_id);
