import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, CheckCircle2, Flame, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type BadgeTier = "Bronze" | "Argent" | "Or" | "Platine";

interface Stats {
  totalDone: number;
  streak: number;
  assiduity: number;
  badge: BadgeTier;
}

const BADGE_STYLES: Record<BadgeTier, { gradient: string; text: string; ring: string }> = {
  Bronze:  { gradient: "from-amber-700 to-amber-500", text: "text-amber-100", ring: "ring-amber-500/30" },
  Argent:  { gradient: "from-slate-400 to-slate-200", text: "text-slate-900", ring: "ring-slate-400/40" },
  Or:      { gradient: "from-yellow-500 to-amber-300", text: "text-amber-950", ring: "ring-yellow-400/40" },
  Platine: { gradient: "from-cyan-300 via-sky-200 to-indigo-300", text: "text-slate-900", ring: "ring-sky-300/50" },
};

function computeBadge(totalDone: number, assiduity: number): BadgeTier {
  if (totalDone >= 60 && assiduity >= 85) return "Platine";
  if (totalDone >= 30 && assiduity >= 70) return "Or";
  if (totalDone >= 10 && assiduity >= 50) return "Argent";
  return "Bronze";
}

function computeStreak(weeks: { week_start: string; percentage: number }[]): number {
  // weeks sorted desc by week_start. Streak = consecutive weeks with >=50%
  let s = 0;
  for (const w of weeks) {
    if (w.percentage >= 50) s++;
    else break;
  }
  return s;
}

export function Achievements({ memberId, compact = false }: { memberId: string; compact?: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      const [{ count: totalDone }, { data: weeks }] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true })
          .eq("member_id", memberId).eq("status", "done"),
        supabase.from("weekly_progress").select("week_start,percentage")
          .eq("member_id", memberId).order("week_start", { ascending: false }).limit(52),
      ]);
      const w = weeks || [];
      const assiduity = w.length > 0
        ? Math.round(w.reduce((a, b) => a + (b.percentage || 0), 0) / w.length)
        : 0;
      const td = totalDone || 0;
      setStats({
        totalDone: td,
        streak: computeStreak(w),
        assiduity,
        badge: computeBadge(td, assiduity),
      });
    })();
  }, [memberId]);

  if (!stats) return null;
  const style = BADGE_STYLES[stats.badge];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Mes réussites</h3>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center ring-4 ${style.ring} shrink-0`}>
          <Trophy className={`w-7 h-7 ${style.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Badge actuel</p>
          <p className="text-lg font-bold text-foreground">{stats.badge}</p>
          <p className="text-[11px] text-muted-foreground break-words">
            {stats.badge === "Platine" ? "Niveau maximal atteint" :
             stats.badge === "Or" ? "Prochain palier : Platine (60 séances · 85%)" :
             stats.badge === "Argent" ? "Prochain palier : Or (30 séances · 70%)" :
             "Prochain palier : Argent (10 séances · 50%)"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-3"} gap-2`}>
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-base font-bold text-foreground">{stats.totalDone}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Séances validées</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-base font-bold text-foreground">{stats.streak}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Semaines d'affilée</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <Target className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-base font-bold text-foreground">{stats.assiduity}%</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Assiduité globale</p>
        </div>
      </div>
    </motion.section>
  );
}
