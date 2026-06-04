
CREATE TABLE public.weekly_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  week_start DATE NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE))::date,
  objective TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, week_start)
);

ALTER TABLE public.weekly_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own weekly objective"
ON public.weekly_objectives FOR SELECT
USING (auth.uid() = member_id);

CREATE POLICY "Coaches can view objectives for their members"
ON public.weekly_objectives FOR SELECT
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert objectives for their members"
ON public.weekly_objectives FOR INSERT
WITH CHECK (auth.uid() = coach_id AND is_coach_of(auth.uid(), member_id));

CREATE POLICY "Coaches can update objectives they created"
ON public.weekly_objectives FOR UPDATE
USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete objectives they created"
ON public.weekly_objectives FOR DELETE
USING (auth.uid() = coach_id);
