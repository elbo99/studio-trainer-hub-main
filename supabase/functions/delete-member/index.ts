import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify they are a coach
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is a coach
    const { data: profile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "coach") {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Seul un coach peut supprimer des membres" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { memberId } = await req.json();

    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "memberId est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for operations that need service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify this member belongs to this coach
    const { data: memberProfile, error: memberError } = await supabaseAdmin
      .from("profiles")
      .select("id, coach_id")
      .eq("id", memberId)
      .single();

    if (memberError || !memberProfile) {
      console.error("Member not found:", memberError);
      return new Response(
        JSON.stringify({ error: "Membre non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (memberProfile.coach_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Ce membre ne vous appartient pas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cleanup storage objects (avatar + chat photos) before user deletion
    console.log("Cleaning storage for member:", memberId);
    try {
      // Avatars: files stored under {memberId}/...
      const { data: avatarFiles } = await supabaseAdmin.storage.from("avatars").list(memberId);
      if (avatarFiles && avatarFiles.length > 0) {
        await supabaseAdmin.storage.from("avatars")
          .remove(avatarFiles.map((f) => `${memberId}/${f.name}`));
      }
      // Chat photos: files stored under {memberId}/...
      const { data: chatFiles } = await supabaseAdmin.storage.from("chat-photos").list(memberId);
      if (chatFiles && chatFiles.length > 0) {
        await supabaseAdmin.storage.from("chat-photos")
          .remove(chatFiles.map((f) => `${memberId}/${f.name}`));
      }
    } catch (storageErr) {
      console.error("Storage cleanup error (non-fatal):", storageErr);
    }

    // Delete auth user — cascades automatically remove profile + all related rows
    // (tasks, daily_task_completions, messages, weekly_objectives, weekly_progress,
    // member_indicators, studio_videos, studio_video_assignments,
    // studio_category_assignments, coach_library_assignments, user_roles)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(memberId);

    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la suppression du membre" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    console.log("Member deleted successfully:", memberId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-member function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur interne est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
