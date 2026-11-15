-- Planning horaire du coach : rendez-vous (séances) et créneaux bloqués.
-- member_id NULL = créneau bloqué / indisponibilité (type 'bloque' en général).

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'coaching_prive' CHECK (type IN (
    'coaching_prive', 'coaching_duo', 'small_group', 'yoga', 'kids', 'bloque', 'autre'
  )),
  title TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirme' CHECK (status IN ('confirme', 'annule')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT appointments_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX appointments_coach_starts_idx ON public.appointments (coach_id, starts_at);
CREATE INDEX appointments_member_starts_idx ON public.appointments (member_id, starts_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Le coach gère ses propres rendez-vous
CREATE POLICY "Coaches can view their appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = coach_id AND public.has_role(auth.uid(), 'coach'::public.app_role));

CREATE POLICY "Coaches can insert their appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id
    AND public.has_role(auth.uid(), 'coach'::public.app_role)
    AND (member_id IS NULL OR public.is_coach_of(auth.uid(), member_id))
  );

CREATE POLICY "Coaches can update their appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = coach_id AND public.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (
    auth.uid() = coach_id
    AND (member_id IS NULL OR public.is_coach_of(auth.uid(), member_id))
  );

CREATE POLICY "Coaches can delete their appointments"
  ON public.appointments FOR DELETE
  USING (auth.uid() = coach_id AND public.has_role(auth.uid(), 'coach'::public.app_role));

-- Le membre lit uniquement ses rendez-vous
CREATE POLICY "Members can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = member_id);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
