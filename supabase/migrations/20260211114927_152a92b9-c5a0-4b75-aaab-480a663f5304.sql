-- Drop the recursive policy
DROP POLICY "Members can view their coach profile" ON public.profiles;

-- Recreate using the security definer function to avoid recursion
CREATE POLICY "Members can view their coach profile"
ON public.profiles
FOR SELECT
USING (
  id = public.get_coach_id(auth.uid())
);