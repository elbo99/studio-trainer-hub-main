import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const coachId = body?.coachId as string | undefined;
    const finalize = body?.finalize === true;

    let resolvedCoachId: string | null = null;
    if (typeof coachId === "string" && coachId) {
      const { data: coachProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", coachId)
        .eq("role", "coach")
        .maybeSingle();
      if (coachProfile) resolvedCoachId = coachProfile.id;
    }

    if (!resolvedCoachId) {
      const { data: firstCoach } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "coach")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstCoach) resolvedCoachId = firstCoach.id;
    }

    if (!resolvedCoachId) {
      return new Response(JSON.stringify({ error: "Aucun coach disponible" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = { coach_id: resolvedCoachId };
    if (finalize) updates.onboarding_completed_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .eq("role", "member");

    if (updateError) {
      console.error("assign-coach update error:", updateError);
      return new Response(JSON.stringify({ error: "Erreur lors de l'assignation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, coachId: resolvedCoachId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("assign-coach error:", e);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
