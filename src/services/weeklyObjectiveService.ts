import { supabase } from "@/integrations/supabase/client";

export interface WeeklyObjective {
  id: string;
  coach_id: string;
  member_id: string;
  week_start: string;
  objective: string;
  created_at: string;
  updated_at: string;
}

export async function getWeeklyObjective(memberId: string, weekStart: string): Promise<WeeklyObjective | null> {
  const { data, error } = await supabase
    .from("weekly_objectives")
    .select("*")
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  return data as WeeklyObjective | null;
}

export async function upsertWeeklyObjective(
  coachId: string,
  memberId: string,
  weekStart: string,
  objective: string
): Promise<WeeklyObjective> {
  const { data, error } = await supabase
    .from("weekly_objectives")
    .upsert(
      { coach_id: coachId, member_id: memberId, week_start: weekStart, objective, updated_at: new Date().toISOString() },
      { onConflict: "member_id,week_start" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as WeeklyObjective;
}

export async function deleteWeeklyObjective(id: string): Promise<void> {
  const { error } = await supabase
    .from("weekly_objectives")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
