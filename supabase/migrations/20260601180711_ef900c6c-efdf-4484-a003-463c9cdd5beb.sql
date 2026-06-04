
-- 1) Objectifs hebdo par programme
CREATE TABLE public.coach_program_week_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL,
  week_index INTEGER NOT NULL,
  objective TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, week_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_program_week_objectives TO authenticated;
GRANT ALL ON public.coach_program_week_objectives TO service_role;
ALTER TABLE public.coach_program_week_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages own program objectives select"
ON public.coach_program_week_objectives FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.coach_library_programs p WHERE p.id = program_id AND p.coach_id = auth.uid()));

CREATE POLICY "Coach manages own program objectives insert"
ON public.coach_program_week_objectives FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.coach_library_programs p WHERE p.id = program_id AND p.coach_id = auth.uid()));

CREATE POLICY "Coach manages own program objectives update"
ON public.coach_program_week_objectives FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.coach_library_programs p WHERE p.id = program_id AND p.coach_id = auth.uid()));

CREATE POLICY "Coach manages own program objectives delete"
ON public.coach_program_week_objectives FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.coach_library_programs p WHERE p.id = program_id AND p.coach_id = auth.uid()));

CREATE TRIGGER trg_update_cpwo_updated_at
BEFORE UPDATE ON public.coach_program_week_objectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Suivi lecture commentaire coach
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS coach_seen_at TIMESTAMPTZ;

-- 3) Notifications internes coach
CREATE TABLE public.coach_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  member_id UUID,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coach_notif_coach ON public.coach_notifications(coach_id, created_at DESC);
CREATE INDEX idx_coach_notif_unread ON public.coach_notifications(coach_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_notifications TO authenticated;
GRANT ALL ON public.coach_notifications TO service_role;
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach views own notifications" ON public.coach_notifications
FOR SELECT TO authenticated USING (auth.uid() = coach_id);

CREATE POLICY "Coach updates own notifications" ON public.coach_notifications
FOR UPDATE TO authenticated USING (auth.uid() = coach_id);

CREATE POLICY "Coach deletes own notifications" ON public.coach_notifications
FOR DELETE TO authenticated USING (auth.uid() = coach_id);

-- 4) Triggers pour générer les notifs
CREATE OR REPLACE FUNCTION public.notify_coach_member_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'member' AND NEW.coach_id IS NOT NULL THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.coach_id, NEW.id, 'member.created', jsonb_build_object('name', NEW.name, 'email', NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_member_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_coach_member_created();

CREATE OR REPLACE FUNCTION public.notify_coach_profile_updates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- New coach assigned
  IF NEW.coach_id IS NOT NULL AND NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.coach_id, NEW.id, 'member.created', jsonb_build_object('name', NEW.name, 'email', NEW.email));
  END IF;
  -- Program chosen
  IF NEW.onboarding_program_id IS NOT NULL
     AND NEW.onboarding_program_id IS DISTINCT FROM OLD.onboarding_program_id
     AND NEW.coach_id IS NOT NULL THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.coach_id, NEW.id, 'program.chosen',
            jsonb_build_object('name', NEW.name, 'program_id', NEW.onboarding_program_id, 'objective', NEW.onboarding_objective));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_profile_updates
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_coach_profile_updates();

CREATE OR REPLACE FUNCTION public.notify_coach_task_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Session completed
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.coach_id, NEW.member_id, 'session.completed',
            jsonb_build_object('task_id', NEW.id, 'title', NEW.title));
  END IF;
  -- Comment added/updated by member
  IF NEW.member_comment IS NOT NULL
     AND (OLD.member_comment IS NULL OR OLD.member_comment IS DISTINCT FROM NEW.member_comment) THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.coach_id, NEW.member_id, 'comment.left',
            jsonb_build_object('task_id', NEW.id, 'title', NEW.title, 'comment', NEW.member_comment));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_changes
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_coach_task_changes();

CREATE OR REPLACE FUNCTION public.notify_coach_message_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  receiver_role app_role;
BEGIN
  SELECT role INTO receiver_role FROM public.profiles WHERE id = NEW.receiver_id;
  IF receiver_role = 'coach' THEN
    INSERT INTO public.coach_notifications(coach_id, member_id, type, payload)
    VALUES (NEW.receiver_id, NEW.sender_id, 'message.sent',
            jsonb_build_object('message_id', NEW.id, 'preview', LEFT(NEW.content, 120)));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_message_sent
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_coach_message_sent();
