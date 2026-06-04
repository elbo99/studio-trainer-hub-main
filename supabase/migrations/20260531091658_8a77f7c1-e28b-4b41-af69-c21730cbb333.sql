
-- 1. Privatize studio-resources bucket + scoped policies
UPDATE storage.buckets SET public = false WHERE id = 'studio-resources';

DROP POLICY IF EXISTS "Anyone can view studio resources" ON storage.objects;
DROP POLICY IF EXISTS "Public can view studio resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view studio resources" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can upload studio resources" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete studio resources" ON storage.objects;
DROP POLICY IF EXISTS "Coaches read own studio resource files" ON storage.objects;
DROP POLICY IF EXISTS "Members read assigned studio resource files" ON storage.objects;

CREATE POLICY "Coaches upload studio resource files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'studio-resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'coach'::public.app_role)
);

CREATE POLICY "Coaches delete own studio resource files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'studio-resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Coaches read own studio resource files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-resources'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Members read assigned studio resource files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-resources'
  AND EXISTS (
    SELECT 1 FROM public.studio_resources sr
    WHERE sr.file_path = storage.objects.name
      AND sr.category_id IS NOT NULL
      AND public.is_category_assigned_to_member(sr.category_id, auth.uid())
  )
);

-- 2. Restrict studio-videos storage SELECT to folder owner or assigned member folder
DROP POLICY IF EXISTS "Authenticated users can view studio videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can view studio videos" ON storage.objects;

CREATE POLICY "Coaches view own studio video files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Members view assigned studio video files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'studio-videos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Prevent privilege escalation via profiles.role / coach_id
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Modifying role is not allowed';
  END IF;
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    IF NOT public.has_role(auth.uid(), 'coach'::public.app_role) THEN
      RAISE EXCEPTION 'Only coaches can change coach assignment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_priv_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_priv_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4. Daily task completions: require the task belongs to the member
DROP POLICY IF EXISTS "Members can insert their own daily completions" ON public.daily_task_completions;
CREATE POLICY "Members can insert their own daily completions"
ON public.daily_task_completions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = member_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.member_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can delete their own daily completions" ON public.daily_task_completions;
CREATE POLICY "Members can delete their own daily completions"
ON public.daily_task_completions FOR DELETE TO authenticated
USING (
  auth.uid() = member_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.member_id = auth.uid()
  )
);
