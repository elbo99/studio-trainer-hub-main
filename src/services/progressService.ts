import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WeeklyProgress = Database["public"]["Tables"]["weekly_progress"]["Row"];

export interface WeeklyProgressRecord {
  weekStart: string;
  weekLabel: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

// Get current week start date (Monday)
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

// Format week label
export function getWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("fr-FR", options)} - ${end.toLocaleDateString("fr-FR", options)}`;
}

// Get weekly history for a member
export async function getWeeklyHistory(memberId: string): Promise<WeeklyProgressRecord[]> {
  const { data, error } = await supabase
    .from("weekly_progress")
    .select("*")
    .eq("member_id", memberId)
    .order("week_start", { ascending: false })
    .limit(8);

  if (error) throw error;

  return (data || []).map(record => ({
    weekStart: record.week_start,
    weekLabel: getWeekLabel(record.week_start),
    totalTasks: record.total_tasks,
    completedTasks: record.completed_tasks,
    percentage: record.percentage,
  }));
}

// Update current week progress
export async function updateCurrentWeekProgress(
  memberId: string,
  totalTasks: number,
  completedTasks: number
): Promise<void> {
  const weekStart = getCurrentWeekStart();
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const { error } = await supabase
    .from("weekly_progress")
    .upsert(
      {
        member_id: memberId,
        week_start: weekStart,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        percentage,
      },
      {
        onConflict: "member_id,week_start",
      }
    );

  if (error) throw error;
}

// Get current week progress
export async function getCurrentWeekProgress(memberId: string): Promise<WeeklyProgressRecord | null> {
  const weekStart = getCurrentWeekStart();

  const { data, error } = await supabase
    .from("weekly_progress")
    .select("*")
    .eq("member_id", memberId)
    .eq("week_start", weekStart)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  if (!data) return null;

  return {
    weekStart: data.week_start,
    weekLabel: getWeekLabel(data.week_start),
    totalTasks: data.total_tasks,
    completedTasks: data.completed_tasks,
    percentage: data.percentage,
  };
}
