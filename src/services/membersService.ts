import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export interface MemberWithTasks extends Profile {
  tasks: Task[];
  stats: {
    total: number;
    done: number;
    notDone: number;
    pending: number;
  };
  weekStats?: {
    total: number;
    done: number;
    pending: number;
    notDone: number;
    targetUnits: number;
    doneUnits: number;
  };
  lastCompletionAt?: string | null;
  weeklyObjective?: string | null;
  activeToday?: boolean;
}

// Compute Monday of current week as YYYY-MM-DD (local)
function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Get all members for a coach
export async function getCoachMembers(coachId: string): Promise<MemberWithTasks[]> {
  // Get members
  const { data: members, error: membersError } = await supabase
    .from("profiles")
    .select("*")
    .eq("coach_id", coachId)
    .eq("role", "member");

  if (membersError) throw membersError;

  if (!members || members.length === 0) return [];

  // Get tasks for all members
  const memberIds = members.map(m => m.id);
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .in("member_id", memberIds);

  if (tasksError) throw tasksError;

  const currentWeek = getCurrentMonday();
  // Week range for daily completions
  const weekEnd = (() => {
    const d = new Date(currentWeek + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const weekTaskIds = (tasks || []).filter(t => t.week_start === currentWeek).map(t => t.id);
  const { data: completions } = weekTaskIds.length > 0
    ? await supabase
        .from("daily_task_completions")
        .select("task_id, member_id, completion_date, created_at")
        .in("task_id", weekTaskIds)
        .gte("completion_date", currentWeek)
        .lte("completion_date", weekEnd)
    : { data: [] as any[] };

  // Latest weekly objectives per member
  const { data: objectives } = await supabase
    .from("weekly_objectives")
    .select("member_id, objective, week_start")
    .in("member_id", memberIds)
    .eq("week_start", currentWeek);

  return members.map(member => {
    const memberTasks = (tasks || []).filter(t => t.member_id === member.id);
    const done = memberTasks.filter(t => t.status === "done").length;
    const notDone = memberTasks.filter(t => t.status === "not_done").length;
    const pending = memberTasks.filter(t => t.status === "pending").length;

    const weekTasks = memberTasks.filter(t => t.week_start === currentWeek);
    const weekDone = weekTasks.filter(t => t.status === "done").length;
    const weekNotDone = weekTasks.filter(t => t.status === "not_done").length;
    const weekPending = weekTasks.filter(t => t.status === "pending").length;

    // Factual progress accounting for frequency (recurring tasks)
    let targetUnits = 0;
    let doneUnits = 0;
    weekTasks.forEach(t => {
      const freq = Math.max(1, t.frequency || 1);
      targetUnits += freq;
      if (freq > 1) {
        const cnt = (completions || []).filter(c => c.task_id === t.id).length;
        doneUnits += Math.min(cnt, freq);
      } else {
        if (t.status === "done") doneUnits += 1;
      }
    });

    // Last validated objective
    const memberCompletions = (completions || []).filter(c => c.member_id === member.id);
    const lastFromCompletions = memberCompletions
      .map(c => c.created_at)
      .sort()
      .pop();
    const lastFromTasks = memberTasks
      .filter(t => t.status === "done")
      .map(t => t.updated_at)
      .sort()
      .pop();
    const lastCompletionAt = [lastFromCompletions, lastFromTasks]
      .filter(Boolean)
      .sort()
      .pop() || null;

    const activeToday = memberCompletions.some(c => c.completion_date === todayStr);
    const obj = (objectives || []).find(o => o.member_id === member.id);

    return {
      ...member,
      tasks: memberTasks,
      stats: { total: memberTasks.length, done, notDone, pending },
      weekStats: {
        total: weekTasks.length,
        done: weekDone,
        pending: weekPending,
        notDone: weekNotDone,
        targetUnits,
        doneUnits,
      },
      lastCompletionAt,
      weeklyObjective: obj?.objective || null,
      activeToday,
    };
  });
}

// Get a specific member's data, optionally filtered by week
export async function getMemberData(memberId: string, weekStart?: string): Promise<MemberWithTasks | null> {
  const { data: member, error: memberError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .single();

  if (memberError) throw memberError;
  if (!member) return null;

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  if (weekStart) {
    query = query.eq("week_start", weekStart);
  }

  const { data: tasks, error: tasksError } = await query;
  if (tasksError) throw tasksError;

  const memberTasks = tasks || [];
  const done = memberTasks.filter(t => t.status === "done").length;
  const notDone = memberTasks.filter(t => t.status === "not_done").length;
  const pending = memberTasks.filter(t => t.status === "pending").length;

  return {
    ...member,
    tasks: memberTasks,
    stats: {
      total: memberTasks.length,
      done,
      notDone,
      pending,
    },
  };
}

// Get coach info for a member
export async function getMemberCoach(memberId: string): Promise<Profile | null> {
  const { data: member } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", memberId)
    .single();

  if (!member?.coach_id) return null;

  const { data: coach, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", member.coach_id)
    .single();

  if (error) throw error;
  return coach;
}

// Delete a member (coach only)
export async function deleteMember(memberId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-member", {
    body: { memberId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
