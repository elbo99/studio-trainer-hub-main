-- Allow members to view their coach's profile
CREATE POLICY "Members can view their coach profile"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT coach_id FROM public.profiles WHERE id = auth.uid() AND coach_id IS NOT NULL
  )
);