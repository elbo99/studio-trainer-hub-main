
CREATE TABLE public.member_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE,
  zone1_min integer,
  zone1_max integer,
  zone2_min integer,
  zone2_max integer,
  zone3_min integer,
  zone3_max integer,
  zone4_min integer,
  zone4_max integer,
  zone5_min integer,
  zone5_max integer,
  resting_hr integer,
  max_hr integer,
  main_goal text,
  goal_deadline date,
  goal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.member_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own indicators select" ON public.member_indicators
  FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Members manage own indicators insert" ON public.member_indicators
  FOR INSERT WITH CHECK (auth.uid() = member_id);
CREATE POLICY "Members manage own indicators update" ON public.member_indicators
  FOR UPDATE USING (auth.uid() = member_id);
CREATE POLICY "Members manage own indicators delete" ON public.member_indicators
  FOR DELETE USING (auth.uid() = member_id);
CREATE POLICY "Coaches view their members indicators" ON public.member_indicators
  FOR SELECT USING (public.is_coach_of(auth.uid(), member_id));

CREATE TRIGGER update_member_indicators_updated_at
  BEFORE UPDATE ON public.member_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ADD COLUMN heart_zone integer;
ALTER TABLE public.coach_library_sessions ADD COLUMN heart_zone integer;
