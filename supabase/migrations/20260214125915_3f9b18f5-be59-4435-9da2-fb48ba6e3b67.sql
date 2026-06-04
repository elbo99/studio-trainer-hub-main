ALTER TABLE public.tasks ADD COLUMN recurrence text NOT NULL DEFAULT 'weekly';

COMMENT ON COLUMN public.tasks.recurrence IS 'Task recurrence: none, daily, weekly';