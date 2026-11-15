import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeFreeSlots,
  formatLocal,
  STUDIO_OPENING_HOURS,
  STUDIO_TIMEZONE,
} from "../_shared/agenda.ts";

const MAX_AGENDA_RANGE_DAYS = 62;

function parseRange(url: URL): { from: Date; to: Date } | { error: string } {
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  if (!fromRaw || !toRaw) return { error: "from and to (ISO 8601) are required" };
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return { error: "from/to must be valid ISO 8601 dates" };
  if (to.getTime() <= from.getTime()) return { error: "to must be after from" };
  if (to.getTime() - from.getTime() > MAX_AGENDA_RANGE_DAYS * 24 * 3600_000) {
    return { error: `range too large (max ${MAX_AGENDA_RANGE_DAYS} days)` };
  }
  return { from, to };
}

const firstName = (name?: string | null) => (name ? name.trim().split(/\s+/)[0] : null);

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
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
            "GET /api/agenda?from=ISO&to=ISO[&coach_id=]",
            "GET /api/agenda/free?from=ISO&to=ISO[&duration=60][&coach_id=]",
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

      case "agenda": {
        if (id && id !== "free") return json({ error: "Unknown resource" }, 404);
        const range = parseRange(url);
        if ("error" in range) return json({ error: range.error }, 400);
        const coachId = url.searchParams.get("coach_id");
        if (coachId && !uuidRe.test(coachId)) return json({ error: "coach_id must be a uuid" }, 400);

        // Rendez-vous non annulés qui recoupent [from, to)
        let q = supabase
          .from("appointments")
          .select("id, coach_id, type, title, starts_at, ends_at, member:profiles!appointments_member_id_fkey(name)")
          .neq("status", "annule")
          .lt("starts_at", range.to.toISOString())
          .gt("ends_at", range.from.toISOString())
          .order("starts_at", { ascending: true })
          .limit(1000);
        if (coachId) q = q.eq("coach_id", coachId);
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data ?? []) as any[];

        if (id === "free") {
          const durationRaw = url.searchParams.get("duration") ?? "60";
          const duration = Number(durationRaw);
          if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
            return json({ error: "duration must be an integer between 15 and 480 (minutes)" }, 400);
          }
          // Pas de créneau dans le passé
          const from = new Date(Math.max(range.from.getTime(), Date.now()));
          const free = computeFreeSlots({
            from,
            to: range.to,
            durationMinutes: duration,
            busy: rows.map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) })),
          });
          return json({
            timezone: STUDIO_TIMEZONE,
            from: from.toISOString(),
            to: range.to.toISOString(),
            duration_minutes: duration,
            coach_id: coachId,
            opening_hours: STUDIO_OPENING_HOURS,
            count: free.length,
            data: free,
          });
        }

        return json({
          timezone: STUDIO_TIMEZONE,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          count: rows.length,
          data: rows.map((r) => ({
            id: r.id,
            coach_id: r.coach_id,
            start: r.starts_at,
            end: r.ends_at,
            start_local: formatLocal(new Date(r.starts_at), STUDIO_TIMEZONE),
            end_local: formatLocal(new Date(r.ends_at), STUDIO_TIMEZONE),
            type: r.type,
            title: r.title,
            member_first_name: firstName(r.member?.name),
          })),
        });
      }

      default:
        return json({ error: "Unknown resource" }, 404);
    }
  } catch (e) {
    console.error("api error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
