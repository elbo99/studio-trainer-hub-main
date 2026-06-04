
-- 1. Fix profile privilege escalation: enforce trigger on UPDATE
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Remove overly permissive public storage read on private studio-resources bucket
DROP POLICY IF EXISTS "Studio resources public read" ON storage.objects;

-- 3. Replace path-based member video access with proper assignment check
DROP POLICY IF EXISTS "Members view assigned studio video files" ON storage.objects;
CREATE POLICY "Members view assigned studio video files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'studio-videos'
  AND EXISTS (
    SELECT 1 FROM public.studio_videos v
    WHERE v.video_url = objects.name
      AND (
        public.is_video_assigned_to_member(v.id, auth.uid())
        OR (v.category_id IS NOT NULL AND public.is_category_assigned_to_member(v.category_id, auth.uid()))
        OR v.member_id = auth.uid()
      )
  )
);
