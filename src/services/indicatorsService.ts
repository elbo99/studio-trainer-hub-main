import { supabase } from "@/integrations/supabase/client";

export interface MemberIndicators {
  id?: string;
  member_id: string;
  zone1_min: number | null;
  zone1_max: number | null;
  zone2_min: number | null;
  zone2_max: number | null;
  zone3_min: number | null;
  zone3_max: number | null;
  zone4_min: number | null;
  zone4_max: number | null;
  zone5_min: number | null;
  zone5_max: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  main_goal: string | null;
  goal_deadline: string | null;
  goal_notes: string | null;
  current_weight: number | null;
}

export async function getMemberIndicators(memberId: string): Promise<MemberIndicators | null> {
  const { data, error } = await supabase
    .from("member_indicators")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) throw error;
  return (data as MemberIndicators) || null;
}

export async function upsertMemberIndicators(payload: MemberIndicators): Promise<MemberIndicators> {
  const { data, error } = await supabase
    .from("member_indicators")
    .upsert(payload, { onConflict: "member_id" })
    .select()
    .single();
  if (error) throw error;
  return data as MemberIndicators;
}

export const ZONE_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-sky-500/15", text: "text-sky-500", label: "Récupération" },
  2: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Endurance" },
  3: { bg: "bg-amber-500/15", text: "text-amber-500", label: "Tempo" },
  4: { bg: "bg-orange-500/15", text: "text-orange-500", label: "Seuil" },
  5: { bg: "bg-rose-500/15", text: "text-rose-500", label: "Max" },
};
