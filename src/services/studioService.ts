import { supabase } from "@/integrations/supabase/client";

// ── Category types ──────────────────────────────────────────────
export interface StudioCategory {
  id: string;
  coach_id: string;
  name: string;
  icon: string;
  subtitle: string | null;
  description: string | null;
  created_at: string;
}

export interface StudioVideo {
  id: string;
  coach_id: string;
  member_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string;
  created_at: string;
}

export type ResourceType = "pdf" | "article" | "link";

export interface StudioResource {
  id: string;
  coach_id: string;
  category_id: string;
  type: ResourceType;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  content: string | null;
  created_at: string;
}

export interface CategoryAssignment {
  id: string;
  category_id: string;
  member_id: string;
  assigned_at: string;
}

// ── YouTube helpers ─────────────────────────────────────────────
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// ── Category CRUD ───────────────────────────────────────────────
export async function getCategories(): Promise<StudioCategory[]> {
  const { data, error } = await supabase
    .from('studio_categories')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as StudioCategory[];
}

export async function createCategory(
  coachId: string,
  name: string,
  icon: string,
  subtitle?: string,
  description?: string,
): Promise<StudioCategory> {
  const { data, error } = await supabase
    .from('studio_categories')
    .insert({ coach_id: coachId, name, icon, subtitle: subtitle || null, description: description || null } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StudioCategory;
}

export async function updateCategory(
  categoryId: string,
  name: string,
  icon?: string,
  subtitle?: string | null,
  description?: string | null,
): Promise<void> {
  const update: Record<string, any> = { name };
  if (icon !== undefined) update.icon = icon;
  if (subtitle !== undefined) update.subtitle = subtitle;
  if (description !== undefined) update.description = description;
  const { error } = await supabase
    .from('studio_categories')
    .update(update as any)
    .eq('id', categoryId);
  if (error) throw error;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('studio_categories')
    .delete()
    .eq('id', categoryId);
  if (error) throw error;
}

// ── Category assignments ────────────────────────────────────────
export async function getCategoryAssignments(categoryId: string): Promise<CategoryAssignment[]> {
  const { data, error } = await supabase
    .from('studio_category_assignments')
    .select('*')
    .eq('category_id', categoryId);
  if (error) throw error;
  return (data || []) as unknown as CategoryAssignment[];
}

export async function assignCategoryToMember(categoryId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('studio_category_assignments')
    .insert({ category_id: categoryId, member_id: memberId } as any);
  if (error) throw error;
}

export async function revokeCategoryFromMember(categoryId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('studio_category_assignments')
    .delete()
    .eq('category_id', categoryId)
    .eq('member_id', memberId);
  if (error) throw error;
}

// ── Videos ──────────────────────────────────────────────────────
export async function getCategoryVideos(categoryId: string): Promise<StudioVideo[]> {
  const { data, error } = await (supabase
    .from('studio_videos')
    .select('*') as any)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as StudioVideo[];
}

export async function addYouTubeVideo(
  youtubeUrl: string,
  coachId: string,
  categoryId: string,
  title: string,
  description: string,
): Promise<StudioVideo> {
  const { data, error } = await supabase
    .from('studio_videos')
    .insert({
      coach_id: coachId,
      category_id: categoryId,
      title,
      description: description || null,
      video_url: youtubeUrl,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StudioVideo;
}

export async function deleteVideo(videoId: string): Promise<void> {
  const { error } = await supabase
    .from('studio_videos')
    .delete()
    .eq('id', videoId);
  if (error) throw error;
}

// ── Resources (PDF / Article / Link) ────────────────────────────
export async function getCategoryResources(categoryId: string): Promise<StudioResource[]> {
  const { data, error } = await (supabase
    .from('studio_resources' as any)
    .select('*') as any)
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as StudioResource[];
}

export async function createResource(payload: {
  coachId: string;
  categoryId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  filePath?: string;
  content?: string;
}): Promise<StudioResource> {
  const { data, error } = await (supabase
    .from('studio_resources' as any)
    .insert({
      coach_id: payload.coachId,
      category_id: payload.categoryId,
      type: payload.type,
      title: payload.title,
      description: payload.description || null,
      url: payload.url || null,
      file_path: payload.filePath || null,
      content: payload.content || null,
    } as any)
    .select()
    .single() as any);
  if (error) throw error;
  return data as StudioResource;
}

export async function deleteResource(resourceId: string, filePath?: string | null): Promise<void> {
  if (filePath) {
    await supabase.storage.from('studio-resources').remove([filePath]).catch(() => {});
  }
  const { error } = await (supabase.from('studio_resources' as any).delete().eq('id', resourceId) as any);
  if (error) throw error;
}

export async function uploadResourceFile(coachId: string, file: File): Promise<{ path: string; url: string }> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${coachId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('studio-resources')
    .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
  if (error) throw error;
  // Bucket is private; store only the path. Use getResourceSignedUrl to view.
  return { path, url: path };
}

// Generate a short-lived signed URL to view a private studio-resources file
export async function getResourceSignedUrl(filePath: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from('studio-resources')
    .createSignedUrl(filePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// ── Emoji icons for categories ──────────────────────────────────
export const availableIcons = [
  '🏋️', '💪', '🦵', '🔙', '🧘', '🏃', '⚡', '🎯', '🔥', '❤️',
  '🏊', '🚴', '🤸', '🧠', '📁', '⭐', '🎬', '🏆', '🥗', '🛌', '🌿', '🏅',
];

// ── Curated category presets ────────────────────────────────────
export const categoryPresets: { name: string; icon: string; subtitle: string }[] = [
  { name: "Perte de poids", icon: "🔥", subtitle: "Méthode complète pour brûler les graisses" },
  { name: "Hyrox", icon: "🏅", subtitle: "Préparation spécifique Hyrox" },
  { name: "Course à pied", icon: "🏃", subtitle: "Programmes et conseils running" },
  { name: "Renforcement musculaire", icon: "💪", subtitle: "Construire force et tonus" },
  { name: "Mobilité", icon: "🤸", subtitle: "Souplesse et amplitude articulaire" },
  { name: "Nutrition", icon: "🥗", subtitle: "Alimentation et conseils nutritionnels" },
  { name: "Récupération", icon: "🛌", subtitle: "Sommeil, étirements, repos" },
  { name: "Bien-être", icon: "🌿", subtitle: "Respiration, méditation, équilibre" },
];
