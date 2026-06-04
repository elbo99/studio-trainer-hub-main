
-- Table to track daily task completions per day
CREATE TABLE public.daily_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  completion_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'done',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one completion per task per day
ALTER TABLE public.daily_task_completions ADD CONSTRAINT unique_task_day UNIQUE (task_id, completion_date);

-- Enable RLS
ALTER TABLE public.daily_task_completions ENABLE ROW LEVEL SECURITY;

-- Members can view their own completions
CREATE POLICY "Members can view their own daily completions"
ON public.daily_task_completions FOR SELECT
USING (auth.uid() = member_id);

-- Members can insert their own completions
CREATE POLICY "Members can insert their own daily completions"
ON public.daily_task_completions FOR INSERT
WITH CHECK (auth.uid() = member_id);

-- Members can delete their own completions (to undo)
CREATE POLICY "Members can delete their own daily completions"
ON public.daily_task_completions FOR DELETE
USING (auth.uid() = member_id);

-- Coaches can view completions for tasks they created
CREATE POLICY "Coaches can view daily completions for their tasks"
ON public.daily_task_completions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_id AND tasks.coach_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_daily_completions_task_date ON public.daily_task_completions(task_id, completion_date);
CREATE INDEX idx_daily_completions_member ON public.daily_task_completions(member_id);
