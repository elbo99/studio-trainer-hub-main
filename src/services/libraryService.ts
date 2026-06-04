import { supabase } from "@/integrations/supabase/client";

export interface LibrarySession {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  type: string;
  cycle: string | null;
  notes: string | null;
  duration: string | null;
  sets_reps: string | null;
  rest: string | null;
  intensity: string | null;
  exercise_notes: string | null;
  recurrence: string;
  frequency: number;
  program_id: string | null;
  session_order: number;
  created_at: string;
}

export interface LibraryAssignment {
  id: string;
  session_id: string;
  member_id: string;
  assigned_at: string;
}

export interface LibraryProgram {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// --- Programs CRUD ---

export async function getCoachPrograms(coachId: string): Promise<LibraryProgram[]> {
  const { data, error } = await (supabase as any)
    .from("coach_library_programs")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as LibraryProgram[];
}

export async function createProgram(coachId: string, title: string, description?: string): Promise<LibraryProgram> {
  const { data, error } = await (supabase as any)
    .from("coach_library_programs")
    .insert({ coach_id: coachId, title, description: description || null })
    .select()
    .single();
  if (error) throw error;
  return data as LibraryProgram;
}

export async function updateProgram(id: string, updates: { title?: string; description?: string | null }): Promise<void> {
  const { error } = await (supabase as any).from("coach_library_programs").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await (supabase as any).from("coach_library_programs").delete().eq("id", id);
  if (error) throw error;
}

// --- Sessions CRUD ---

export async function getCoachLibrarySessions(coachId: string): Promise<LibrarySession[]> {
  const { data, error } = await (supabase as any)
    .from("coach_library_sessions")
    .select("*")
    .eq("coach_id", coachId)
    .order("session_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as LibrarySession[];
}

export async function createLibrarySession(session: {
  coachId: string;
  title: string;
  description?: string;
  type: string;
  cycle?: string;
  notes?: string;
  duration?: string;
  sets_reps?: string;
  rest?: string;
  intensity?: string;
  exercise_notes?: string;
  recurrence?: string;
  frequency?: number;
  program_id?: string | null;
  session_order?: number;
}): Promise<LibrarySession> {
  const { data, error } = await (supabase as any)
    .from("coach_library_sessions")
    .insert({
      coach_id: session.coachId,
      title: session.title,
      description: session.description || null,
      type: session.type,
      cycle: session.cycle || null,
      notes: session.notes || null,
      duration: session.duration || null,
      sets_reps: session.sets_reps || null,
      rest: session.rest || null,
      intensity: session.intensity || null,
      exercise_notes: session.exercise_notes || null,
      recurrence: session.recurrence || "weekly",
      frequency: session.frequency ?? 1,
      program_id: session.program_id ?? null,
      session_order: session.session_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LibrarySession;
}

export async function updateLibrarySession(
  sessionId: string,
  updates: Partial<Omit<LibrarySession, "id" | "coach_id" | "created_at">>
): Promise<LibrarySession> {
  const { data, error } = await (supabase as any)
    .from("coach_library_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as LibrarySession;
}

export async function deleteLibrarySession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("coach_library_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw error;
}

// --- Assignments ---

export async function getSessionAssignments(sessionId: string): Promise<LibraryAssignment[]> {
  const { data, error } = await supabase
    .from("coach_library_assignments")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw error;
  return (data || []) as LibraryAssignment[];
}

export async function assignSessionToMember(sessionId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from("coach_library_assignments")
    .insert({ session_id: sessionId, member_id: memberId });
  if (error) throw error;
}

export async function revokeSessionFromMember(sessionId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from("coach_library_assignments")
    .delete()
    .eq("session_id", sessionId)
    .eq("member_id", memberId);
  if (error) throw error;
}

// --- Get sessions assigned to a member (read-only view) ---

export async function getMemberLibrarySessions(memberId: string): Promise<(LibrarySession & { assigned_at: string })[]> {
  const { data: assignments, error: aErr } = await supabase
    .from("coach_library_assignments")
    .select("*")
    .eq("member_id", memberId);
  if (aErr) throw aErr;
  if (!assignments || assignments.length === 0) return [];

  const sessionIds = assignments.map((a: any) => a.session_id);
  const { data: sessions, error: sErr } = await supabase
    .from("coach_library_sessions")
    .select("*")
    .in("id", sessionIds);
  if (sErr) throw sErr;

  return (sessions || []).map((s: any) => ({
    ...s,
    assigned_at: assignments.find((a: any) => a.session_id === s.id)?.assigned_at || "",
  })) as (LibrarySession & { assigned_at: string })[];
}

// --- Convert session to tasks for a member ---

export async function assignSessionAsObjective(
  session: LibrarySession,
  memberId: string,
  coachId: string,
  weekStart: string
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .insert({
      member_id: memberId,
      coach_id: coachId,
      title: session.title,
      description: session.description,
      type: session.type,
      notes: session.notes,
      duration: session.duration,
      sets_reps: session.sets_reps,
      rest: session.rest,
      intensity: session.intensity,
      exercise_notes: session.exercise_notes,
      recurrence: session.recurrence,
      frequency: session.frequency,
      week_start: weekStart,
    });
  if (error) throw error;
}

// --- Assign an entire program: spread cycles over consecutive weeks ---

function addWeeksLocal(weekStart: string, weeks: number): string {
  const date = new Date(weekStart + "T00:00:00");
  date.setDate(date.getDate() + weeks * 7);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function assignProgramToMember(
  programSessions: LibrarySession[],
  memberId: string,
  coachId: string,
  startWeekStart: string
): Promise<{ cycles: number; sessions: number; weeks: { cycle: string; week_start: string; count: number }[] }> {
  const groups = new Map<string, LibrarySession[]>();
  programSessions.forEach((s) => {
    const k = s.cycle?.trim() || "Sans cycle";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  });
  const keys = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  const inserts: any[] = [];
  const weeks: { cycle: string; week_start: string; count: number }[] = [];
  keys.forEach((k, idx) => {
    const weekStart = addWeeksLocal(startWeekStart, idx);
    const list = groups.get(k)!;
    weeks.push({ cycle: k, week_start: weekStart, count: list.length });
    list.forEach((s) => {
      inserts.push({
        member_id: memberId,
        coach_id: coachId,
        title: s.title,
        description: s.description,
        type: s.type,
        notes: s.notes,
        duration: s.duration,
        sets_reps: s.sets_reps,
        rest: s.rest,
        intensity: s.intensity,
        exercise_notes: s.exercise_notes,
        recurrence: s.recurrence,
        frequency: s.frequency,
        week_start: weekStart,
      });
    });
  });

  if (inserts.length === 0) return { cycles: 0, sessions: 0, weeks: [] };
  const { error } = await supabase.from("tasks").insert(inserts);
  if (error) throw error;

  // Auto-attach weekly objectives (if defined on the program)
  try {
    const programIds = Array.from(
      new Set(programSessions.map((s) => s.program_id).filter(Boolean))
    ) as string[];
    if (programIds.length > 0) {
      const { data: objectives } = await (supabase as any)
        .from("coach_program_week_objectives")
        .select("*")
        .in("program_id", programIds);
      if (objectives && objectives.length > 0) {
        const objInserts = weeks
          .map((w, idx) => {
            const o = objectives.find((x: any) => x.week_index === idx + 1);
            if (!o) return null;
            return {
              member_id: memberId,
              coach_id: coachId,
              week_start: w.week_start,
              objective: o.objective,
            };
          })
          .filter(Boolean);
        if (objInserts.length > 0) {
          // Replace existing objectives on these weeks for this member
          const weekStarts = objInserts.map((o: any) => o.week_start);
          await (supabase as any)
            .from("weekly_objectives")
            .delete()
            .eq("member_id", memberId)
            .in("week_start", weekStarts);
          await (supabase as any).from("weekly_objectives").insert(objInserts);
        }
      }
    }
  } catch (e) {
    console.warn("[assignProgramToMember] weekly objectives failed", e);
  }

  return { cycles: keys.length, sessions: inserts.length, weeks };
}
