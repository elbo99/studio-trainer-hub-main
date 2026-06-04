import { supabase } from "@/integrations/supabase/client";

type WebhookEvent =
  | "member.created"
  | "session.completed"
  | "message.sent"
  | "weekly.objective_reached";

/**
 * Fire-and-forget emission of an event to the n8n webhook
 * via the `n8n-emit` edge function. Never throws — webhook
 * failures must not break user-facing actions.
 */
export async function emitWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke("n8n-emit", {
      body: { event, data },
    });
  } catch (e) {
    console.warn("[webhook] emit failed", event, e);
  }
}
