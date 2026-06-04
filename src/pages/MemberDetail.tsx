import { useState, useEffect, useCallback } from "react";
import { Reply } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit3, Save, X, MessageSquare, BarChart3, Target, Copy, BookmarkPlus, BookOpen, Loader2, Send } from "lucide-react";
import { WeekSelector, getCurrentWeekStart } from "@/components/WeekSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageThread, type Message } from "@/components/MessageThread";
import { WeeklyChart } from "@/components/WeeklyChart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMemberData, deleteMember, type MemberWithTasks } from "@/services/membersService";
import { createTask, updateTask, deleteTask, type TaskWithDetails } from "@/services/tasksService";
import { getConversation, sendMessage, markMessagesAsRead, setMessageReadStatus } from "@/services/messagesService";
import { getWeeklyHistory } from "@/services/progressService";
import { getWeeklyObjective, upsertWeeklyObjective, deleteWeeklyObjective, type WeeklyObjective } from "@/services/weeklyObjectiveService";
import { createLibrarySession, getCoachLibrarySessions, assignSessionAsObjective, type LibrarySession } from "@/services/libraryService";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const taskTypeLabels: Record<string, string> = {
  swimming: "🏊 Natation",
  cardio: "🏃 Cardio",
  strength: "💪 Musculation",
  wellness: "🧘 Bien-être",
  other: "📋 Autre",
};

const statusLabels = {
  pending: { label: "En attente", class: "bg-amber-500/20 text-amber-500" },
  done: { label: "Validé", class: "bg-emerald-500/20 text-emerald-500" },
  not_done: { label: "Non fait", class: "bg-destructive/20 text-destructive" },
};

type TaskType = "swimming" | "cardio" | "strength" | "wellness" | "other";

// Types that use simple fields (duration, objective, global intensity) instead of multi-exercise rows
const SIMPLE_TYPES: TaskType[] = ["cardio", "wellness", "swimming"];
const isSimpleType = (type: string) => SIMPLE_TYPES.includes(type as TaskType);

function CoachReplyInput({ taskId, existingReply, onSave }: { taskId: string; existingReply: string; onSave: (taskId: string, reply: string) => Promise<void> }) {
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState(existingReply);

  if (!isReplying && !existingReply) {
    return (
      <button
        onClick={() => setIsReplying(true)}
        className="flex items-center gap-1 text-xs text-primary hover:underline ml-4"
      >
        <Reply className="w-3 h-3" />
        Répondre
      </button>
    );
  }

  if (!isReplying) return null;

  return (
    <div className="ml-4 flex gap-2 items-end">
      <Textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Votre réponse..."
        className="flex-1 bg-secondary border-0 rounded-xl resize-none text-sm min-h-[36px]"
        rows={1}
      />
      <Button
        size="sm"
        className="rounded-xl"
        disabled={!reply.trim()}
        onClick={async () => {
          await onSave(taskId, reply.trim());
          setIsReplying(false);
        }}
      >
        <Reply className="w-3.5 h-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="rounded-xl px-2" onClick={() => { setIsReplying(false); setReply(existingReply); }}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ---- Simple type form fields (Cardio / Wellness / Swimming) ----
function SimpleTypeFields({
  type,
  duration,
  setDuration,
  objective,
  setObjective,
  intensity,
  setIntensity,
  heartZone,
  setHeartZone,
}: {
  type: TaskType;
  duration: string;
  setDuration: (v: string) => void;
  objective: string;
  setObjective: (v: string) => void;
  intensity: string;
  setIntensity: (v: string) => void;
  heartZone: string;
  setHeartZone: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm text-muted-foreground">
          {type === "wellness" ? "⏱ Durée de la séance" : "⏱ Durée totale"}
        </Label>
        <Input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder={type === "wellness" ? "Ex: 45 min" : "Ex: 30 min, 1h"}
          className="mt-1 bg-secondary border-0 rounded-xl"
        />
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">
          {type === "wellness" ? "📋 Ce qu'il doit faire" : "🎯 Objectif de la séance"}
        </Label>
        <Textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder={
            type === "wellness"
              ? "Ex: Étirements complets du corps, focus sur les hanches et les épaules"
              : type === "cardio"
              ? "Ex: Maintenir 140-155 BPM pendant 25 min"
              : "Ex: Travail technique crawl + endurance"
          }
          className="mt-1 bg-secondary border-0 rounded-xl resize-none text-sm"
          rows={2}
        />
      </div>

      {type !== "wellness" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-muted-foreground">🔥 Intensité</Label>
            <Select value={intensity} onValueChange={setIntensity}>
              <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Légère</SelectItem>
                <SelectItem value="moderate">Modérée</SelectItem>
                <SelectItem value="intense">Intense</SelectItem>
                <SelectItem value="max">Maximale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">❤️ Zone cardiaque</Label>
            <Select value={heartZone} onValueChange={setHeartZone}>
              <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Aucune</SelectItem>
                <SelectItem value="1">Zone 1 — Récupération</SelectItem>
                <SelectItem value="2">Zone 2 — Endurance</SelectItem>
                <SelectItem value="3">Zone 3 — Tempo</SelectItem>
                <SelectItem value="4">Zone 4 — Seuil</SelectItem>
                <SelectItem value="5">Zone 5 — Max</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}


export default function MemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const [memberData, setMemberData] = useState<MemberWithTasks | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", type: "other" as TaskType, notes: "", recurrence: "weekly" as "none" | "daily" | "weekly", frequency: 1 });
  // For strength/other: multi-row exercise details
  const [detailRows, setDetailRows] = useState<{ name: string; sets_reps: string; rest: string; intensity: string; note: string; heart_zone: string }[]>([{ name: "", sets_reps: "", rest: "", intensity: "", note: "", heart_zone: "0" }]);

  // For simple types (cardio/wellness/swimming): single fields
  const [simpleDuration, setSimpleDuration] = useState("");
  const [simpleObjective, setSimpleObjective] = useState("");
  const [simpleIntensity, setSimpleIntensity] = useState("");
  const [simpleHeartZone, setSimpleHeartZone] = useState("0");

  const [editTask, setEditTask] = useState({ title: "", description: "", type: "other" as TaskType, notes: "", recurrence: "weekly" as "none" | "daily" | "weekly", frequency: 1 });
  const [editDetailRows, setEditDetailRows] = useState<{ name: string; sets_reps: string; rest: string; intensity: string; note: string; heart_zone: string }[]>([]);
  const [editSimpleDuration, setEditSimpleDuration] = useState("");
  const [editSimpleObjective, setEditSimpleObjective] = useState("");
  const [editSimpleIntensity, setEditSimpleIntensity] = useState("");
  const [editSimpleHeartZone, setEditSimpleHeartZone] = useState("0");


  const [messages, setMessages] = useState<Message[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; percentage: number }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [weeklyObjective, setWeeklyObjective] = useState<WeeklyObjective | null>(null);
  const [objectiveText, setObjectiveText] = useState("");
  const [editingObjective, setEditingObjective] = useState(false);
  const [duplicatingTaskId, setDuplicatingTaskId] = useState<string | null>(null);
  const [duplicateTargetWeek, setDuplicateTargetWeek] = useState("");
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [librarySessions, setLibrarySessions] = useState<LibrarySession[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryTargetWeek, setLibraryTargetWeek] = useState(getCurrentWeekStart());
  const [libraryActionLoading, setLibraryActionLoading] = useState<string | null>(null);
  const [memberProgram, setMemberProgram] = useState<{ name: string } | null>(null);
  const [programInfo, setProgramInfo] = useState<{
    name: string | null;
    mainGoal: string | null;
    level: string | null;
    activationDate: string | null;
    status: "active" | "pending" | "completed" | "none";
    libraryProgramId: string | null;
  }>({ name: null, mainGoal: null, level: null, activationDate: null, status: "none", libraryProgramId: null });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (profile?.role !== "coach") {
      navigate("/dashboard");
      return;
    }
    if (memberId && user) loadData();
  }, [memberId, user, profile, navigate, selectedWeek, loadData]);

  // Realtime: refresh when this member's program/profile or tasks change
  useEffect(() => {
    if (!memberId || !user) return;
    const ch = supabase
      .channel(`member-detail-${memberId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `member_id=eq.${memberId}` }, () => loadData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${memberId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, user]);


    const loadData = useCallback(async () => {
    if (!memberId || !user) return;
    try {
      const data = await getMemberData(memberId, selectedWeek);
      if (data) {
        setMemberData(data);
        const obj = await getWeeklyObjective(memberId, selectedWeek);
        setWeeklyObjective(obj);
        setObjectiveText(obj?.objective || "");
        setEditingObjective(false);
        const msgs = await getConversation(user.id, memberId);
        setMessages(msgs.map(m => ({
          id: m.id, senderId: m.sender_id, senderName: m.senderName || "Inconnu",
          content: m.content, timestamp: m.created_at, isCoach: m.isCoach || false,
          isRead: m.is_read,
          imageUrl: (m as any).image_url ?? null,
        })));
        const history = await getWeeklyHistory(memberId);
        setWeeklyData(history.slice(0, 8).map(h => ({ week: h.weekLabel, percentage: h.percentage })));
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
          .eq("sender_id", memberId).eq("receiver_id", user.id).eq("is_read", false);
        setUnreadCount(count || 0);

        // Fetch member's assigned program + compute status + extract level from indicators
        const { data: prof } = await (supabase as any)
          .from("profiles")
          .select("onboarding_program_id, onboarding_objective, onboarding_completed_at")
          .eq("id", memberId)
          .maybeSingle();

        let programName: string | null = null;
        let libraryProgramId: string | null = null;
        if (prof?.onboarding_program_id) {
          const { data: prog } = await (supabase as any)
            .from("onboarding_programs")
            .select("name, library_program_id")
            .eq("id", prof.onboarding_program_id)
            .maybeSingle();
          if (prog) {
            programName = prog.name;
            libraryProgramId = prog.library_program_id;
            setMemberProgram({ name: prog.name });
          }
        } else {
          setMemberProgram(null);
        }

        // Indicators → main goal + niveau (parsed from goal_notes)
        const { data: ind } = await (supabase as any)
          .from("member_indicators")
          .select("main_goal, goal_notes")
          .eq("member_id", memberId)
          .maybeSingle();
        let level: string | null = null;
        if (ind?.goal_notes) {
          const m = String(ind.goal_notes).match(/Niveau\s*:\s*([^|]+)/i);
          if (m) level = m[1].trim();
        }

        // Compute status from task distribution
        let status: "active" | "pending" | "completed" | "none" = "none";
        if (prof?.onboarding_program_id) {
          const todayMonday = (() => {
            const d = new Date();
            const day = d.getDay();
            d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })();
          const { count: futureCount } = await supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("member_id", memberId)
            .gte("week_start", todayMonday);
          const { count: anyCount } = await supabase
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("member_id", memberId);
          if ((anyCount || 0) === 0) status = "pending";
          else if ((futureCount || 0) > 0) status = "active";
          else status = "completed";
        }

        setProgramInfo({
          name: programName,
          mainGoal: ind?.main_goal || prof?.onboarding_objective || null,
          level,
          activationDate: prof?.onboarding_completed_at || null,
          status,
          libraryProgramId,
        });

        // Mark unseen comments as seen by coach
        try {
          await (supabase as any)
            .from("tasks")
            .update({ coach_seen_at: new Date().toISOString() })
            .eq("member_id", memberId)
            .eq("coach_id", user.id)
            .not("member_comment", "is", null)
            .is("coach_seen_at", null);
        } catch (e) { console.warn(e); }

      } else {
        navigate("/coach");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }, [memberId, user, selectedWeek, navigate]);

  const handleAddTask = async () => {
    if (!memberData || !user || !newTask.title.trim()) return;
    try {
      let taskData: any;

      if (isSimpleType(newTask.type)) {
        // Simple type: store duration in `duration`, objective in `description`, intensity as single value
        taskData = {
          memberId: memberData.id,
          coachId: user.id,
          title: newTask.title,
          description: simpleObjective || newTask.description,
          type: newTask.type,
          notes: newTask.notes,
          duration: simpleDuration || undefined,
          intensity: simpleIntensity || undefined,
          recurrence: newTask.recurrence,
          frequency: newTask.frequency,
          heart_zone: simpleHeartZone && simpleHeartZone !== "0" ? Number(simpleHeartZone) : null,
        };
      } else {

        // Strength/other: multi-row
        const names = detailRows.map(r => r.name).filter(Boolean).join(" | ");
        const setsReps = detailRows.map(r => r.sets_reps).filter(Boolean).join(" | ");
        const rests = detailRows.map(r => r.rest).filter(Boolean).join(" | ");
        const intensities = detailRows.map(r => r.intensity).filter(Boolean).join(" | ");
        const exerciseNotes = detailRows.map(r => r.note).filter(Boolean).join(" | ");
        const heartZones = detailRows.map(r => r.heart_zone || "0").join(" | ");
        const hasAnyZone = detailRows.some(r => r.heart_zone && r.heart_zone !== "0");
        taskData = {
          memberId: memberData.id,
          coachId: user.id,
          title: newTask.title,
          description: newTask.description,
          type: newTask.type,
          notes: newTask.notes,
          duration: names || undefined,
          sets_reps: setsReps || undefined,
          rest: rests || undefined,
          intensity: intensities || undefined,
          exercise_notes: exerciseNotes || undefined,
          heart_zones: hasAnyZone ? heartZones : undefined,
          recurrence: newTask.recurrence,
          frequency: newTask.frequency,
        };
      }

      await createTask({ ...taskData, weekStart: selectedWeek });

      if (newTask.recurrence === "weekly") {
        const futureWeeks: string[] = [];
        let weekDate = new Date(selectedWeek + "T00:00:00");
        for (let i = 1; i <= 4; i++) {
          weekDate = new Date(weekDate);
          weekDate.setDate(weekDate.getDate() + 7);
          const y = weekDate.getFullYear();
          const m = String(weekDate.getMonth() + 1).padStart(2, "0");
          const d = String(weekDate.getDate()).padStart(2, "0");
          futureWeeks.push(`${y}-${m}-${d}`);
        }
        await Promise.all(futureWeeks.map(ws => createTask({ ...taskData, weekStart: ws })));
      }

      setNewTask({ title: "", description: "", type: "other", notes: "", recurrence: "weekly", frequency: 1 });
      setDetailRows([{ name: "", sets_reps: "", rest: "", intensity: "", note: "", heart_zone: "0" }]);
      setSimpleDuration(""); setSimpleObjective(""); setSimpleIntensity(""); setSimpleHeartZone("0");
      setIsAdding(false);
      toast({ title: "Objectif ajouté", description: newTask.recurrence === "weekly" ? `${newTask.title} — copié sur 4 semaines` : newTask.title });
      loadData();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Erreur lors de l'ajout", variant: "destructive" });
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<TaskWithDetails>) => {
    try {
      await updateTask(taskId, updates);
      loadData();
      setEditingId(null);
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    }
  };

  const startEditing = (task: TaskWithDetails) => {
    setEditingId(task.id);
    setEditTask({
      title: task.title,
      description: task.description || "",
      type: (task.type as TaskType) || "other",
      notes: task.notes || "",
      recurrence: task.recurrence || "weekly",
      frequency: task.frequency ?? 1,
    });

    if (isSimpleType(task.type)) {
      setEditSimpleDuration(task.duration || "");
      setEditSimpleObjective(task.description || "");
      setEditSimpleIntensity(task.intensity || "");
      setEditSimpleHeartZone(String((task as any).heart_zone ?? 0));
      setEditDetailRows([{ name: "", sets_reps: "", rest: "", intensity: "", note: "", heart_zone: "0" }]);
    } else {
      setEditSimpleDuration(""); setEditSimpleObjective(""); setEditSimpleIntensity(""); setEditSimpleHeartZone("0");
      const names = task.duration?.split(" | ") || [];
      const sets = task.sets_reps?.split(" | ") || [];
      const rests = (task as any).rest?.split(" | ") || [];
      const intensities = task.intensity?.split(" | ") || [];
      const exNotes = (task as any).exercise_notes?.split(" | ") || [];
      const heartZones = (task as any).heart_zones?.split(" | ") || [];
      const maxLen = Math.max(names.length, sets.length, rests.length, intensities.length, exNotes.length, 1);
      setEditDetailRows(Array.from({ length: maxLen }).map((_, i) => ({
        name: names[i] || "", sets_reps: sets[i] || "", rest: rests[i] || "",
        intensity: intensities[i] || "", note: exNotes[i] || "", heart_zone: heartZones[i] || "0",
      })));
    }
  };


  const handleSaveEdit = async (taskId: string) => {
    if (isSimpleType(editTask.type)) {
      await handleUpdateTask(taskId, {
        title: editTask.title,
        description: editSimpleObjective || editTask.description || null,
        type: editTask.type,
        notes: editTask.notes || null,
        recurrence: editTask.recurrence,
        frequency: editTask.frequency,
        duration: editSimpleDuration || null,
        intensity: editSimpleIntensity || null,
        sets_reps: null,
        rest: null,
        exercise_notes: null,
        heart_zone: editSimpleHeartZone && editSimpleHeartZone !== "0" ? Number(editSimpleHeartZone) : null,
      } as any);
    } else {

      const names = editDetailRows.map(r => r.name).filter(Boolean).join(" | ");
      const setsReps = editDetailRows.map(r => r.sets_reps).filter(Boolean).join(" | ");
      const rests = editDetailRows.map(r => r.rest).filter(Boolean).join(" | ");
      const intensities = editDetailRows.map(r => r.intensity).filter(Boolean).join(" | ");
      const exerciseNotes = editDetailRows.map(r => r.note).filter(Boolean).join(" | ");
      const heartZones = editDetailRows.map(r => r.heart_zone || "0").join(" | ");
      const hasAnyZone = editDetailRows.some(r => r.heart_zone && r.heart_zone !== "0");
      await handleUpdateTask(taskId, {
        title: editTask.title,
        description: editTask.description || null,
        type: editTask.type,
        notes: editTask.notes || null,
        recurrence: editTask.recurrence,
        frequency: editTask.frequency,
        duration: names || null,
        sets_reps: setsReps || null,
        rest: rests || null,
        intensity: intensities || null,
        exercise_notes: exerciseNotes || null,
        heart_zones: hasAnyZone ? heartZones : null,
      } as any);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({ title: "Objectif supprimé" });
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleSendMessage = async (content: string, imageUrl?: string | null) => {
    if (!memberId || !user) return;
    try {
      await sendMessage(user.id, memberId, content, imageUrl);
      const newMsg: Message = {
        id: crypto.randomUUID(), senderId: user.id, senderName: "Coach",
        content, timestamp: new Date().toISOString(), isCoach: true,
        imageUrl: imageUrl ?? null,
      };
      setMessages([...messages, newMsg]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Erreur lors de l'envoi", variant: "destructive" });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberData) return;
    setDeleting(true);
    try {
      await deleteMember(memberData.id);
      toast({ title: "Membre supprimé", description: `${memberData.name} a été supprimé.` });
      navigate("/coach");
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveObjective = async () => {
    if (!memberId || !user) return;
    try {
      if (objectiveText.trim()) {
        const obj = await upsertWeeklyObjective(user.id, memberId, selectedWeek, objectiveText.trim());
        setWeeklyObjective(obj);
      } else if (weeklyObjective) {
        await deleteWeeklyObjective(weeklyObjective.id);
        setWeeklyObjective(null);
        setObjectiveText("");
      }
      setEditingObjective(false);
      toast({ title: "Objectif mis à jour" });
    } catch (error) {
      console.error("Error saving objective:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleSaveToLibrary = async (task: TaskWithDetails) => {
    if (!user) return;
    try {
      await createLibrarySession({
        coachId: user.id, title: task.title, description: task.description || undefined,
        type: task.type, notes: task.notes || undefined, duration: task.duration || undefined,
        sets_reps: task.sets_reps || undefined, rest: task.rest || undefined,
        intensity: task.intensity || undefined, exercise_notes: task.exercise_notes || undefined,
        recurrence: task.recurrence, frequency: task.frequency,
      });
      toast({ title: "Sauvegardé dans la bibliothèque", description: `"${task.title}" ajouté` });
    } catch (error) {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  const handleOpenLibraryPicker = async () => {
    if (!user) return;
    setLibraryDialogOpen(true);
    setLibraryLoading(true);
    setLibraryTargetWeek(selectedWeek);
    try {
      const sessions = await getCoachLibrarySessions(user.id);
      setLibrarySessions(sessions);
    } catch {
      toast({ title: "Erreur chargement bibliothèque", variant: "destructive" });
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleAddFromLibrary = async (session: LibrarySession) => {
    if (!memberData || !user) return;
    setLibraryActionLoading(session.id);
    try {
      await assignSessionAsObjective(session, memberData.id, user.id, libraryTargetWeek);
      toast({ title: "Objectif ajouté", description: `"${session.title}" ajouté à la semaine` });
      if (libraryTargetWeek === selectedWeek) loadData();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLibraryActionLoading(null);
    }
  };

  const handleDuplicateTask = async (task: TaskWithDetails, targetWeek: string) => {
    if (!memberData || !user) return;
    try {
      await createTask({
        memberId: memberData.id, coachId: user.id, title: task.title,
        description: task.description || undefined, type: task.type, notes: task.notes || undefined,
        weekStart: targetWeek, duration: task.duration || undefined, sets_reps: task.sets_reps || undefined,
        rest: (task as any).rest || undefined, intensity: task.intensity || undefined,
        exercise_notes: (task as any).exercise_notes || undefined, recurrence: task.recurrence, frequency: task.frequency,
      });
      setDuplicatingTaskId(null);
      setDuplicateTargetWeek("");
      toast({ title: "Objectif dupliqué", description: `"${task.title}" copié` });
    } catch (error) {
      toast({ title: "Erreur lors de la duplication", variant: "destructive" });
    }
  };

  const handleDeleteObjective = async () => {
    if (!weeklyObjective) return;
    try {
      await deleteWeeklyObjective(weeklyObjective.id);
      setWeeklyObjective(null);
      setObjectiveText("");
      setEditingObjective(false);
      toast({ title: "Objectif supprimé" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!memberData) return null;

  const progressPercent = memberData.stats.total > 0
    ? Math.round((memberData.stats.done / memberData.stats.total) * 100) : 0;

  // Helper to render coach task info display (non-edit mode)
  const renderTaskInfoDisplay = (task: any) => {
    const type = task.type as TaskType;
    const intensityLabel = (v: string) =>
      v === "light" ? "Légère" : v === "moderate" ? "Modérée" : v === "intense" ? "Intense" : v === "max" ? "Maximale" : v;

    const zoneLabel = (z: string | number) => `Z${z}`;
    const zoneClass = (z: string | number) => {
      const n = Number(z);
      return n === 1 ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
        n === 2 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
        n === 3 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
        n === 4 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" :
        "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    };

    if (isSimpleType(type)) {
      return (
        <div className="space-y-1.5 mb-2">
          {task.duration && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-xs font-medium text-foreground">
              ⏱ {task.duration}
            </span>
          )}
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {task.intensity && type !== "wellness" && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                task.intensity === "max" ? "bg-destructive/20 text-destructive" :
                task.intensity === "intense" ? "bg-amber-500/20 text-amber-500" :
                task.intensity === "moderate" ? "bg-primary/20 text-primary" :
                "bg-secondary text-muted-foreground"
              }`}>
                🔥 {intensityLabel(task.intensity)}
              </span>
            )}
            {task.heart_zone && task.heart_zone > 0 && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${zoneClass(task.heart_zone)}`}>
                ❤️ {zoneLabel(task.heart_zone)}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (!task.duration && !task.sets_reps && !task.rest && !task.intensity) return null;
    const names = task.duration?.split(" | ") || [];
    const sets = task.sets_reps?.split(" | ") || [];
    const rests = task.rest?.split(" | ") || [];
    const intensities = task.intensity?.split(" | ") || [];
    const exNotes = task.exercise_notes?.split(" | ") || [];
    const heartZones = task.heart_zones?.split(" | ") || [];
    const maxLen = Math.max(names.length, sets.length, rests.length, intensities.length, exNotes.length);
    if (maxLen === 0) return null;

    return (
      <div className="space-y-1.5 mb-2">
        {Array.from({ length: maxLen }).map((_, i) => (
          <div key={i}>
            <div className="flex flex-wrap gap-1.5">
              {names[i] && <span className="px-2 py-0.5 rounded-lg bg-secondary text-xs text-foreground">🏋️ {names[i]}</span>}
              {sets[i] && <span className="px-2 py-0.5 rounded-lg bg-secondary text-xs text-foreground">🔁 {sets[i]}</span>}
              {rests[i] && <span className="px-2 py-0.5 rounded-lg bg-secondary text-xs text-foreground">⏱ {rests[i]}</span>}
              {intensities[i] && (
                <span className={`px-2 py-0.5 rounded-lg text-xs ${
                  intensities[i] === "max" ? "bg-destructive/20 text-destructive" :
                  intensities[i] === "intense" ? "bg-amber-500/20 text-amber-500" :
                  intensities[i] === "moderate" ? "bg-primary/20 text-primary" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  🔥 {intensityLabel(intensities[i])}
                </span>
              )}
              {heartZones[i] && heartZones[i] !== "0" && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${zoneClass(heartZones[i])}`}>
                  ❤️ {zoneLabel(heartZones[i])}
                </span>
              )}
            </div>
            {exNotes[i] && (
              <p className="text-[11px] text-muted-foreground italic pl-1 mt-0.5">📝 {exNotes[i]}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render the add/edit form fields based on type
  const renderTypeSpecificFields = (
    mode: "add" | "edit",
    type: TaskType,
  ) => {
    if (isSimpleType(type)) {
      return (
        <SimpleTypeFields
          type={type}
          duration={mode === "add" ? simpleDuration : editSimpleDuration}
          setDuration={mode === "add" ? setSimpleDuration : setEditSimpleDuration}
          objective={mode === "add" ? simpleObjective : editSimpleObjective}
          setObjective={mode === "add" ? setSimpleObjective : setEditSimpleObjective}
          intensity={mode === "add" ? simpleIntensity : editSimpleIntensity}
          setIntensity={mode === "add" ? setSimpleIntensity : setEditSimpleIntensity}
          heartZone={mode === "add" ? simpleHeartZone : editSimpleHeartZone}
          setHeartZone={mode === "add" ? setSimpleHeartZone : setEditSimpleHeartZone}
        />

      );
    }

    // Strength / Other: multi-row exercise details
    const rows = mode === "add" ? detailRows : editDetailRows;
    const setRows = mode === "add" ? setDetailRows : setEditDetailRows;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">Détails (Exercice / Séries / Repos / Intensité)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRows([...rows, { name: "", sets_reps: "", rest: "", intensity: "", note: "", heart_zone: "0" }])}
            className="text-xs text-primary h-7 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            Ligne
          </Button>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="space-y-1.5 bg-secondary/30 rounded-xl p-2.5">
            <div className="flex gap-2">
              <div className="flex-1">
                {idx === 0 && <Label className="text-xs text-muted-foreground">🏋️ Exercice</Label>}
                <Input
                  value={row.name}
                  onChange={(e) => { const u = [...rows]; u[idx] = { ...u[idx], name: e.target.value }; setRows(u); }}
                  placeholder="Nom"
                  className={`${idx === 0 ? "mt-1" : ""} bg-secondary border-0 rounded-xl text-sm`}
                />
              </div>
              <div className="w-20">
                {idx === 0 && <Label className="text-xs text-muted-foreground">🔁 Séries</Label>}
                <Input
                  value={row.sets_reps}
                  onChange={(e) => { const u = [...rows]; u[idx] = { ...u[idx], sets_reps: e.target.value }; setRows(u); }}
                  placeholder="4x12"
                  className={`${idx === 0 ? "mt-1" : ""} bg-secondary border-0 rounded-xl text-sm`}
                />
              </div>
              <div className="w-20">
                {idx === 0 && <Label className="text-xs text-muted-foreground">⏱ Repos</Label>}
                <Input
                  value={row.rest}
                  onChange={(e) => { const u = [...rows]; u[idx] = { ...u[idx], rest: e.target.value }; setRows(u); }}
                  placeholder="1min30"
                  className={`${idx === 0 ? "mt-1" : ""} bg-secondary border-0 rounded-xl text-sm`}
                />
              </div>
              <div className="flex-1">
                {idx === 0 && <Label className="text-xs text-muted-foreground">🔥 Intensité</Label>}
                <Select
                  value={row.intensity}
                  onValueChange={(v) => { const u = [...rows]; u[idx] = { ...u[idx], intensity: v }; setRows(u); }}
                >
                  <SelectTrigger className={`${idx === 0 ? "mt-1" : ""} bg-secondary border-0 rounded-xl text-sm`}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Légère</SelectItem>
                    <SelectItem value="moderate">Modérée</SelectItem>
                    <SelectItem value="intense">Intense</SelectItem>
                    <SelectItem value="max">Maximale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rows.length > 1 && (
                <button
                  onClick={() => setRows(rows.filter((_, j) => j !== idx))}
                  className="self-end p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Select
                value={row.heart_zone || "0"}
                onValueChange={(v) => { const u = [...rows]; u[idx] = { ...u[idx], heart_zone: v }; setRows(u); }}
              >
                <SelectTrigger className="w-[150px] bg-secondary border-0 rounded-xl text-xs h-8">
                  <SelectValue placeholder="❤️ Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">❤️ Aucune zone</SelectItem>
                  <SelectItem value="1">❤️ Z1 — Récup</SelectItem>
                  <SelectItem value="2">❤️ Z2 — Endurance</SelectItem>
                  <SelectItem value="3">❤️ Z3 — Tempo</SelectItem>
                  <SelectItem value="4">❤️ Z4 — Seuil</SelectItem>
                  <SelectItem value="5">❤️ Z5 — Max</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={row.note}
                onChange={(e) => { const u = [...rows]; u[idx] = { ...u[idx], note: e.target.value }; setRows(u); }}
                placeholder="Note : ex. 2 sec excentrique"
                className="flex-1 bg-secondary border-0 rounded-xl text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-8 pb-3">
        <button onClick={() => navigate("/coach")} className="flex items-center gap-2 text-muted-foreground mb-4">
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <div className="flex items-center gap-4">
          <UserAvatar name={memberData.name} avatarUrl={(memberData as any).avatar_url} size="xl" className="rounded-2xl" />
          <div className="flex-1">
            <h1 className="font-bold text-foreground text-xs">{memberData.name}</h1>
            {memberProgram && (
              <p className="text-[11px] text-primary font-medium mt-0.5 break-words">📋 {memberProgram.name}</p>
            )}
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-emerald-500">{memberData.stats.done} validés</span>
              <span className="text-sm text-amber-500">{memberData.stats.pending} en attente</span>
              {memberData.stats.notDone > 0 && <span className="text-sm text-destructive">{memberData.stats.notDone} non faits</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
              <p className="text-xs text-muted-foreground">cette semaine</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10" disabled={deleting}>
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les données de {memberData.name} seront définitivement supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.header>

      {/* Program info card */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Programme du membre</p>
            {programInfo.status !== "none" && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                programInfo.status === "active" ? "bg-emerald-500/15 text-emerald-600" :
                programInfo.status === "pending" ? "bg-amber-500/15 text-amber-600" :
                "bg-muted text-muted-foreground"
              }`}>
                {programInfo.status === "active" ? "Actif" : programInfo.status === "pending" ? "En attente" : "Terminé"}
              </span>
            )}
          </div>
          {programInfo.status === "none" ? (
            <p className="text-sm text-muted-foreground italic">Aucun programme actif pour le moment.</p>
          ) : (
            <div className="space-y-1.5">
              {programInfo.name && (
                <p className="text-base font-bold text-foreground break-words">📋 {programInfo.name}</p>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {programInfo.mainGoal && (
                  <div><span className="text-muted-foreground">Objectif :</span> <span className="text-foreground font-medium break-words">{programInfo.mainGoal}</span></div>
                )}
                {programInfo.level && (
                  <div><span className="text-muted-foreground">Niveau :</span> <span className="text-foreground font-medium">{programInfo.level}</span></div>
                )}
                {programInfo.activationDate && (
                  <div className="col-span-2"><span className="text-muted-foreground">Activé le :</span> <span className="text-foreground font-medium">{new Date(programInfo.activationDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                )}
              </div>
              {programInfo.status === "pending" && programInfo.libraryProgramId && (
                <Button
                  size="sm"
                  className="w-full mt-2 rounded-xl"
                  onClick={async () => {
                    if (!memberId || !user || !programInfo.libraryProgramId) return;
                    try {
                      const { data: sessions } = await (supabase as any)
                        .from("coach_library_sessions")
                        .select("*")
                        .eq("program_id", programInfo.libraryProgramId)
                        .order("session_order", { ascending: true });
                      if (!sessions || sessions.length === 0) {
                        toast({ title: "Programme vide", description: "Ajoute des séances à ce programme dans la bibliothèque.", variant: "destructive" });
                        return;
                      }
                      const { assignProgramToMember } = await import("@/services/libraryService");
                      const res = await assignProgramToMember(sessions, memberId, user.id, getCurrentWeekStart());
                      toast({ title: "Programme activé ✅", description: `${res.sessions} séance(s) sur ${res.cycles} semaine(s).` });
                      loadData();
                    } catch (e: any) {
                      toast({ title: "Erreur", description: e.message, variant: "destructive" });
                    }
                  }}
                >
                  Activer maintenant
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}

      <Tabs defaultValue="objectives" className="px-4" onValueChange={async (val) => {
        if (val === "messages" && memberId && user) {
          try { await markMessagesAsRead(user.id, memberId); setUnreadCount(0); } catch (e) { console.error(e); }
        }
      }}>
        <TabsList className="w-full bg-secondary mb-4">
          <TabsTrigger value="objectives" className="flex-1 gap-1"><Target className="w-4 h-4" />Objectifs</TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 gap-1 relative">
            <MessageSquare className="w-4 h-4" />Messages
            {unreadCount > 0 && (
              <span className="ml-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 gap-1"><BarChart3 className="w-4 h-4" />Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="objectives" className="space-y-4 mt-0">
          <WeekSelector weekStart={selectedWeek} onChange={setSelectedWeek} allowFuture />

          {/* Weekly Objective */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-primary">🎯 Objectif de la semaine</p>
              <div className="flex items-center gap-1">
                {!editingObjective && (
                  <button onClick={() => setEditingObjective(true)} className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
                {weeklyObjective && !editingObjective && (
                  <button onClick={handleDeleteObjective} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            </div>
            {editingObjective ? (
              <div className="space-y-2">
                <Textarea value={objectiveText} onChange={(e) => setObjectiveText(e.target.value)}
                  placeholder="Ex: Travailler l'endurance et la mobilité..."
                  className="bg-background/50 border-0 rounded-xl resize-none text-sm min-h-[60px]" rows={2} autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveObjective} className="rounded-xl flex-1">
                    <Save className="w-3.5 h-3.5 mr-1" /> Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingObjective(false); setObjectiveText(weeklyObjective?.objective || ""); }} className="rounded-xl">
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {weeklyObjective?.objective || <span className="text-muted-foreground italic">Aucun objectif défini — cliquer sur ✏️ pour en ajouter un</span>}
              </p>
            )}
          </div>

          {/* Add Buttons */}
          {!isAdding && (
            <div className="flex gap-2">
              <Button onClick={() => setIsAdding(true)} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground">
                <Plus className="w-5 h-5 mr-2" /> Nouvel objectif
              </Button>
              <Button onClick={handleOpenLibraryPicker} variant="outline" className="h-12 rounded-2xl gap-2">
                <BookOpen className="w-5 h-5" /> Bibliothèque
              </Button>
            </div>
          )}

          {/* Add Form */}
          {isAdding && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Nouvel objectif</h3>
                <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Type</Label>
                <Select value={newTask.type} onValueChange={(value) => setNewTask({ ...newTask, type: value as TaskType })}>
                  <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Titre</Label>
                <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder={
                    newTask.type === "cardio" ? "Ex: Séance cardio endurance" :
                    newTask.type === "wellness" ? "Ex: Séance stretching" :
                    newTask.type === "swimming" ? "Ex: Natation technique" :
                    "Ex: Séance pecs / épaules"
                  }
                  className="mt-1 bg-secondary border-0 rounded-xl" />
              </div>

              {/* Type-specific fields */}
              {renderTypeSpecificFields("add", newTask.type)}

              {/* Description field only for strength/other (simple types use objective inside SimpleTypeFields) */}
              {!isSimpleType(newTask.type) && (
                <div>
                  <Label className="text-sm text-muted-foreground">Objectifs de l'entraînement</Label>
                  <Input value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Ex: Développer la force" className="mt-1 bg-secondary border-0 rounded-xl" />
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">🔄 Fréquence par semaine</Label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((f) => (
                    <button key={f} type="button"
                      onClick={() => setNewTask({ ...newTask, frequency: f, recurrence: f >= 2 ? "daily" : "weekly" })}
                      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${
                        newTask.frequency === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}>{f}x</button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {newTask.frequency === 1 ? "1 fois par semaine" : newTask.frequency === 7 ? "Tous les jours" : `${newTask.frequency} fois par semaine`}
                </p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Notes pour le membre</Label>
                <Textarea value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Instructions, conseils..." className="mt-1 bg-secondary border-0 rounded-xl resize-none" rows={2} />
              </div>

              <Button onClick={handleAddTask} disabled={!newTask.title.trim()} className="w-full rounded-xl">
                <Save className="w-4 h-4 mr-2" /> Enregistrer
              </Button>
            </motion.div>
          )}

          {/* Tasks List */}
          <div className="space-y-3">
            {memberData.tasks.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-4">
                {editingId === task.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Modifier l'objectif</h3>
                      <button onClick={() => setEditingId(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Type</Label>
                      <Select value={editTask.type} onValueChange={(v) => setEditTask({ ...editTask, type: v as TaskType })}>
                        <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(taskTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Titre</Label>
                      <Input value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                        className="mt-1 bg-secondary border-0 rounded-xl" />
                    </div>

                    {/* Type-specific fields */}
                    {renderTypeSpecificFields("edit", editTask.type)}

                    {!isSimpleType(editTask.type) && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <Input value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                          placeholder="Description" className="mt-1 bg-secondary border-0 rounded-xl" />
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-muted-foreground">🔄 Fréquence /sem.</Label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((f) => (
                          <button key={f} type="button"
                            onClick={() => setEditTask({ ...editTask, frequency: f, recurrence: f >= 2 ? "daily" : "weekly" })}
                            className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                              editTask.frequency === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}>{f}x</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Notes pour le membre</Label>
                      <Textarea value={editTask.notes} onChange={(e) => setEditTask({ ...editTask, notes: e.target.value })}
                        placeholder="Instructions, conseils..." className="mt-1 bg-secondary border-0 rounded-xl resize-none" rows={2} />
                    </div>

                    <Button onClick={() => handleSaveEdit(task.id)} disabled={!editTask.title.trim()} className="w-full rounded-xl">
                      <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{taskTypeLabels[task.type as TaskType]?.split(" ")[0] || "📋"}</span>
                          <h3 className="font-semibold text-foreground">{task.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleSaveToLibrary(task as TaskWithDetails)} className="p-2 hover:bg-accent rounded-lg transition-colors" title="Sauvegarder dans la bibliothèque">
                          <BookmarkPlus className="w-4 h-4 text-primary" />
                        </button>
                        <button onClick={() => { setDuplicatingTaskId(duplicatingTaskId === task.id ? null : task.id); setDuplicateTargetWeek(""); }}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors" title="Dupliquer">
                          <Copy className="w-4 h-4 text-primary" />
                        </button>
                        <button onClick={() => startEditing(task as TaskWithDetails)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* Duplicate panel */}
                    {duplicatingTaskId === task.id && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
                        <p className="text-xs font-medium text-primary mb-2">📋 Dupliquer vers une autre semaine</p>
                        <div className="flex gap-2">
                          <Input type="date" value={duplicateTargetWeek} onChange={(e) => setDuplicateTargetWeek(e.target.value)}
                            className="flex-1 bg-background border-border rounded-xl text-sm" />
                          <Button size="sm" disabled={!duplicateTargetWeek} onClick={() => handleDuplicateTask(task as TaskWithDetails, duplicateTargetWeek)} className="rounded-xl">
                            <Copy className="w-3.5 h-3.5 mr-1" /> Dupliquer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDuplicatingTaskId(null)} className="rounded-xl px-2">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">Sélectionnez le lundi de la semaine cible</p>
                      </div>
                    )}

                    {/* Task info display - type-aware */}
                    {renderTaskInfoDisplay(task)}

                    {/* Status & Recurrence Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        statusLabels[task.status as keyof typeof statusLabels]?.class || statusLabels.pending.class
                      }`}>
                        {statusLabels[task.status as keyof typeof statusLabels]?.label || statusLabels.pending.label}
                      </span>
                      {(task as TaskWithDetails).frequency > 1 && (
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary">
                          🔄 {(task as TaskWithDetails).frequency}x/sem.
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <div className="bg-secondary/50 rounded-xl p-3 mb-2">
                        <p className="text-xs text-muted-foreground mb-1">📝 Notes coach</p>
                        <p className="text-sm text-foreground">{task.notes}</p>
                      </div>
                    )}

                    {task.member_comment && (
                      <div className="space-y-2">
                        <div className="bg-primary/10 rounded-xl p-3">
                          <p className="text-xs text-primary mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Commentaire du membre
                          </p>
                          <p className="text-sm text-foreground">{task.member_comment}</p>
                        </div>
                        {(task as any).coach_reply && (
                          <div className="bg-secondary/50 rounded-xl p-3 ml-4 border-l-2 border-primary">
                            <p className="text-xs text-muted-foreground mb-1">💬 Réponse du coach</p>
                            <p className="text-sm text-foreground">{(task as any).coach_reply}</p>
                          </div>
                        )}
                        {(task as any).member_followup && (
                          <div className="bg-primary/10 rounded-xl p-3 ml-8">
                            <p className="text-xs text-primary mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Réponse du membre
                            </p>
                            <p className="text-sm text-foreground">{(task as any).member_followup}</p>
                          </div>
                        )}
                        <CoachReplyInput
                          taskId={task.id}
                          existingReply={(task as any).coach_reply || ""}
                          onSave={async (taskId, reply) => { await handleUpdateTask(taskId, { coach_reply: reply } as any); }}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}

            {memberData.tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun objectif pour le moment</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-0">
          <div className="bg-card border border-border rounded-2xl h-[60vh] overflow-hidden">
            <MessageThread
              messages={messages}
              currentUserId={user?.id || ""}
              onSendMessage={handleSendMessage}
              onToggleRead={async (mid, next) => {
                try {
                  await setMessageReadStatus(mid, next);
                  setMessages(prev => prev.map(m => m.id === mid ? { ...m, isRead: next } : m));
                  setUnreadCount(c => Math.max(0, c + (next ? -1 : 1)));
                } catch { /* noop */ }
              }}
              placeholder="Écrire au membre..."
            />
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0 space-y-4">
          {weeklyData.length > 0 ? (
            <WeeklyChart data={weeklyData} title="Historique des semaines" />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée historique</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Library Picker Dialog */}
      <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-base">Ajouter depuis la bibliothèque</DialogTitle></DialogHeader>
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground mb-1 block">Semaine cible</Label>
            <WeekSelector weekStart={libraryTargetWeek} onChange={setLibraryTargetWeek} allowFuture />
          </div>
          {libraryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : librarySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune séance dans votre bibliothèque</p>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {librarySessions.map(session => {
                const taskTypeEmoji = taskTypeLabels[session.type]?.split(" ")[0] || "📋";
                return (
                  <div key={session.id} className="rounded-xl bg-muted/50 px-3 py-3 flex items-center gap-3">
                    <span className="text-lg shrink-0">{taskTypeEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                      {session.description && <p className="text-xs text-muted-foreground truncate">{session.description}</p>}
                      <span className="text-[10px] text-muted-foreground">{session.frequency === 7 ? "Quotidien" : `${session.frequency}x/sem.`}</span>
                    </div>
                    <Button size="sm" className="rounded-xl gap-1 text-xs shrink-0"
                      disabled={libraryActionLoading === session.id} onClick={() => handleAddFromLibrary(session)}>
                      {libraryActionLoading === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Ajouter
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
