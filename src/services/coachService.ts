import { supabase } from "@/integrations/supabase/client";

export interface CoachInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface CoachStats {
  coach: CoachInfo | null;
  lastReceivedMessage: { content: string; created_at: string; image_url: string | null } | null;
  avgResponseMinutes: number | null;
}

export async function getCoachForMember(memberId: string): Promise<CoachInfo | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!profile?.coach_id) return null;

  const { data: coach } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .eq("id", profile.coach_id)
    .maybeSingle();
  return (coach as CoachInfo) ?? null;
}

export async function getCoachStats(memberId: string): Promise<CoachStats> {
  const coach = await getCoachForMember(memberId);
  if (!coach) return { coach: null, lastReceivedMessage: null, avgResponseMinutes: null };

  // Last message received from coach
  const { data: lastMsg } = await supabase
    .from("messages")
    .select("content, created_at, image_url")
    .eq("sender_id", coach.id)
    .eq("receiver_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Pull last ~50 messages of the conversation to compute average response time
  const [outRes, inRes] = await Promise.all([
    supabase
      .from("messages")
      .select("created_at")
      .eq("sender_id", memberId)
      .eq("receiver_id", coach.id)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("messages")
      .select("created_at")
      .eq("sender_id", coach.id)
      .eq("receiver_id", memberId)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const memberMsgs = (outRes.data ?? []).map(m => new Date(m.created_at).getTime());
  const coachMsgs = (inRes.data ?? []).map(m => new Date(m.created_at).getTime());

  // For each member message, find the next coach reply
  const deltas: number[] = [];
  let j = 0;
  for (const t of memberMsgs) {
    while (j < coachMsgs.length && coachMsgs[j] <= t) j++;
    if (j < coachMsgs.length) {
      deltas.push(coachMsgs[j] - t);
    }
  }
  const avgMs = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
  const avgResponseMinutes = avgMs != null ? Math.round(avgMs / 60000) : null;

  return {
    coach,
    lastReceivedMessage: lastMsg ?? null,
    avgResponseMinutes,
  };
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl;
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ avatar_url: url } as never)
    .eq("id", userId);
  if (upErr) throw upErr;
  return url;
}

export function formatResponseDelay(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} j`;
}
