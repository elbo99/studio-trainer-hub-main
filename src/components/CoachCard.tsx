import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Clock, Sparkles } from "lucide-react";
import { getCoachStats, formatResponseDelay, type CoachStats } from "@/services/coachService";

interface Props {
  memberId: string;
  variant?: "full" | "compact";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function CoachCard({ memberId, variant = "full" }: Props) {
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getCoachStats(memberId)
      .then(s => { if (alive) setStats(s); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [memberId]);

  if (loading || !stats?.coach) return null;
  const { coach, lastReceivedMessage, avgResponseMinutes } = stats;
  const initial = coach.name?.charAt(0).toUpperCase() ?? "C";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/15 to-background p-4"
    >
      <div className="flex items-start gap-3">
        {coach.avatar_url ? (
          <img
            src={coach.avatar_url}
            alt={coach.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/30 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/30 shrink-0">
            <span className="text-xl font-bold text-primary">{initial}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-primary flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Votre coach
          </p>
          <h3 className="text-sm font-bold text-foreground truncate">{coach.name}</h3>
        </div>
      </div>

      {variant === "full" && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Réponse moyenne :</span>
          <span className="font-semibold text-foreground">
            {formatResponseDelay(avgResponseMinutes)}
          </span>
        </div>
      )}

      {variant === "full" && lastReceivedMessage && (
        <div className="mt-3 rounded-xl bg-card/70 backdrop-blur p-3 border border-border">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
            Dernier message
          </p>
          <p className="text-xs text-foreground line-clamp-2 break-words">
            {lastReceivedMessage.content || (lastReceivedMessage.image_url ? "📷 Photo" : "")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {timeAgo(lastReceivedMessage.created_at)}
          </p>
        </div>
      )}

      <button
        onClick={() => navigate("/messages")}
        className="mt-3 w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <MessageCircle className="w-4 h-4" />
        Envoyer un message à {coach.name}
      </button>
    </motion.div>
  );
}
