import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export type AppointmentType =
  | "coaching_prive"
  | "coaching_duo"
  | "small_group"
  | "yoga"
  | "kids"
  | "bloque"
  | "autre";

export type AppointmentStatus = "confirme" | "annule";

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  coaching_prive: "Coaching privé",
  coaching_duo: "Coaching duo",
  small_group: "Small group",
  yoga: "Yoga",
  kids: "Kids",
  bloque: "Créneau bloqué",
  autre: "Autre",
};

export interface Appointment extends AppointmentRow {
  type: AppointmentType;
  status: AppointmentStatus;
}

export interface AppointmentInput {
  memberId: string | null;
  type: AppointmentType;
  title: string | null;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
}

/** Rendez-vous du coach qui recoupent [from, to). */
export async function getCoachAppointments(coachId: string, from: Date, to: Date): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("coach_id", coachId)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Appointment[];
}

export async function createAppointment(coachId: string, input: AppointmentInput): Promise<void> {
  const { error } = await supabase.from("appointments").insert({
    coach_id: coachId,
    member_id: input.memberId,
    type: input.type,
    title: input.title,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    notes: input.notes,
  });
  if (error) throw error;
}

export async function updateAppointment(id: string, input: AppointmentInput): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({
      member_id: input.memberId,
      type: input.type,
      title: input.title,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      notes: input.notes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}
