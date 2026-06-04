CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Modifying role is not allowed';
  END IF;
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    -- Allow when invoked by a service-role / system context (no auth.uid())
    -- or by an authenticated coach. Members cannot change their own coach via the API.
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'coach'::public.app_role) THEN
      RAISE EXCEPTION 'Only coaches can change coach assignment';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;