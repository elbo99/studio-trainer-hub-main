
-- Force RLS on user_roles to prevent any bypass
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Force RLS on profiles to prevent any bypass
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Force RLS on messages to prevent any bypass
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

-- Also force RLS on other tables for consistency
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE public.studio_videos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.studio_video_assignments FORCE ROW LEVEL SECURITY;
