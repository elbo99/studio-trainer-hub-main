
-- 1. Add image_url to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Add member_followup to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS member_followup text;

-- 3. Create chat-photos public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS - read public, write only own folder
CREATE POLICY "Chat photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-photos');

CREATE POLICY "Users can upload their own chat photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
