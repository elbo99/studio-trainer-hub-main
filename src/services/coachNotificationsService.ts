import { supabase } from "@/integrations/supabase/client";

export type CoachNotificationType =
  | "member.created"
  | "program.chosen"
  | "session.completed"
  | "comment.left"
  | "message.sent";

export interface CoachNotification {
  id: string;
  coach_id: string;
  member_id: string | null;
  type: CoachNotificationType;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export async function getCoachNotifications(coachId: string, limit = 30): Promise<CoachNotification[]> {
  const { data, error } = await (supabase as any)
    .from("coach_notifications")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as CoachNotification[];
}

export async function getUnreadNotificationsCount(coachId: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from("coach_notifications")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .is("read_at", null);
  if (error) throw error;
  return count || 0;
}

export async function markAllNotificationsRead(coachId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("coach_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("coach_id", coachId)
    .is("read_at", null);
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("coach_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export function labelForNotification(n: CoachNotification): string {
  const name = (n.payload as any)?.name || "Membre";
  switch (n.type) {
    case "member.created":
      return `${name} a rejoint Studio Gym 360`;
    case "program.chosen":
      return `${name} a choisi un programme`;
    case "session.completed":
      return `${name} a validé : ${(n.payload as any)?.title || "une séance"}`;
    case "comment.left":
      return `${name} a laissé un commentaire`;
    case "message.sent":
      return `Nouveau message de ${name}`;
    default:
      return n.type;
  }
}
