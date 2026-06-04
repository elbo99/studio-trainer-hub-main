-- Programs table
CREATE TABLE public.coach_library_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_library_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view own programs" ON public.coach_library_programs
  FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coaches insert own programs" ON public.coach_library_programs
  FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches update own programs" ON public.coach_library_programs
  FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "Coaches delete own programs" ON public.coach_library_programs
  FOR DELETE USING (auth.uid() = coach_id);

CREATE TRIGGER update_coach_library_programs_updated_at
  BEFORE UPDATE ON public.coach_library_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to sessions
ALTER TABLE public.coach_library_sessions
  ADD COLUMN program_id uuid REFERENCES public.coach_library_programs(id) ON DELETE SET NULL,
  ADD COLUMN session_order integer NOT NULL DEFAULT 0;

CREATE INDEX idx_library_sessions_program ON public.coach_library_sessions(program_id);