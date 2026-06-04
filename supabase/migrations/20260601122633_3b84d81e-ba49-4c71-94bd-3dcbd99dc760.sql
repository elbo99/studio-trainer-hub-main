
-- Onboarding programs catalog
CREATE TABLE public.onboarding_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  objective_key TEXT NOT NULL,
  weeks INTEGER NOT NULL DEFAULT 4,
  cover_image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.onboarding_programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_programs TO authenticated;
GRANT ALL ON public.onboarding_programs TO service_role;

ALTER TABLE public.onboarding_programs ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon during signup) can read active programs
CREATE POLICY "Anyone can view active programs"
ON public.onboarding_programs FOR SELECT
USING (active = true);

-- Coaches can fully manage
CREATE POLICY "Coaches view all programs"
ON public.onboarding_programs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches insert programs"
ON public.onboarding_programs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches update programs"
ON public.onboarding_programs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches delete programs"
ON public.onboarding_programs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE TRIGGER set_onboarding_programs_updated_at
BEFORE UPDATE ON public.onboarding_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track member onboarding choices on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_offer TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_objective TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_program_id UUID;

-- Seed initial programs (one per objective key shown in the UI)
INSERT INTO public.onboarding_programs (slug, name, description, objective_key, weeks, active) VALUES
  ('hyrox', 'Programme Hyrox', 'Préparation Hyrox structurée sur 8 semaines.', 'hyrox', 8, true),
  ('course-a-pied', 'Programme Course à pied', 'Plan progressif pour développer ton endurance.', 'course', 8, true),
  ('remise-en-forme', 'Programme Remise en forme', 'Reprise sportive en douceur et constante.', 'remise_en_forme', 6, true),
  ('perte-de-poids', 'Programme Perte de poids', 'Cardio + renforcement pour transformer ta composition corporelle.', 'perte_de_poids', 8, true),
  ('renforcement', 'Programme Renforcement musculaire', 'Construire de la force et du muscle.', 'renforcement', 8, true),
  ('respiration', 'Programme Respiration', 'Techniques respiratoires et cohérence cardiaque.', 'respiration', 4, true),
  ('mobilite', 'Programme Mobilité', 'Améliorer souplesse et amplitudes articulaires.', 'mobilite', 6, true),
  ('sante-bien-etre', 'Programme Santé & bien-être', 'Routine équilibrée pour ta santé globale.', 'sante', 6, true),
  ('endurance', 'Programme Endurance', 'Développement de la capacité aérobie.', 'endurance', 8, true),
  ('autre', 'Programme sur mesure', 'Programme personnalisé selon ton besoin.', 'autre', 4, true)
ON CONFLICT (slug) DO NOTHING;
