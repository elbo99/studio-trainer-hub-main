
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions select"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own push subscriptions insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own push subscriptions update"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own push subscriptions delete"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at);
