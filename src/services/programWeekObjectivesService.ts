import { supabase } from "@/integrations/supabase/client";

export interface ProgramWeekObjective {
  id: string;
  program_id: string;
  week_index: number; // 1-based
  objective: string;
  created_at: string;
  updated_at: string;
}

export async function getProgramWeekObjectives(programId: string): Promise<ProgramWeekObjective[]> {
  const { data, error } = await (supabase as any)
    .from("coach_program_week_objectives")
    .select("*")
    .eq("program_id", programId)
    .order("week_index", { ascending: true });
  if (error) throw error;
  return (data || []) as ProgramWeekObjective[];
}

export async function upsertProgramWeekObjective(
  programId: string,
  weekIndex: number,
  objective: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from("coach_program_week_objectives")
    .upsert(
      { program_id: programId, week_index: weekIndex, objective },
      { onConflict: "program_id,week_index" }
    );
  if (error) throw error;
}

export async function deleteProgramWeekObjective(
  programId: string,
  weekIndex: number
): Promise<void> {
  const { error } = await (supabase as any)
    .from("coach_program_week_objectives")
    .delete()
    .eq("program_id", programId)
    .eq("week_index", weekIndex);
  if (error) throw error;
}
