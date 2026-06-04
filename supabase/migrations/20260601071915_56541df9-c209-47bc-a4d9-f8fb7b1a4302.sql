
-- 1) Nettoyer les orphelins éventuels avant d'ajouter les FK
DELETE FROM public.member_indicators WHERE member_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.studio_categories WHERE coach_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.studio_resources WHERE coach_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.studio_resources WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM public.studio_categories);
DELETE FROM public.studio_category_assignments WHERE member_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.coach_library_programs WHERE coach_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.coach_library_sessions WHERE coach_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.coach_library_assignments WHERE member_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.daily_task_completions WHERE member_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.weekly_objectives WHERE member_id NOT IN (SELECT id FROM public.profiles) OR coach_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.studio_videos WHERE coach_id NOT IN (SELECT id FROM public.profiles);
UPDATE public.studio_videos SET member_id = NULL WHERE member_id IS NOT NULL AND member_id NOT IN (SELECT id FROM public.profiles);

-- 2) Ajouter les FK manquantes (avec CASCADE)
ALTER TABLE public.member_indicators
  ADD CONSTRAINT member_indicators_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.studio_categories
  ADD CONSTRAINT studio_categories_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.studio_resources
  ADD CONSTRAINT studio_resources_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.studio_resources
  ADD CONSTRAINT studio_resources_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.studio_categories(id) ON DELETE CASCADE;

ALTER TABLE public.studio_category_assignments
  ADD CONSTRAINT studio_category_assignments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_library_programs
  ADD CONSTRAINT coach_library_programs_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_library_sessions
  ADD CONSTRAINT coach_library_sessions_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coach_library_assignments
  ADD CONSTRAINT coach_library_assignments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3) Convertir les FK existantes en ON DELETE CASCADE
ALTER TABLE public.daily_task_completions
  DROP CONSTRAINT daily_task_completions_member_id_fkey,
  ADD  CONSTRAINT daily_task_completions_member_id_fkey
       FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_objectives
  DROP CONSTRAINT weekly_objectives_member_id_fkey,
  ADD  CONSTRAINT weekly_objectives_member_id_fkey
       FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_objectives
  DROP CONSTRAINT weekly_objectives_coach_id_fkey,
  ADD  CONSTRAINT weekly_objectives_coach_id_fkey
       FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.studio_videos
  DROP CONSTRAINT studio_videos_coach_id_fkey,
  ADD  CONSTRAINT studio_videos_coach_id_fkey
       FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.studio_videos
  DROP CONSTRAINT studio_videos_member_id_fkey,
  ADD  CONSTRAINT studio_videos_member_id_fkey
       FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4) Index utiles pour les FK (perf cascade & joins)
CREATE INDEX IF NOT EXISTS idx_tasks_member_id ON public.tasks(member_id);
CREATE INDEX IF NOT EXISTS idx_tasks_coach_id ON public.tasks(coach_id);
CREATE INDEX IF NOT EXISTS idx_tasks_week_start ON public.tasks(week_start);
CREATE INDEX IF NOT EXISTS idx_daily_completions_member_id ON public.daily_task_completions(member_id);
CREATE INDEX IF NOT EXISTS idx_daily_completions_task_id ON public.daily_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_member ON public.weekly_objectives(member_id, week_start);
CREATE INDEX IF NOT EXISTS idx_studio_videos_coach ON public.studio_videos(coach_id);
CREATE INDEX IF NOT EXISTS idx_studio_videos_member ON public.studio_videos(member_id);
CREATE INDEX IF NOT EXISTS idx_studio_resources_category ON public.studio_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_studio_categories_coach ON public.studio_categories(coach_id);
CREATE INDEX IF NOT EXISTS idx_library_sessions_coach ON public.coach_library_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_library_sessions_program ON public.coach_library_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);
