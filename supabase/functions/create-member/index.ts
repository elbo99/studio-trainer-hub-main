import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Admin client for creating users
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the calling user is a coach
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user is a coach
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", callingUser.id)
      .single();

    if (callerProfile?.role !== "coach") {
      return new Response(
        JSON.stringify({ error: "Seul un coach peut créer des membres" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, name } = await req.json();
    const coachId = callingUser.id; // Always use authenticated user's ID

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, mot de passe et nom requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user with admin privileges
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role: "member",
      },
    });

    if (createError) {
      console.error("Create user error:", createError);
      const safeMsg = createError.message?.includes("already been registered")
        ? "Un utilisateur avec cet email existe déjà"
        : "Erreur lors de la création du membre";
      return new Response(
        JSON.stringify({ error: safeMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile to link to the coach
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ coach_id: coachId })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
    }

    // Fire n8n webhook (best-effort, never block response)
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "member.created",
          source: "studio-gym-360",
          triggered_by: coachId,
          timestamp: new Date().toISOString(),
          data: {
            member_id: newUser.user.id,
            email,
            name,
            coach_id: coachId,
          },
        }),
      }).catch((e) => console.warn("n8n webhook failed:", e));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        memberId: newUser.user.id,
        message: `Membre ${name} créé avec succès`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur interne est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
