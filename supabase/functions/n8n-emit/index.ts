import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allowed event types — keep strict to avoid noise
const ALLOWED_EVENTS = new Set([
  "member.created",
  "session.completed",
  "message.sent",
  "weekly.objective_reached",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (!webhookUrl) {
      console.warn("N8N_WEBHOOK_URL not configured — skipping");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: require a valid Supabase user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const { event, data } = body as { event?: string; data?: unknown };

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return new Response(JSON.stringify({ error: "Invalid event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      event,
      source: "studio-gym-360",
      triggered_by: userId,
      timestamp: new Date().toISOString(),
      data: data ?? {},
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.warn("n8n webhook non-ok (skipped):", res.status, text);
      // Soft-skip: don't break the app if n8n workflow is missing/inactive
      return new Response(
        JSON.stringify({ skipped: true, status: res.status }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("n8n-emit error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
