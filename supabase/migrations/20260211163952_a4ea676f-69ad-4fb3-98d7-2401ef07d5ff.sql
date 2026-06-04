
-- Junction table for video-member assignments (many-to-many)
CREATE TABLE public.studio_video_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.studio_videos(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(video_id, member_id)
);

ALTER TABLE public.studio_video_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches can see assignments for their videos
CREATE POLICY "Coaches can view assignments for their videos"
ON public.studio_video_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.studio_videos sv
    WHERE sv.id = video_id AND sv.coach_id = auth.uid()
  )
);

-- Coaches can assign members to their videos
CREATE POLICY "Coaches can insert assignments for their videos"
ON public.studio_video_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.studio_videos sv
    WHERE sv.id = video_id AND sv.coach_id = auth.uid()
  )
  AND is_coach_of(auth.uid(), member_id)
);

-- Coaches can revoke assignments for their videos
CREATE POLICY "Coaches can delete assignments for their videos"
ON public.studio_video_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.studio_videos sv
    WHERE sv.id = video_id AND sv.coach_id = auth.uid()
  )
);

-- Members can see their own assignments
CREATE POLICY "Members can view their assignments"
ON public.studio_video_assignments
FOR SELECT
USING (auth.uid() = member_id);

-- Update member video access: members see videos assigned to them via assignments table
-- First drop the old member SELECT policy on studio_videos
DROP POLICY IF EXISTS "Members can view assigned videos" ON public.studio_videos;

-- New policy: members see videos where they are the original member_id OR have an assignment
CREATE POLICY "Members can view assigned videos"
ON public.studio_videos
FOR SELECT
USING (
  auth.uid() = member_id
  OR EXISTS (
    SELECT 1 FROM public.studio_video_assignments sva
    WHERE sva.video_id = id AND sva.member_id = auth.uid()
  )
);
