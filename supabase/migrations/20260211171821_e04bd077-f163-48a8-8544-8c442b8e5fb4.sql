
-- Drop existing storage policies that conflict
DROP POLICY IF EXISTS "Coaches can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can delete their videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view studio videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone authenticated can view studio videos" ON storage.objects;

-- Make studio-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'studio-videos';

-- Recreate storage policies
CREATE POLICY "Coaches can upload studio videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-videos' AND
  has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Coaches can delete studio videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-videos' AND
  has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Authenticated users can view studio videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'studio-videos');
