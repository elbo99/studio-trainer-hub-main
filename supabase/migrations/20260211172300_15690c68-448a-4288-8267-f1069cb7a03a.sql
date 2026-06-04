
-- Create a security definer function to check video assignment without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_video_assigned_to_member(_video_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_video_assignments
    WHERE video_id = _video_id AND member_id = _member_id
  )
$$;

-- Create a security definer function to check if coach owns the video
CREATE OR REPLACE FUNCTION public.is_coach_video(_video_id uuid, _coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_videos
    WHERE id = _video_id AND coach_id = _coach_id
  )
$$;

-- Fix studio_videos: drop broken member policy and recreate
DROP POLICY IF EXISTS "Members can view assigned videos" ON public.studio_videos;

CREATE POLICY "Members can view assigned videos"
ON public.studio_videos
FOR SELECT
USING (
  auth.uid() = member_id
  OR is_video_assigned_to_member(id, auth.uid())
);

-- Fix studio_video_assignments: drop policies that reference studio_videos and recreate using function
DROP POLICY IF EXISTS "Coaches can delete assignments for their videos" ON public.studio_video_assignments;
DROP POLICY IF EXISTS "Coaches can insert assignments for their videos" ON public.studio_video_assignments;
DROP POLICY IF EXISTS "Coaches can view assignments for their videos" ON public.studio_video_assignments;

CREATE POLICY "Coaches can view assignments for their videos"
ON public.studio_video_assignments
FOR SELECT
USING (is_coach_video(video_id, auth.uid()));

CREATE POLICY "Coaches can insert assignments for their videos"
ON public.studio_video_assignments
FOR INSERT
WITH CHECK (is_coach_video(video_id, auth.uid()) AND is_coach_of(auth.uid(), member_id));

CREATE POLICY "Coaches can delete assignments for their videos"
ON public.studio_video_assignments
FOR DELETE
USING (is_coach_video(video_id, auth.uid()));
