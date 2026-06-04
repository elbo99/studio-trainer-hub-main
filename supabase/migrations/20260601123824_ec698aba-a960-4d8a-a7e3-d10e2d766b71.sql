ALTER TABLE public.onboarding_programs
  ADD COLUMN IF NOT EXISTS library_program_id uuid;