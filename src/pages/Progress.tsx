import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Flame, Calendar, CheckCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Achievements } from "@/components/Achievements";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WeeklyChart } from "@/components/WeeklyChart";
import { useAuth } from "@/hooks/useAuth";
import { getMemberTasks, type TaskWithDetails } from "@/services/tasksService";
import { getWeeklyHistory, getCurrentWeekStart, getWeekLabel } from "@/services/progressService";

const taskTypeIcons: Record<string, string> = {
  swimming: "🏊", cardio: "🏃", strength: "💪", wellness: "🧘", other: "📋",
};

export default function Progress() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<{ week: string; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksData, historyData] = await Promise.all([
        getMemberTasks(user.id),
        getWeeklyHistory(user.id),
      ]);
      setTasks(tasksData);
      setWeeklyHistory(historyData.map(h => ({ week: h.weekLabel, percentage: h.percentage })));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === "coach") { navigate("/coach"); return; }
    if (user) loadData();
  }, [user, profile, navigate, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.status === "done").length;
  const totalGoals = tasks.length;
  const weekProgress = totalGoals > 0 ? (completedCount / totalGoals) * 100 : 0;
  const currentWeekLabel = getWeekLabel(getCurrentWeekStart());
  const streak = weeklyHistory.filter(w => w.percentage >= 50).length;
  const improvement = weeklyHistory.length >= 2 ? weeklyHistory[0].percentage - weeklyHistory[1].percentage : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-5 pt-12 pb-2"
      >
        <h1 className="font-bold text-foreground text-xs">Ma Progression</h1>
        <p className="text-sm text-muted-foreground">Suivez vos performances</p>
      </motion.header>

      <main className="px-5 space-y-4 mt-2">
        {/* Current Week */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{currentWeekLabel}</p>
              <p className="text-3xl font-bold text-foreground">
                {completedCount}<span className="text-muted-foreground font-normal text-xl">/{totalGoals}</span>
              </p>
              <p className="text-primary text-sm font-medium">objectifs</p>
            </div>
            <ProgressRing progress={weekProgress} size={80} strokeWidth={6} />
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4"
          >
            <Flame className="w-6 h-6 text-amber-500 mb-1.5" />
            <p className="text-xl font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground">Semaines actives</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-4"
          >
            <TrendingUp className={`w-6 h-6 mb-1.5 ${improvement >= 0 ? "text-emerald-500" : "text-destructive"}`} />
            <p className="text-xl font-bold text-foreground">
              {improvement >= 0 ? "+" : ""}{improvement}%
            </p>
            <p className="text-xs text-muted-foreground">vs. semaine passée</p>
          </motion.div>
        </div>

        {user && <Achievements memberId={user.id} />}

        {/* Chart */}
        {weeklyHistory.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <WeeklyChart data={weeklyHistory} title="Historique" />
          </motion.div>
        ) : (
          <div className="bg-card rounded-2xl p-6 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">Les stats apparaîtront après la première semaine</p>
          </div>
        )}

        {/* Validated list */}
        {tasks.filter(t => t.status === "done").length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Validés cette semaine
            </h3>
            <div className="space-y-1">
              {tasks.filter(t => t.status === "done").map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2">
                  <span className="text-base">{taskTypeIcons[task.type] || "📋"}</span>
                  <span className="text-sm text-foreground flex-1">{task.title}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
