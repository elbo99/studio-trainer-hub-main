
-- Add structured fields to tasks for better coach customization
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sets_reps text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS intensity text;
