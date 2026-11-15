import { useState, useEffect } from "react";
import { Home, User, Trophy, MessageCircle, Dumbbell, BookOpen, Activity, CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getUnreadCount } from "@/services/messagesService";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

const memberNavItems = [
  { icon: Home, label: "Accueil", path: "/dashboard" },
  { icon: MessageCircle, label: "Coach", path: "/messages" },
  { icon: Trophy, label: "Progrès", path: "/progress" },
  { icon: Activity, label: "Indicateurs", path: "/indicateurs" },
  { icon: Dumbbell, label: "Studio", path: "/studio" },
  { icon: User, label: "Profil", path: "/profile" },
];

const coachNavItems = [
  { icon: Home, label: "Accueil", path: "/coach" },
  { icon: CalendarDays, label: "Agenda", path: "/agenda" },
  { icon: BookOpen, label: "Biblio", path: "/library" },
  { icon: Dumbbell, label: "Studio", path: "/studio" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profil", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const { notify } = useNotifications();
  const navItems = profile?.role === "coach" ? coachNavItems : memberNavItems;

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    };

    fetchUnread();

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload: any) => {
          fetchUnread();
          notify("Nouveau message", { body: payload.new?.content?.substring(0, 100) || "Vous avez un nouveau message" });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, notify]);

  useEffect(() => {
    if (location.pathname === "/messages") {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around px-0.5 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/messages" && unreadCount > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 min-w-[48px] active:scale-90 transition-transform duration-150"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-secondary-foreground rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    isActive ? "text-secondary-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-secondary-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
