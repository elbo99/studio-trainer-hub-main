ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;

-- Mark existing members (already linked to a coach) as onboarded so they don't get redirected
UPDATE public.profiles SET onboarding_completed_at = now() WHERE role = 'member' AND coach_id IS NOT NULL AND onboarding_completed_at IS NULL;
-- Also mark all coaches
UPDATE public.profiles SET onboarding_completed_at = now() WHERE role = 'coach' AND onboarding_completed_at IS NULL;