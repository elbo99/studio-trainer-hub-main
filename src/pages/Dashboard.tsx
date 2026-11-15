import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, MessageSquare, Trophy, Timer, Flame, Target, Calendar, ArrowRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WeekSelector, getCurrentWeekStart } from "@/components/WeekSelector";
import { BottomNav } from "@/components/BottomNav";
import { Confetti } from "@/components/Confetti";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getMemberTasks, updateTaskStatus, addTaskComment, getDailyCompletions, toggleDailyCompletion, type TaskWithDetails, type DailyCompletion } from "@/services/tasksService";
import { updateCurrentWeekProgress } from "@/services/progressService";
import { getWeeklyObjective, type WeeklyObjective } from "@/services/weeklyObjectiveService";
import { getMemberIndicators, type MemberIndicators } from "@/services/indicatorsService";
import { useToast } from "@/hooks/use-toast";
import { CoachCard } from "@/components/CoachCard";
import { SessionView } from "@/components/session/SessionView";



const taskTypeConfig: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  swimming: { icon: "🏊", color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  cardio: { icon: "🏃", color: "text-rose-500", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/20" },
  strength: { icon: "💪", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
  wellness: { icon: "🧘", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  other: { icon: "📋", color: "text-muted-foreground", bgColor: "bg-secondary", borderColor: "border-border" },
};

const SIMPLE_TYPES = ["cardio", "wellness", "swimming"];
const isSimpleType = (type: string) => SIMPLE_TYPES.includes(type);

const intensityLabel = (v: string) =>
  v === "light" ? "Légère" : v === "moderate" ? "Modérée" : v === "intense" ? "Intense" : v === "max" ? "Maximum" : v;
const intensityColor = (v: string) =>
  v === "max" ? "text-destructive bg-destructive/10 border-destructive/20" :
  v === "intense" ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" :
  v === "moderate" ? "text-primary bg-primary/10 border-primary/20" :
  "text-muted-foreground bg-secondary border-border";

const ZONE_META: Record<number, { label: string; cls: string }> = {
  1: { label: "Z1 · Récup", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  2: { label: "Z2 · Endurance", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  3: { label: "Z3 · Tempo", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  4: { label: "Z4 · Seuil", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  5: { label: "Z5 · Max", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

function zoneBpmRange(ind: MemberIndicators | null, zone: number): string | null {
  if (!ind) return null;
  const min = (ind as any)[`zone${zone}_min`];
  const max = (ind as any)[`zone${zone}_max`];
  if (min && max) return `${min}–${max} bpm`;
  if (min) return `≥${min} bpm`;
  if (max) return `≤${max} bpm`;
  return null;
}

function HeartZoneBadge({ zone, indicators }: { zone: number; indicators: MemberIndicators | null }) {
  const meta = ZONE_META[zone];
  if (!meta) return null;
  const bpm = zoneBpmRange(indicators, zone);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${meta.cls}`}>
      ❤️ {meta.label}{bpm ? ` · ${bpm}` : ""}
    </span>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyObjective, setWeeklyObjective] = useState<WeeklyObjective | null>(null);
  const [indicators, setIndicators] = useState<MemberIndicators | null>(null);
  const [assignedProgram, setAssignedProgram] = useState<{ name: string; description: string | null } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const todayStr = new Date().toISOString().split("T")[0];

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const [data, objective, ind] = await Promise.all([
        getMemberTasks(user.id, selectedWeek),
        getWeeklyObjective(user.id, selectedWeek),
        getMemberIndicators(user.id).catch(() => null),
      ]);
      setTasks(data);
      setWeeklyObjective(objective);
      setIndicators(ind);

      // Load assigned program info (refetch from DB so realtime updates reflect immediately)
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("onboarding_program_id")
        .eq("id", user.id)
        .maybeSingle();
      const pid = prof?.onboarding_program_id;
      if (pid) {
        const { data: prog } = await (supabase as any)
          .from("onboarding_programs")
          .select("name, description")
          .eq("id", pid)
          .maybeSingle();
        setAssignedProgram((prog as any) || null);
      } else {
        setAssignedProgram(null);
      }


      const multiFreqTaskIds = data.filter(t => (t.frequency ?? 1) >= 2).map(t => t.id);
      if (multiFreqTaskIds.length > 0) {
        const completions = await getDailyCompletions(multiFreqTaskIds, selectedWeek);
        setDailyCompletions(completions);
      } else {
        setDailyCompletions([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedWeek]);

  useEffect(() => {
    if (profile?.role === "coach") { navigate("/coach"); return; }
    if (user) loadTasks();
  }, [user, profile, navigate, selectedWeek, loadTasks]);

  // Realtime: refresh when my tasks or my profile (program assignment) change
  useEffect(() => {
    if (!user) return;
    let active = true;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!active) return;
      const ch = supabase
        .channel(`member-dashboard-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `member_id=eq.${user.id}` }, () => loadTasks())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => loadTasks())
        .subscribe();
      (window as any).__memberDashboardChannel = ch;
    });
    return () => {
      active = false;
      const ch = (window as any).__memberDashboardChannel;
      if (ch) {
        import("@/integrations/supabase/client").then(({ supabase }) => supabase.removeChannel(ch));
        (window as any).__memberDashboardChannel = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);



  useEffect(() => {
    if (!user || tasks.length === 0) return;
    const isCurrentWeek = selectedWeek === getCurrentWeekStart();
    const regularCompleted = tasks.filter(t => (t.frequency ?? 1) <= 1 && t.status === "done").length;
    const multiFreqCompleted = tasks.filter(t => (t.frequency ?? 1) >= 2).filter(t =>
      dailyCompletions.some(c => c.task_id === t.id && c.completion_date === todayStr)
    ).length;
    const totalCompleted = regularCompleted + multiFreqCompleted;
    if (isCurrentWeek) updateCurrentWeekProgress(user.id, tasks.length, totalCompleted);
    const progress = (totalCompleted / tasks.length) * 100;
    if (progress === 100 && !hasShownConfetti && isCurrentWeek) {
      setShowConfetti(true);
      setHasShownConfetti(true);
      toast({ title: "Semaine complétée 🎉" });
      import("@/services/webhooksService").then(({ emitWebhook }) =>
        emitWebhook("weekly.objective_reached", {
          member_id: user.id,
          week_start: selectedWeek,
          total_tasks: tasks.length,
          completed: totalCompleted,
        })
      );
    }
  }, [tasks, dailyCompletions, user, hasShownConfetti, toast, selectedWeek, todayStr]);

  const isDailyCompletedToday = (taskId: string) => dailyCompletions.some(c => c.task_id === taskId && c.completion_date === todayStr);
  const getDailyCompletionCount = (taskId: string) => dailyCompletions.filter(c => c.task_id === taskId).length;

  const handleToggleDaily = async (taskId: string) => {
    if (!user) return;
    const isCompleted = isDailyCompletedToday(taskId);
    try {
      await toggleDailyCompletion(taskId, user.id, todayStr, isCompleted);
      if (isCompleted) {
        setDailyCompletions(prev => prev.filter(c => !(c.task_id === taskId && c.completion_date === todayStr)));
      } else {
        setDailyCompletions(prev => [...prev, {
          id: crypto.randomUUID(), task_id: taskId, member_id: user.id,
          completion_date: todayStr, status: "done", created_at: new Date().toISOString(),
        }]);
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleStatusChange = async (taskId: string, status: "done" | "not_done") => {
    try {
      await updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!comment.trim()) return;
    try {
      await addTaskComment(taskId, comment);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, member_comment: comment } : t));
      setComment("");
      setCommentingId(null);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAddFollowup = async (taskId: string, text: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("tasks").update({ member_followup: text } as any).eq("id", taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? ({ ...t, member_followup: text } as any) : t));
      toast({ title: "Réponse envoyée" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const dailyTasks = tasks.filter(t => (t.frequency ?? 1) >= 2);
  const regularTasks = tasks.filter(t => (t.frequency ?? 1) <= 1);
  const regularCompletedCount = regularTasks.filter(t => t.status === "done").length;
  const dailyCompletedTodayCount = dailyTasks.filter(t => dailyCompletions.some(c => c.task_id === t.id && c.completion_date === todayStr)).length;
  const totalCompletedCount = regularCompletedCount + dailyCompletedTodayCount;
  const pendingTasks = regularTasks.filter(t => t.status === "pending");
  const completedTasks = regularTasks.filter(t => t.status === "done");
  const notDoneTasks = regularTasks.filter(t => t.status === "not_done");
  const progressPercent = tasks.length > 0 ? Math.round((totalCompletedCount / tasks.length) * 100) : 0;

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-20">
      <Confetti trigger={showConfetti} />

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-12 pb-4 bg-gradient-to-br from-primary/15 via-accent/20 to-background rounded-b-3xl">
        <p className="text-muted-foreground text-sm capitalize">{today}</p>
        <h1 className="font-bold text-foreground text-xs mt-0.5">
          Salut {profile?.name?.split(" ")[0] || ""} 👋
        </h1>

      </motion.header>

      <main className="px-5 space-y-4 mt-4">
        {user && <CoachCard memberId={user.id} variant="full" />}

        {assignedProgram && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 p-4"
          >
            <p className="text-[11px] uppercase tracking-wide font-semibold text-primary flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Mon programme
            </p>
            <p className="text-[15px] font-bold text-foreground mt-1 break-words">{assignedProgram.name}</p>
            {assignedProgram.description && (
              <p className="text-xs text-muted-foreground mt-1 break-words">{assignedProgram.description}</p>
            )}
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Le contenu de ton programme sera bientôt disponible. 
              </p>
            )}
          </motion.div>
        )}

        <WeekSelector weekStart={selectedWeek} onChange={setSelectedWeek} />

        {/* ===== Objectif principal ===== */}
        {indicators?.main_goal && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/25 to-background border border-primary/25 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Mon objectif principal
                </p>
                <p className="text-[15px] font-bold text-foreground leading-snug break-words">
                  {indicators.main_goal}
                </p>
                {indicators.goal_deadline && (
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(indicators.goal_deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {(() => {
                        const d = new Date(indicators.goal_deadline!);
                        const now = new Date();
                        const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff < 0) return `${Math.abs(diff)} jours de retard`;
                        if (diff === 0) return "Aujourd'hui";
                        if (diff === 1) return "Demain";
                        return `${diff} jours restants`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground text-xs">{progressPercent}%</p>
                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  progressPercent >= 75 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                  progressPercent >= 30 ? "bg-primary/15 text-primary" :
                  "bg-destructive/15 text-destructive"
                }`}>
                  {progressPercent >= 75 ? "En avance" : progressPercent >= 30 ? "Dans les temps" : "En retard"}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    progressPercent >= 75 ? "bg-emerald-500" :
                    progressPercent >= 30 ? "bg-primary" :
                    "bg-destructive"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {totalCompletedCount}/{tasks.length} séances validées cette semaine
              </p>
            </div>
          </motion.div>
        )}

        {/* ===== Progression hebdomadaire — secondaire ===== */}
        {tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-4 flex items-center gap-4 border border-border/50"
          >
            <ProgressRing progress={progressPercent} size={52} strokeWidth={5} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Cette semaine</p>
              <p className="text-xs text-muted-foreground">
                {totalCompletedCount}/{tasks.length} séances validées
              </p>
            </div>
            <button
              onClick={() => navigate("/progress")}
              className="flex items-center gap-1 text-xs text-primary font-medium"
            >
              Voir <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {weeklyObjective && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-primary/8 border border-primary/15 rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-primary mb-1">🎯 Objectif de la semaine</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{weeklyObjective.objective}</p>
          </motion.div>
        )}

        {progressPercent === 100 && tasks.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
            <Trophy className="w-7 h-7 text-primary mx-auto mb-1" />
            <p className="font-semibold text-foreground text-sm">Semaine parfaite! 🎉</p>
          </motion.div>
        )}

        {tasks.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Aucun objectif pour le moment.<br />Ton coach ajoutera bientôt tes séances!
            </p>
          </div>
        )}

        {/* Daily tasks */}
        {dailyTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              🔄 Multi-fréquence · {dailyTasks.length}
            </h2>
            <div className="space-y-2">
              {dailyTasks.map((task) => (
                <DailyTaskCard indicators={indicators}
                  key={task.id}
                  task={task}
                  completedToday={isDailyCompletedToday(task.id)}
                  completionCount={getDailyCompletionCount(task.id)}
                  onToggleToday={() => handleToggleDaily(task.id)}
                  dailyCompletions={dailyCompletions.filter(c => c.task_id === task.id)}
                  weekStart={selectedWeek}
                  commentingId={commentingId}
                  setCommentingId={setCommentingId}
                  comment={comment}
                  setComment={setComment}
                  onAddComment={() => handleAddComment(task.id)}
                  onAddFollowup={handleAddFollowup}
                />
              ))}
            </div>
          </section>
        )}

        {pendingTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">À faire · {pendingTasks.length}</h2>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} indicators={indicators}
                  onValidate={() => handleStatusChange(task.id, "done")}
                  onNotDone={() => handleStatusChange(task.id, "not_done")}
                  commentingId={commentingId} setCommentingId={setCommentingId}
                  comment={comment} setComment={setComment} onAddComment={() => handleAddComment(task.id)}
                  onAddFollowup={handleAddFollowup} />
              ))}
            </div>
          </section>
        )}

        {completedTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Validés · {completedTasks.length}
            </h2>
            <div className="space-y-2">
              {completedTasks.map((task) => <TaskCard key={task.id} task={task} indicators={indicators} isCompleted onAddFollowup={handleAddFollowup} />)}
            </div>
          </section>
        )}

        {notDoneTasks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-destructive" /> Non faits · {notDoneTasks.length}
            </h2>
            <div className="space-y-2">
              {notDoneTasks.map((task) => (
                <TaskCard key={task.id} task={task} indicators={indicators} isNotDone onValidate={() => handleStatusChange(task.id, "done")} onAddFollowup={handleAddFollowup} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
    </PageTransition>
  );
}

// ============ EXERCISE ROW (strength/other multi-exercise) ============

function ExerciseRow({ name, sets, rest, intensity, note, heartZone, indicators, index }: {
  name?: string; sets?: string; rest?: string; intensity?: string; note?: string;
  heartZone?: string; indicators?: MemberIndicators | null; index: number;
}) {
  const zone = heartZone && heartZone !== "0" ? Number(heartZone) : null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 py-2.5"
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold shrink-0 mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0 space-y-1">
        {name && <p className="font-semibold text-sm text-foreground leading-tight break-words">{name}</p>}
        <div className="flex flex-wrap gap-1.5">
          {sets && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent text-accent-foreground text-[11px] font-semibold">
              🏋️ {sets}
            </span>
          )}
          {rest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground text-[11px] font-semibold">
              ⏱ {rest}
            </span>
          )}
          {intensity && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${intensityColor(intensity)}`}>
              🔥 {intensityLabel(intensity)}
            </span>
          )}
          {zone && <HeartZoneBadge zone={zone} indicators={indicators ?? null} />}
        </div>
        {note && (
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">💡 {note}</p>
        )}
      </div>
    </motion.div>
  );
}

// ============ TASK CONTENT ============

function TaskContent({ task, indicators }: { task: TaskWithDetails; indicators?: MemberIndicators | null }) {
  if (isSimpleType(task.type)) {
    const config = taskTypeConfig[task.type] || taskTypeConfig.other;
    const zone = (task as any).heart_zone as number | null | undefined;
    return (
      <div className="space-y-2">
        {task.duration && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
            <Timer className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-bold ${config.color}`}>{task.duration}</span>
          </div>
        )}
        {task.description && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              {task.type === "wellness" ? "📋 Programme" : "🎯 Objectif"}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {task.intensity && task.type !== "wellness" && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${intensityColor(task.intensity)}`}>
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{intensityLabel(task.intensity)}</span>
            </div>
          )}
          {zone && zone > 0 && <HeartZoneBadge zone={zone} indicators={indicators ?? null} />}
        </div>
      </div>
    );
  }

  const names = task.duration?.split(" | ") || [];
  const sets = task.sets_reps?.split(" | ") || [];
  const rests = (task as any).rest?.split(" | ") || [];
  const intensities = task.intensity?.split(" | ") || [];
  const exNotes = (task as any).exercise_notes?.split(" | ") || [];
  const heartZones = (task as any).heart_zones?.split(" | ") || [];
  const maxLen = Math.max(names.length, sets.length, rests.length, intensities.length, exNotes.length);

  if (maxLen === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: maxLen }).map((_, i) => (
        <ExerciseRow
          key={i}
          index={i}
          name={names[i]}
          sets={sets[i]}
          rest={rests[i]}
          intensity={intensities[i]}
          note={exNotes[i]}
          heartZone={heartZones[i]}
          indicators={indicators}
        />
      ))}
    </div>
  );
}

// ============ COACH NOTE BUBBLE ============

function CoachNote({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15 rounded-2xl p-3.5"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-sm">🗣</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary/60 mb-1">Coach</p>
          <p className="text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============ COMMENT THREAD ============

function CommentThread({ task, commentingId, setCommentingId, comment, setComment, onAddComment, onAddFollowup }: {
  task: TaskWithDetails;
  commentingId?: string | null;
  setCommentingId?: (id: string | null) => void;
  comment?: string;
  setComment?: (c: string) => void;
  onAddComment?: () => void;
  onAddFollowup?: (taskId: string, text: string) => Promise<void>;
}) {
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupText, setFollowupText] = useState((task as any).member_followup || "");
  const coachReply = (task as any).coach_reply as string | undefined;
  const memberFollowup = (task as any).member_followup as string | undefined;

  return (
    <>
      {task.member_comment && (
        <div className="space-y-2">
          <div className="bg-accent/50 rounded-xl p-3">
            <p className="text-[11px] text-accent-foreground/60 mb-1 font-medium">💬 Mon commentaire</p>
            <p className="text-sm text-foreground">{task.member_comment}</p>
          </div>
          {coachReply && (
            <div className="bg-secondary/50 rounded-xl p-3 ml-4 border-l-2 border-primary/30">
              <p className="text-[11px] text-muted-foreground mb-1 font-medium">💬 Réponse du coach</p>
              <p className="text-sm text-foreground">{coachReply}</p>
            </div>
          )}
          {memberFollowup && (
            <div className="bg-accent/50 rounded-xl p-3 ml-8">
              <p className="text-[11px] text-accent-foreground/60 mb-1 font-medium">💬 Ma réponse</p>
              <p className="text-sm text-foreground">{memberFollowup}</p>
            </div>
          )}
          {coachReply && !memberFollowup && onAddFollowup && (
            followupOpen ? (
              <div className="ml-8 space-y-2">
                <Textarea
                  value={followupText}
                  onChange={(e) => setFollowupText(e.target.value)}
                  placeholder="Répondre au coach..."
                  className="bg-secondary border-0 rounded-xl resize-none text-sm min-h-[50px]"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={!followupText.trim()} onClick={async () => {
                    await onAddFollowup(task.id, followupText.trim());
                    setFollowupOpen(false);
                  }} className="rounded-xl flex-1">Envoyer</Button>
                  <Button size="sm" variant="ghost" onClick={() => setFollowupOpen(false)} className="rounded-xl">Annuler</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setFollowupOpen(true)}
                className="ml-8 flex items-center gap-1.5 text-xs text-primary hover:underline py-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Répondre au coach</span>
              </button>
            )
          )}
        </div>
      )}

      {commentingId === task.id ? (
        <div className="space-y-2">
          <Textarea
            value={comment || ""}
            onChange={(e) => setComment?.(e.target.value)}
            placeholder="Un retour sur cette séance..."
            className="bg-secondary border-0 rounded-xl resize-none text-sm min-h-[60px]"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onAddComment} className="rounded-xl flex-1">Envoyer</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCommentingId?.(null); setComment?.(""); }} className="rounded-xl">Annuler</Button>
          </div>
        </div>
      ) : (
        !task.member_comment && setCommentingId && (
          <button
            onClick={() => setCommentingId(task.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ajouter un commentaire</span>
          </button>
        )
      )}
    </>
  );
}

// ============ TASK CARD ============

interface TaskCardProps {
  task: TaskWithDetails;
  isCompleted?: boolean;
  isNotDone?: boolean;
  onValidate?: () => void;
  onNotDone?: () => void;
  commentingId?: string | null;
  setCommentingId?: (id: string | null) => void;
  comment?: string;
  setComment?: (c: string) => void;
  onAddComment?: () => void;
  onAddFollowup?: (taskId: string, text: string) => Promise<void>;
  indicators?: MemberIndicators | null;
}

function TaskCard({
  task, isCompleted, isNotDone, onValidate, onNotDone,
  commentingId, setCommentingId, comment, setComment, onAddComment, onAddFollowup, indicators,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = taskTypeConfig[task.type] || taskTypeConfig.other;

  // Quick info line under title
  const quickInfo = isSimpleType(task.type)
    ? [task.duration, task.intensity && task.type !== "wellness" ? `🔥 ${intensityLabel(task.intensity)}` : null].filter(Boolean).join(" · ")
    : task.description || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl overflow-hidden transition-all duration-200 ${
        isCompleted ? "opacity-50" : isNotDone ? "border border-destructive/20" : "active:scale-[0.98]"
      }`}
    >
      {/* Header row */}
      <button
        onClick={() => !isCompleted && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Type icon */}
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${config.bgColor} border ${config.borderColor} transition-transform ${expanded ? "scale-110" : ""}`}>
          <span className="text-xl">{config.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-[15px] leading-snug break-words ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </h3>
          {!expanded && quickInfo && (
            <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-1">{quickInfo}</p>
          )}
        </div>

        {/* Status indicator */}
        {isCompleted && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
          </motion.div>
        )}
        {!isCompleted && !expanded && (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <span className="text-muted-foreground text-xs">▸</span>
          </motion.div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && !isCompleted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <SessionView task={task} />

              <CommentThread
                task={task}
                commentingId={commentingId}
                setCommentingId={setCommentingId}
                comment={comment}
                setComment={setComment}
                onAddComment={onAddComment}
                onAddFollowup={onAddFollowup}
              />

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {onValidate && (
                  <motion.div className="flex-1" whileTap={{ scale: 0.93 }}>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onValidate(); }}
                      className="rounded-xl w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> C'est fait ! ✓
                    </Button>
                  </motion.div>
                )}
                {onNotDone && !isNotDone && (
                  <motion.div whileTap={{ scale: 0.93 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); onNotDone(); }}
                      className="rounded-xl border-destructive/30 text-destructive"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ DAILY TASK CARD ============

interface DailyTaskCardProps {
  task: TaskWithDetails;
  completedToday: boolean;
  completionCount: number;
  onToggleToday: () => void;
  dailyCompletions: DailyCompletion[];
  weekStart: string;
  commentingId?: string | null;
  setCommentingId?: (id: string | null) => void;
  comment?: string;
  setComment?: (c: string) => void;
  onAddComment?: () => void;
  onAddFollowup?: (taskId: string, text: string) => Promise<void>;
  indicators?: MemberIndicators | null;
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function DailyTaskCard({
  task, completedToday, completionCount, onToggleToday, dailyCompletions, weekStart,
  commentingId, setCommentingId, comment, setComment, onAddComment, onAddFollowup, indicators,
}: DailyTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = taskTypeConfig[task.type] || taskTypeConfig.other;
  const freq = task.frequency ?? 7;
  const progress = Math.min((completionCount / freq) * 100, 100);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${config.bgColor} border ${config.borderColor}`}>
            <span className="text-xl">{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] leading-snug break-words text-foreground">{task.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completionCount}/{freq} cette semaine
            </p>
          </div>
          {completionCount >= freq && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
              <span className="text-xl">🏆</span>
            </motion.div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : "bg-primary"}`}
          />
        </div>

        {/* Day dots */}
        <div className="flex items-center justify-between">
          {weekDays.map((day, i) => {
            const isDone = dailyCompletions.some(c => c.completion_date === day);
            const isToday = day === todayStr;
            const isFuture = day > todayStr;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground/60"}`}>
                  {DAY_LABELS[i]}
                </span>
                <motion.div
                  whileTap={isToday ? { scale: 0.85 } : {}}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all ${
                    isDone
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                      : isToday
                      ? "border-2 border-primary bg-primary/10 text-primary"
                      : isFuture
                      ? "bg-secondary/30 text-muted-foreground/30"
                      : "bg-secondary text-muted-foreground/50"
                  }`}
                >
                  {isDone ? "✓" : isToday ? "●" : ""}
                </motion.div>
              </div>
            );
          })}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <SessionView task={task} />

              <CommentThread
                task={task}
                commentingId={commentingId}
                setCommentingId={setCommentingId}
                comment={comment}
                setComment={setComment}
                onAddComment={onAddComment}
                onAddFollowup={onAddFollowup}
              />

              <motion.div whileTap={{ scale: 0.93 }}>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onToggleToday(); }}
                  className={`rounded-xl w-full shadow-sm transition-all ${
                    completedToday
                      ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border shadow-none"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  }`}
                  variant={completedToday ? "outline" : "default"}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {completedToday ? "Fait aujourd'hui ✓" : "Valider aujourd'hui"}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
