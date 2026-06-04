-- Allow coaches to delete their members profiles
CREATE POLICY "Coaches can delete their members profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'coach'::app_role) AND coach_id = auth.uid() AND role = 'member'::app_role);

-- Also need to handle cascade delete for related data
-- Delete user from auth.users is handled by edge function with service role