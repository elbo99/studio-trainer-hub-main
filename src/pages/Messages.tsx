import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MessageThread, type Message } from "@/components/MessageThread";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { getMemberMessages, sendMessage, markMessagesAsRead, setMessageReadStatus } from "@/services/messagesService";
import { getMemberCoach, getCoachMembers } from "@/services/membersService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoachConv {
  id: string;
  name: string;
  avatarUrl: string | null;
  unread: number;
  lastAt?: string | null;
  lastContent?: string | null;
}

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachConvs, setCoachConvs] = useState<CoachConv[]>([]);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const isCoach = profile?.role === "coach";

  const loadCoachConversations = useCallback(async () => {
    if (!user) return;
    try {
      const members = await getCoachMembers(user.id);
      const memberIds = members.map(m => m.id);

      // Unread per member (sender)
      const { data: unread } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      const unreadMap: Record<string, number> = {};
      (unread || []).forEach(m => { unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1; });

      // Last message per member (either direction)
      const lastMap: Record<string, { at: string; content: string }> = {};
      if (memberIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("sender_id, receiver_id, content, created_at")
          .or(`sender_id.in.(${memberIds.join(",")}),receiver_id.in.(${memberIds.join(",")})`)
          .order("created_at", { ascending: false })
          .limit(500);
        (lastMsgs || []).forEach(m => {
          const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          if (!lastMap[otherId]) lastMap[otherId] = { at: m.created_at, content: m.content };
        });
      }

      const convs: CoachConv[] = members
        .map(m => ({
          id: m.id,
          name: m.name,
          avatarUrl: (m as any).avatar_url ?? null,
          unread: unreadMap[m.id] || 0,
          lastAt: lastMap[m.id]?.at || null,
          lastContent: lastMap[m.id]?.content || null,
        }))
        .sort((a, b) => {
          if (a.unread !== b.unread) return b.unread - a.unread;
          const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
          const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
          return tb - ta;
        });
      setCoachConvs(convs);
    } catch (e) {
      console.error("Error loading coach conversations:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    try {
      const coach = await getMemberCoach(user.id);
      if (coach) {
        setCoachId(coach.id);
        setCoachName(coach.name);
        await markMessagesAsRead(user.id, coach.id);
      }
      const msgs = await getMemberMessages(user.id);
      setMessages(msgs.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.senderName || "Inconnu",
        content: m.content,
        timestamp: m.created_at,
        isCoach: m.isCoach || false,
        isRead: m.is_read,
        imageUrl: (m as any).image_url ?? null,
      })));
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    if (isCoach) loadCoachConversations();
    else loadMessages();
  }, [user, profile, isCoach, loadCoachConversations, loadMessages]);

  // Realtime refresh for coach conversation list
  useEffect(() => {
    if (!user || !isCoach) return;
    const channel = supabase
      .channel('coach-convs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadCoachConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isCoach, loadCoachConversations]);

  useEffect(() => {
    if (!user || !coachId || isCoach) return;
    const channel = supabase
      .channel('member-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const newMsg = payload.new as { id: string; sender_id: string; content: string; created_at: string; image_url: string | null };
          setMessages(prev => [...prev, {
            id: newMsg.id, senderId: newMsg.sender_id, senderName: coachName || "Coach",
            content: newMsg.content, timestamp: newMsg.created_at, isCoach: true,
            imageUrl: newMsg.image_url,
          }]);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, coachId, coachName, isCoach]);

  const handleSendMessage = async (content: string, imageUrl?: string | null) => {
    if (!user || !coachId) {
      toast({ title: "Aucun coach assigné", variant: "destructive" });
      return;
    }
    try {
      await sendMessage(user.id, coachId, content, imageUrl);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), senderId: user.id,
        senderName: profile?.name || "Moi", content,
        timestamp: new Date().toISOString(), isCoach: false,
        imageUrl: imageUrl ?? null,
      }]);
    } catch {
      toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
    }
  };

  const formatRelative = (iso?: string | null) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isCoach) {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-12 pb-3">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground">Vos conversations avec les membres</p>
        </motion.header>

        <main className="px-4 space-y-2">
          {coachConvs.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Aucun membre pour le moment</p>
            </div>
          ) : (
            coachConvs.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/member/${c.id}?tab=messages`)}
                className="w-full bg-card rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <UserAvatar name={c.name} avatarUrl={c.avatarUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm break-words">{c.name}</h3>
                    {c.lastAt && <span className="text-[10px] text-muted-foreground shrink-0">{formatRelative(c.lastAt)}</span>}
                  </div>
                  <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                    {c.lastContent || "Démarrer la conversation"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {c.unread}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))
          )}
        </main>

        <BottomNav />
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background flex flex-col">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-5 pt-12 pb-3 flex-shrink-0"
      >
        <h1 className="text-xl font-bold text-foreground">
          {coachName ? `Coach ${coachName}` : "Mon Coach"}
        </h1>
        <p className="text-xs text-muted-foreground">Discutez avec votre entraîneur</p>
      </motion.header>

      <main className="flex-1 px-4 pb-20 overflow-hidden">
        {!coachId ? (
          <div className="bg-card rounded-2xl p-6 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-foreground mb-1">Pas de coach assigné</h3>
            <p className="text-sm text-muted-foreground">
              Vous devez être assigné à un coach pour communiquer
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl h-full overflow-hidden flex flex-col">
            <MessageThread
              messages={messages}
              currentUserId={user?.id || ""}
              onSendMessage={handleSendMessage}
              onToggleRead={async (mid, next) => {
                try {
                  await setMessageReadStatus(mid, next);
                  setMessages(prev => prev.map(m => m.id === mid ? { ...m, isRead: next } : m));
                } catch { /* noop */ }
              }}
              placeholder="Écrire à votre coach..."
            />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
