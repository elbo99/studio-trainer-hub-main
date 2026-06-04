
-- Coach library sessions (templates)
CREATE TABLE public.coach_library_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'other',
  notes text,
  duration text,
  sets_reps text,
  rest text,
  intensity text,
  exercise_notes text,
  recurrence text NOT NULL DEFAULT 'weekly',
  frequency integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_library_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their library sessions"
  ON public.coach_library_sessions FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert library sessions"
  ON public.coach_library_sessions FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their library sessions"
  ON public.coach_library_sessions FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their library sessions"
  ON public.coach_library_sessions FOR DELETE
  USING (auth.uid() = coach_id);

-- Read-only assignments of library sessions to members
CREATE TABLE public.coach_library_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_library_sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, member_id)
);

ALTER TABLE public.coach_library_assignments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user owns a library session
CREATE OR REPLACE FUNCTION public.is_coach_library_session(_session_id uuid, _coach_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_library_sessions
    WHERE id = _session_id AND coach_id = _coach_id
  )
$$;

CREATE POLICY "Coaches can view assignments for their sessions"
  ON public.coach_library_assignments FOR SELECT
  USING (is_coach_library_session(session_id, auth.uid()));

CREATE POLICY "Members can view their assignments"
  ON public.coach_library_assignments FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Coaches can insert assignments for their sessions"
  ON public.coach_library_assignments FOR INSERT
  WITH CHECK (is_coach_library_session(session_id, auth.uid()) AND is_coach_of(auth.uid(), member_id));

CREATE POLICY "Coaches can delete assignments for their sessions"
  ON public.coach_library_assignments FOR DELETE
  USING (is_coach_library_session(session_id, auth.uid()));
