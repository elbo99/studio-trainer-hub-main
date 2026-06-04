
-- 1. Create studio_categories table
CREATE TABLE public.studio_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.studio_categories ENABLE ROW LEVEL SECURITY;

-- 2. Create studio_category_assignments table
CREATE TABLE public.studio_category_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.studio_categories(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, member_id)
);
ALTER TABLE public.studio_category_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Security definer functions
CREATE OR REPLACE FUNCTION public.is_coach_category(_category_id uuid, _coach_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.studio_categories WHERE id = _category_id AND coach_id = _coach_id) $$;

CREATE OR REPLACE FUNCTION public.is_category_assigned_to_member(_category_id uuid, _member_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.studio_category_assignments WHERE category_id = _category_id AND member_id = _member_id) $$;

-- 4. RLS for studio_categories
CREATE POLICY "Coaches can select their categories" ON public.studio_categories FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert categories" ON public.studio_categories FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY "Coaches can update their categories" ON public.studio_categories FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can delete their categories" ON public.studio_categories FOR DELETE USING (auth.uid() = coach_id);
CREATE POLICY "Members can view assigned categories" ON public.studio_categories FOR SELECT USING (is_category_assigned_to_member(id, auth.uid()));

-- 5. RLS for studio_category_assignments
CREATE POLICY "Coaches can view category assignments" ON public.studio_category_assignments FOR SELECT USING (is_coach_category(category_id, auth.uid()));
CREATE POLICY "Members can view their category assignments" ON public.studio_category_assignments FOR SELECT USING (auth.uid() = member_id);
CREATE POLICY "Coaches can assign categories" ON public.studio_category_assignments FOR INSERT WITH CHECK (is_coach_category(category_id, auth.uid()) AND is_coach_of(auth.uid(), member_id));
CREATE POLICY "Coaches can revoke category assignments" ON public.studio_category_assignments FOR DELETE USING (is_coach_category(category_id, auth.uid()));

-- 6. Update studio_videos: add category_id, make member_id and category nullable
ALTER TABLE public.studio_videos ADD COLUMN category_id uuid REFERENCES public.studio_categories(id) ON DELETE SET NULL;
ALTER TABLE public.studio_videos ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.studio_videos ALTER COLUMN category DROP NOT NULL;

-- 7. Update member video access to include category-based access
DROP POLICY IF EXISTS "Members can view assigned videos" ON public.studio_videos;
CREATE POLICY "Members can view accessible videos" ON public.studio_videos
FOR SELECT USING (
  auth.uid() = member_id
  OR is_video_assigned_to_member(id, auth.uid())
  OR (category_id IS NOT NULL AND is_category_assigned_to_member(category_id, auth.uid()))
);

-- 8. Simplify insert policy (coach owns video, category check done in app)
DROP POLICY IF EXISTS "Coaches can insert videos" ON public.studio_videos;
CREATE POLICY "Coaches can insert videos" ON public.studio_videos
FOR INSERT WITH CHECK (auth.uid() = coach_id);
