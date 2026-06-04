import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { emitWebhook } from "./webhooksService";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export interface TaskWithDetails extends Task {
  type: "swimming" | "cardio" | "strength" | "wellness" | "other";
  status: "pending" | "done" | "not_done";
  duration: string | null;
  sets_reps: string | null;
  rest: string | null;
  intensity: string | null;
  exercise_notes: string | null;
  recurrence: "none" | "daily" | "weekly";
  frequency: number;
}

// Get tasks for a member, optionally filtered by week
export async function getMemberTasks(memberId: string, weekStart?: string): Promise<TaskWithDetails[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (weekStart) {
    query = query.eq("week_start", weekStart);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TaskWithDetails[];
}

// Get tasks for a member by coach, optionally filtered by week
export async function getMemberTasksByCoach(memberId: string, weekStart?: string): Promise<TaskWithDetails[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (weekStart) {
    query = query.eq("week_start", weekStart);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TaskWithDetails[];
}

// Create a new task (coach only)
export async function createTask(task: {
  memberId: string;
  coachId: string;
  title: string;
  description?: string;
  type: "swimming" | "cardio" | "strength" | "wellness" | "other";
  notes?: string;
  weekStart?: string;
  duration?: string;
  sets_reps?: string;
  rest?: string;
  intensity?: string;
  exercise_notes?: string;
  recurrence?: "none" | "daily" | "weekly";
  frequency?: number;
  heart_zone?: number | null;
  heart_zones?: string | null;
}): Promise<Task> {
  const insertData: TaskInsert = {
    member_id: task.memberId,
    coach_id: task.coachId,
    title: task.title,
    description: task.description,
    type: task.type,
    notes: task.notes,
    duration: task.duration || null,
    sets_reps: task.sets_reps || null,
    rest: task.rest || null,
    intensity: task.intensity || null,
    exercise_notes: task.exercise_notes || null,
    recurrence: task.recurrence || "weekly",
    frequency: task.frequency ?? 1,
    heart_zone: task.heart_zone ?? null,
    heart_zones: task.heart_zones ?? null,
  } as TaskInsert;


  if (task.weekStart) {
    insertData.week_start = task.weekStart;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update task (coach can update all, member can update status/comment)
export async function updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete task (coach only)
export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

// Update task status (member)
export async function updateTaskStatus(
  taskId: string, 
  status: "done" | "not_done", 
  memberComment?: string
): Promise<Task> {
  const updates: TaskUpdate = { status };
  if (memberComment !== undefined) {
    updates.member_comment = memberComment;
  }

  const result = await updateTask(taskId, updates);

  if (status === "done") {
    emitWebhook("session.completed", {
      task_id: result.id,
      member_id: result.member_id,
      coach_id: result.coach_id,
      title: result.title,
      type: result.type,
      week_start: result.week_start,
      completed_at: new Date().toISOString(),
    });
  }

  return result;
}

// Add comment to task (member)
export async function addTaskComment(taskId: string, comment: string): Promise<Task> {
  return updateTask(taskId, { member_comment: comment });
}

// --- Daily task completions ---

export interface DailyCompletion {
  id: string;
  task_id: string;
  member_id: string;
  completion_date: string;
  status: string;
  created_at: string;
}

// Get daily completions for a task in a given week
export async function getDailyCompletions(taskIds: string[], weekStart: string): Promise<DailyCompletion[]> {
  if (taskIds.length === 0) return [];
  
  // Calculate week end (7 days from start)
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_task_completions")
    .select("*")
    .in("task_id", taskIds)
    .gte("completion_date", weekStart)
    .lte("completion_date", weekEnd);

  if (error) throw error;
  return (data || []) as DailyCompletion[];
}

// Toggle daily completion for today
export async function toggleDailyCompletion(
  taskId: string,
  memberId: string,
  date: string,
  isCompleted: boolean
): Promise<void> {
  if (isCompleted) {
    // Remove completion
    const { error } = await supabase
      .from("daily_task_completions")
      .delete()
      .eq("task_id", taskId)
      .eq("completion_date", date);
    if (error) throw error;
  } else {
    // Add completion
    const { error } = await supabase
      .from("daily_task_completions")
      .insert({
        task_id: taskId,
        member_id: memberId,
        completion_date: date,
        status: "done",
      });
    if (error) throw error;

    emitWebhook("session.completed", {
      task_id: taskId,
      member_id: memberId,
      completion_date: date,
      kind: "daily",
    });
  }
}
