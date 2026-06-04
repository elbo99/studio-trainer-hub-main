-- Créer une enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('coach', 'member');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des rôles utilisateurs (pour les vérifications sécurisées)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Table des objectifs/tâches
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('swimming', 'cardio', 'strength', 'wellness', 'other')),
  notes TEXT, -- Notes du coach
  member_comment TEXT, -- Commentaire du membre
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_done')),
  week_start DATE NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE)::date),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de l'historique hebdomadaire
CREATE TABLE public.weekly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (member_id, week_start)
);

-- Table des messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier le rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour récupérer le coach_id d'un membre
CREATE OR REPLACE FUNCTION public.get_coach_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_id FROM public.profiles WHERE id = _user_id
$$;

-- Fonction pour vérifier si un utilisateur est le coach d'un membre
CREATE OR REPLACE FUNCTION public.is_coach_of(_coach_id UUID, _member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _member_id AND coach_id = _coach_id
  )
$$;

-- RLS Policies pour profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Coaches can view their members profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'coach') AND coach_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Coaches can insert new member profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'coach') AND coach_id = auth.uid() AND role = 'member');

-- RLS Policies pour user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies pour tasks
CREATE POLICY "Members can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Coaches can view tasks they created"
  ON public.tasks FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert tasks for their members"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = coach_id AND public.is_coach_of(auth.uid(), member_id));

CREATE POLICY "Coaches can update tasks they created"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Members can update their own task status and comment"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = member_id);

CREATE POLICY "Coaches can delete tasks they created"
  ON public.tasks FOR DELETE
  USING (auth.uid() = coach_id);

-- RLS Policies pour weekly_progress
CREATE POLICY "Members can view their own progress"
  ON public.weekly_progress FOR SELECT
  USING (auth.uid() = member_id);

CREATE POLICY "Coaches can view their members progress"
  ON public.weekly_progress FOR SELECT
  USING (public.is_coach_of(auth.uid(), member_id));

CREATE POLICY "Members can insert their own progress"
  ON public.weekly_progress FOR INSERT
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can update their own progress"
  ON public.weekly_progress FOR UPDATE
  USING (auth.uid() = member_id);

-- RLS Policies pour messages
CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour créer un profil après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'member')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'member')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();