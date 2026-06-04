import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { emitWebhook } from "./webhooksService";

type Message = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export interface MessageWithDetails extends Message {
  senderName?: string;
  isCoach?: boolean;
}

// Get messages between two users
export async function getConversation(userId1: string, userId2: string): Promise<MessageWithDetails[]> {
  // Use two separate queries to avoid string interpolation in filters
  const selectFields = `
    *,
    sender:profiles!messages_sender_id_fkey(name, role)
  `;

  const [res1, res2] = await Promise.all([
    supabase
      .from("messages")
      .select(selectFields)
      .eq("sender_id", userId1)
      .eq("receiver_id", userId2)
      .order("created_at", { ascending: true }),
    supabase
      .from("messages")
      .select(selectFields)
      .eq("sender_id", userId2)
      .eq("receiver_id", userId1)
      .order("created_at", { ascending: true }),
  ]);

  if (res1.error) throw res1.error;
  if (res2.error) throw res2.error;

  const data = [...(res1.data || []), ...(res2.data || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );



  return (data || []).map(msg => ({
    ...msg,
    senderName: (msg.sender as { name: string; role: string })?.name,
    isCoach: (msg.sender as { name: string; role: string })?.role === "coach",
  }));
}

// Get messages for a member (with their coach)
export async function getMemberMessages(memberId: string): Promise<MessageWithDetails[]> {
  // First get the coach_id for this member
  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!profile?.coach_id) return [];

  return getConversation(memberId, profile.coach_id);
}

// Send a message (optionally with an image)
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  imageUrl?: string | null
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      image_url: imageUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Fire n8n webhook (non-blocking)
  emitWebhook("message.sent", {
    message_id: data.id,
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    image_url: imageUrl ?? null,
    created_at: data.created_at,
  });

  return data;
}

// Mark messages as read
export async function markMessagesAsRead(receiverId: string, senderId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", receiverId)
    .eq("sender_id", senderId)
    .eq("is_read", false);

  if (error) throw error;
}

// Toggle a single message between read/unread (only the receiver can change this)
export async function setMessageReadStatus(messageId: string, isRead: boolean): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: isRead })
    .eq("id", messageId);

  if (error) throw error;
}

// Get unread messages count
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}
