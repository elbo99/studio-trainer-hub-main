import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Bearer token auth ---
  const expected = Deno.env.get("API_BEARER_TOKEN");
  if (!expected) return json({ error: "API not configured" }, 500);

  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  // path is like /api/users or /api/tasks
  const segments = url.pathname.split("/").filter(Boolean);
  // remove leading "api" segment (from the function name)
  if (segments[0] === "api") segments.shift();
  const [resource, id] = segments;

  try {
    switch (resource) {
      case undefined:
      case "":
        return json({
          name: "Studio Gym 360 API",
          version: "1.0",
          endpoints: [
            "GET /api/users",
            "GET /api/users/:id",
            "GET /api/tasks?member_id=",
            "GET /api/programs",
            "GET /api/messages?user_id=",
            "GET /api/weekly-progress?member_id=",
          ],
        });

      case "users": {
        if (id) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, name, email, role, coach_id, created_at")
            .eq("id", id)
            .maybeSingle();
          if (error) throw error;
          if (!data) return json({ error: "Not found" }, 404);
          return json(data);
        }
        const role = url.searchParams.get("role");
        const coachId = url.searchParams.get("coach_id");
        let q = supabase
          .from("profiles")
          .select("id, name, email, role, coach_id, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (role) q = q.eq("role", role);
        if (coachId) q = q.eq("coach_id", coachId);
        const { data, error } = await q;
        if (error) throw error;
        return json({ count: data?.length ?? 0, data });
      }

      case "tasks": {
        const memberId = url.searchParams.get("member_id");
        const weekStart = url.searchParams.get("week_start");
        const status = url.searchParams.get("status");
        let q = supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(500);
        if (memberId) q = q.eq("member_id", memberId);
        if (weekStart) q = q.eq("week_start", weekStart);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) throw error;
        return json({ count: data?.length ?? 0, data });
      }

      case "programs": {
        const coachId = url.searchParams.get("coach_id");
        let q = supabase
          .from("coach_library_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (coachId) q = q.eq("coach_id", coachId);
        const { data, error } = await q;
        if (error) throw error;
        return json({ count: data?.length ?? 0, data });
      }

      case "messages": {
        const userId = url.searchParams.get("user_id");
        if (!userId) return json({ error: "user_id is required" }, 400);
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ count: data?.length ?? 0, data });
      }

      case "weekly-progress": {
        const memberId = url.searchParams.get("member_id");
        let q = supabase.from("weekly_progress").select("*").order("week_start", { ascending: false }).limit(200);
        if (memberId) q = q.eq("member_id", memberId);
        const { data, error } = await q;
        if (error) throw error;
        return json({ count: data?.length ?? 0, data });
      }

      default:
        return json({ error: "Unknown resource" }, 404);
    }
  } catch (e) {
    console.error("api error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
