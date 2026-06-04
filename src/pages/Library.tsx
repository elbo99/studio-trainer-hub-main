import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus, X, Trash2, Save, BookOpen, Users, Send, Eye,
  Loader2, ChevronDown, ChevronRight, Pencil, FolderPlus, Layers,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCoachMembers, type MemberWithTasks } from "@/services/membersService";
import { WeekSelector, getCurrentWeekStart } from "@/components/WeekSelector";
import {
  getCoachLibrarySessions, createLibrarySession, deleteLibrarySession,
  updateLibrarySession,
  getSessionAssignments, assignSessionToMember,
  revokeSessionFromMember, assignSessionAsObjective,
  assignProgramToMember,
  getCoachPrograms, createProgram, updateProgram, deleteProgram,
  type LibrarySession, type LibraryProgram,
} from "@/services/libraryService";

const taskTypeLabels: Record<string, string> = {
  swimming: "🏊 Natation",
  cardio: "🏃 Cardio",
  strength: "💪 Musculation",
  wellness: "🧘 Bien-être",
  other: "📋 Autre",
};

type TaskType = "swimming" | "cardio" | "strength" | "wellness" | "other";

const emptyRow = () => ({ name: "", sets_reps: "", rest: "", intensity: "", note: "" });
const emptyForm = () => ({
  title: "", description: "", type: "other" as TaskType, cycle: "",
  notes: "", recurrence: "weekly", frequency: 1,
});

function rowsToFields(rows: ReturnType<typeof emptyRow>[]) {
  return {
    duration: rows.map(r => r.name).filter(Boolean).join(" | ") || undefined,
    sets_reps: rows.map(r => r.sets_reps).filter(Boolean).join(" | ") || undefined,
    rest: rows.map(r => r.rest).filter(Boolean).join(" | ") || undefined,
    intensity: rows.map(r => r.intensity).filter(Boolean).join(" | ") || undefined,
    exercise_notes: rows.map(r => r.note).filter(Boolean).join(" | ") || undefined,
  };
}

function fieldsToRows(s: LibrarySession) {
  const names = s.duration?.split(" | ") || [];
  const sets = s.sets_reps?.split(" | ") || [];
  const rests = s.rest?.split(" | ") || [];
  const intens = s.intensity?.split(" | ") || [];
  const exNotes = s.exercise_notes?.split(" | ") || [];
  const len = Math.max(1, names.length, sets.length, rests.length, intens.length, exNotes.length);
  return Array.from({ length: len }).map((_, i) => ({
    name: names[i] || "", sets_reps: sets[i] || "", rest: rests[i] || "",
    intensity: intens[i] || "", note: exNotes[i] || "",
  }));
}

export default function Library() {
  const [programs, setPrograms] = useState<LibraryProgram[]>([]);
  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [members, setMembers] = useState<MemberWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  // Dialogs
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LibraryProgram | null>(null);
  const [editingSession, setEditingSession] = useState<LibrarySession | null>(null);
  const [creatingSessionForProgram, setCreatingSessionForProgram] = useState<string | "standalone" | null>(null);
  const [assignDialogSession, setAssignDialogSession] = useState<LibrarySession | null>(null);
  const [assignProgram, setAssignProgram] = useState<LibraryProgram | null>(null);

  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [p, s, m] = await Promise.all([
        getCoachPrograms(user.id),
        getCoachLibrarySessions(user.id),
        getCoachMembers(user.id),
      ]);
      setPrograms(p);
      setSessions(s);
      setMembers(m);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (profile?.role !== "coach") { navigate("/dashboard"); return; }
    if (user) loadData();
  }, [user, profile, navigate, loadData]);

  const standaloneSessions = useMemo(
    () => sessions.filter(s => !s.program_id),
    [sessions]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        <motion.header
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="px-5 pt-12 pb-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground text-xs flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Bibliothèque
              </h1>
              <p className="text-sm text-muted-foreground">
                {programs.length} programme{programs.length !== 1 ? "s" : ""} · {sessions.length} séance{sessions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={() => setCreatingProgram(true)}
              size="sm"
              className="rounded-xl gap-1.5 active:scale-95 transition-transform"
            >
              <FolderPlus className="w-4 h-4" /> Nouveau
            </Button>
          </div>
        </motion.header>

        <main className="px-5 space-y-3 mt-2">
          {programs.length === 0 && standaloneSessions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl p-8 text-center"
            >
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">
                Créez votre premier programme d'entraînement.<br />
                Un programme regroupe des séances par cycle.
              </p>
              <Button onClick={() => setCreatingProgram(true)} className="rounded-xl">
                <FolderPlus className="w-4 h-4 mr-1" /> Créer un programme
              </Button>
            </motion.div>
          )}

          {/* Programs */}
          <AnimatePresence initial={false}>
            {programs.map((program, idx) => {
              const progSessions = sessions.filter(s => s.program_id === program.id);
              const isOpen = expandedProgram === program.id;
              const cycles = new Map<string, LibrarySession[]>();
              progSessions.forEach(s => {
                const k = s.cycle?.trim() || "Sans cycle";
                if (!cycles.has(k)) cycles.set(k, []);
                cycles.get(k)!.push(s);
              });
              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, delay: idx * 0.02, ease: "easeOut" }}
                  className="bg-card rounded-2xl overflow-hidden border border-border/40"
                >
                  <div className="flex items-center gap-2 p-4">
                    <button
                      onClick={() => setExpandedProgram(isOpen ? null : program.id)}
                      className="flex-1 flex items-center gap-2 text-left active:scale-[0.99] transition-transform"
                    >
                      <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.div>
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] text-foreground truncate">{program.title}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {progSessions.length} séance{progSessions.length !== 1 ? "s" : ""} · {cycles.size} cycle{cycles.size !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setAssignProgram(program)}
                      className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                      aria-label="Attribuer le programme"
                      disabled={progSessions.length === 0}
                    >
                      <Send className={`w-3.5 h-3.5 ${progSessions.length === 0 ? "text-muted-foreground/40" : "text-primary"}`} />
                    </button>
                    <button
                      onClick={() => setEditingProgram(program)}
                      className="p-2 rounded-lg hover:bg-secondary active:scale-95 transition-all"
                      aria-label="Éditer le programme"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                          {program.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{program.description}</p>
                          )}

                          {progSessions.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Aucune séance pour le moment.</p>
                          )}

                          {Array.from(cycles.entries()).map(([cycleKey, list]) => {
                            const cid = `${program.id}::${cycleKey}`;
                            const open = expandedCycles.has(cid);
                            return (
                              <div key={cid} className="space-y-2">
                                <button
                                  onClick={() => setExpandedCycles(prev => {
                                    const n = new Set(prev);
                                    if (n.has(cid)) {
                                      n.delete(cid);
                                    } else {
                                      n.add(cid);
                                    }
                                    return n;
                                  })}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-left active:scale-[0.99] transition-transform"
                                >
                                  <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  </motion.div>
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wide flex-1">
                                    {cycleKey}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">{list.length}</span>
                                </button>

                                <AnimatePresence initial={false}>
                                  {open && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden space-y-2"
                                    >
                                      {list.map((session, i) => (
                                        <SessionRow
                                          key={session.id}
                                          session={session}
                                          index={i}
                                          onEdit={() => setEditingSession(session)}
                                          onAssign={() => setAssignDialogSession(session)}
                                        />
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}

                          <Button
                            size="sm" variant="outline"
                            className="w-full rounded-xl gap-1.5 mt-1"
                            onClick={() => setCreatingSessionForProgram(program.id)}
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter une séance
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Standalone sessions (legacy / hors programme) */}
          {standaloneSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-card rounded-2xl overflow-hidden border border-border/40"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[15px] text-foreground">Séances libres</h3>
                  <p className="text-[11px] text-muted-foreground">{standaloneSessions.length} hors programme</p>
                </div>
                <Button
                  size="sm" variant="outline"
                  className="rounded-xl gap-1.5"
                  onClick={() => setCreatingSessionForProgram("standalone")}
                >
                  <Plus className="w-3.5 h-3.5" /> Séance
                </Button>
              </div>
              <div className="p-3 space-y-2">
                {standaloneSessions.map((session, i) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    index={i}
                    onEdit={() => setEditingSession(session)}
                    onAssign={() => setAssignDialogSession(session)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {programs.length > 0 && standaloneSessions.length === 0 && (
            <Button
              size="sm" variant="ghost"
              className="w-full rounded-xl gap-1.5 text-muted-foreground"
              onClick={() => setCreatingSessionForProgram("standalone")}
            >
              <Plus className="w-3.5 h-3.5" /> Séance libre (hors programme)
            </Button>
          )}
        </main>

        {/* Program create/edit dialog */}
        <ProgramDialog
          open={creatingProgram || !!editingProgram}
          program={editingProgram}
          onClose={() => { setCreatingProgram(false); setEditingProgram(null); }}
          onSubmit={async (title, description) => {
            if (!user) return;
            try {
              if (editingProgram) {
                await updateProgram(editingProgram.id, { title, description });
                toast({ title: "Programme mis à jour" });
              } else {
                await createProgram(user.id, title, description);
                toast({ title: "Programme créé" });
              }
              setCreatingProgram(false);
              setEditingProgram(null);
              await loadData();
            } catch { toast({ title: "Erreur", variant: "destructive" }); }
          }}
          onDelete={editingProgram ? async () => {
            try {
              await deleteProgram(editingProgram.id);
              toast({ title: "Programme supprimé" });
              setEditingProgram(null);
              await loadData();
            } catch { toast({ title: "Erreur", variant: "destructive" }); }
          } : undefined}
        />

        {/* Session create/edit dialog */}
        <SessionDialog
          open={!!creatingSessionForProgram || !!editingSession}
          session={editingSession}
          existingCycles={Array.from(new Set(sessions.map(s => s.cycle).filter(Boolean) as string[]))}
          onClose={() => { setCreatingSessionForProgram(null); setEditingSession(null); }}
          onSubmit={async (form, rows) => {
            if (!user) return;
            const fields = rowsToFields(rows);
            try {
              if (editingSession) {
                await updateLibrarySession(editingSession.id, {
                  title: form.title,
                  description: form.description || null,
                  type: form.type,
                  cycle: form.cycle.trim() || null,
                  notes: form.notes || null,
                  duration: fields.duration ?? null,
                  sets_reps: fields.sets_reps ?? null,
                  rest: fields.rest ?? null,
                  intensity: fields.intensity ?? null,
                  exercise_notes: fields.exercise_notes ?? null,
                  recurrence: form.recurrence,
                  frequency: form.frequency,
                });
                toast({ title: "Séance mise à jour" });
              } else {
                const pid = creatingSessionForProgram === "standalone" ? null : creatingSessionForProgram;
                const order = sessions.filter(s => s.program_id === pid).length;
                await createLibrarySession({
                  coachId: user.id,
                  title: form.title,
                  description: form.description,
                  type: form.type,
                  cycle: form.cycle.trim() || undefined,
                  notes: form.notes,
                  ...fields,
                  recurrence: form.recurrence,
                  frequency: form.frequency,
                  program_id: pid,
                  session_order: order,
                });
                toast({ title: "Séance ajoutée" });
              }
              setCreatingSessionForProgram(null);
              setEditingSession(null);
              await loadData();
            } catch { toast({ title: "Erreur", variant: "destructive" }); }
          }}
          onDelete={editingSession ? async () => {
            try {
              await deleteLibrarySession(editingSession.id);
              toast({ title: "Séance supprimée" });
              setEditingSession(null);
              await loadData();
            } catch { toast({ title: "Erreur", variant: "destructive" }); }
          } : undefined}
        />

        {assignDialogSession && (
          <AssignDialog
            session={assignDialogSession}
            members={members}
            coachId={user!.id}
            open={!!assignDialogSession}
            onOpenChange={open => !open && setAssignDialogSession(null)}
          />
        )}

        {assignProgram && (
          <AssignProgramDialog
            program={assignProgram}
            programSessions={sessions.filter(s => s.program_id === assignProgram.id)}
            members={members}
            coachId={user!.id}
            open={!!assignProgram}
            onOpenChange={(o) => !o && setAssignProgram(null)}
          />
        )}



        <BottomNav />
      </div>
    </PageTransition>
  );
}

// ============= Session Row =============

function SessionRow({ session, index, onEdit, onAssign }: {
  session: LibrarySession;
  index: number;
  onEdit: () => void;
  onAssign: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025, ease: "easeOut" }}
      className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
    >
      <span className="text-lg shrink-0">{taskTypeLabels[session.type]?.split(" ")[0] || "📋"}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground break-words">{session.title}</p>
        {session.description && (
          <p className="text-[11px] text-muted-foreground break-words line-clamp-1">{session.description}</p>
        )}
      </div>
      <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium">
        {session.frequency === 7 ? "7j" : `${session.frequency}x`}
      </span>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-background active:scale-95 transition-all"
        aria-label="Éditer"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button
        onClick={onAssign}
        className="p-1.5 rounded-lg hover:bg-background active:scale-95 transition-all"
        aria-label="Attribuer"
      >
        <Send className="w-3.5 h-3.5 text-primary" />
      </button>
    </motion.div>
  );
}

// ============= Program Dialog =============

function ProgramDialog({ open, program, onClose, onSubmit, onDelete }: {
  open: boolean;
  program: LibraryProgram | null;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(program?.title || "");
      setDescription(program?.description || "");
    }
  }, [open, program]);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    await onSubmit(title.trim(), description.trim());
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{program ? "Modifier le programme" : "Nouveau programme"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input
              autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Prépa marathon, Hypertrophie haut..."
              className="mt-1 bg-secondary border-0 rounded-xl h-10"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Objectifs, durée totale, particularités..."
              className="mt-1 bg-secondary border-0 rounded-xl resize-none" rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {onDelete && (
            <Button
              variant="destructive" size="sm" className="rounded-xl gap-1.5 mr-auto"
              onClick={async () => { setBusy(true); await onDelete(); setBusy(false); }}
              disabled={busy}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button size="sm" className="rounded-xl gap-1.5" onClick={submit} disabled={!title.trim() || busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {program ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Session Dialog (create / edit) =============

function SessionDialog({ open, session, existingCycles, onClose, onSubmit, onDelete }: {
  open: boolean;
  session: LibrarySession | null;
  existingCycles: string[];
  onClose: () => void;
  onSubmit: (form: ReturnType<typeof emptyForm>, rows: ReturnType<typeof emptyRow>[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState(emptyForm());
  const [rows, setRows] = useState([emptyRow()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      if (session) {
        setForm({
          title: session.title,
          description: session.description || "",
          type: (session.type as TaskType) || "other",
          cycle: session.cycle || "",
          notes: session.notes || "",
          recurrence: session.recurrence,
          frequency: session.frequency,
        });
        setRows(fieldsToRows(session));
      } else {
        setForm(emptyForm());
        setRows([emptyRow()]);
      }
    }
  }, [open, session]);

  const submit = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    await onSubmit(form, rows);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? "Modifier la séance" : "Nouvelle séance"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input
              autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Circuit Haut du corps"
              className="mt-1 bg-secondary border-0 rounded-xl h-10"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optionnel" className="mt-1 bg-secondary border-0 rounded-xl resize-none" rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as TaskType })}>
                <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(taskTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fréquence / sem.</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5, 6, 7].map(f => (
                  <button
                    key={f}
                    onClick={() => setForm({ ...form, frequency: f, recurrence: f >= 2 ? "daily" : "weekly" })}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      form.frequency === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Cycle</Label>
            <Input
              value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })}
              placeholder="Ex: Semaine 1, Cycle Force..."
              list="session-dialog-cycles"
              className="mt-1 bg-secondary border-0 rounded-xl h-10"
            />
            <datalist id="session-dialog-cycles">
              {existingCycles.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Exercices</Label>
            {rows.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-secondary/50 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Exercice {i + 1}</span>
                  {rows.length > 1 && (
                    <button onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Input value={row.name} onChange={e => { const r = [...rows]; r[i].name = e.target.value; setRows(r); }} placeholder="Nom exercice" className="bg-background border-0 rounded-xl h-9 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={row.sets_reps} onChange={e => { const r = [...rows]; r[i].sets_reps = e.target.value; setRows(r); }} placeholder="Séries/Reps" className="bg-background border-0 rounded-xl h-9 text-sm" />
                  <Input value={row.rest} onChange={e => { const r = [...rows]; r[i].rest = e.target.value; setRows(r); }} placeholder="Repos" className="bg-background border-0 rounded-xl h-9 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={row.intensity} onValueChange={v => { const r = [...rows]; r[i].intensity = v; setRows(r); }}>
                    <SelectTrigger className="bg-background border-0 rounded-xl h-9 text-sm"><SelectValue placeholder="Intensité" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Légère</SelectItem>
                      <SelectItem value="moderate">Modérée</SelectItem>
                      <SelectItem value="intense">Intense</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={row.note} onChange={e => { const r = [...rows]; r[i].note = e.target.value; setRows(r); }} placeholder="Note" className="bg-background border-0 rounded-xl h-9 text-sm" />
                </div>
              </motion.div>
            ))}
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setRows([...rows, emptyRow()])}>
              <Plus className="w-3 h-3 mr-1" /> Exercice
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes globales</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel" className="mt-1 bg-secondary border-0 rounded-xl resize-none" rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onDelete && (
            <Button
              variant="destructive" size="sm" className="rounded-xl gap-1.5 mr-auto"
              onClick={async () => { setBusy(true); await onDelete(); setBusy(false); }}
              disabled={busy}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button size="sm" className="rounded-xl gap-1.5" onClick={submit} disabled={!form.title.trim() || busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {session ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Assign Dialog =============

function AssignDialog({ session, members, coachId, open, onOpenChange }: {
  session: LibrarySession;
  members: MemberWithTasks[];
  coachId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [targetWeek, setTargetWeek] = useState(getCurrentWeekStart());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLoading(true);
      setTargetWeek(getCurrentWeekStart());
      getSessionAssignments(session.id)
        .then(a => setAssignedIds(new Set(a.map(x => x.member_id))))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, session.id]);

  const handleAssignReadonly = async (memberId: string) => {
    setActionLoading(memberId + "-ro");
    try {
      await assignSessionToMember(session.id, memberId);
      setAssignedIds(s => new Set(s).add(memberId));
      toast({ title: "Accès lecture accordé" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleAssignObjective = async (memberId: string) => {
    setActionLoading(memberId + "-obj");
    try {
      await assignSessionAsObjective(session, memberId, coachId, targetWeek);
      toast({ title: `Objectif créé pour la semaine du ${targetWeek}` });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  const handleRevoke = async (memberId: string) => {
    setActionLoading(memberId + "-rev");
    try {
      await revokeSessionFromMember(session.id, memberId);
      setAssignedIds(s => { const n = new Set(s); n.delete(memberId); return n; });
      toast({ title: "Accès révoqué" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
    finally { setActionLoading(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Attribuer la séance</DialogTitle>
          <p className="text-xs text-muted-foreground truncate mt-1">{session.title}</p>
        </DialogHeader>

        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">Semaine cible pour les objectifs</p>
          <WeekSelector weekStart={targetWeek} onChange={setTargetWeek} allowFuture />
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun membre</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto flex-1">
            {members.map(m => {
              const isAssigned = assignedIds.has(m.id);
              return (
                <div key={m.id} className="rounded-xl bg-muted/50 px-3 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                    {isAssigned && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">
                        Lecture ✓
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {!isAssigned && (
                      <Button
                        size="sm" variant="outline"
                        className="flex-1 h-8 gap-1 text-xs rounded-xl"
                        disabled={actionLoading?.startsWith(m.id) || false}
                        onClick={() => handleAssignReadonly(m.id)}
                      >
                        {actionLoading === m.id + "-ro" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                        Lecture seule
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 h-8 gap-1 text-xs rounded-xl"
                      disabled={actionLoading?.startsWith(m.id) || false}
                      onClick={() => handleAssignObjective(m.id)}
                    >
                      {actionLoading === m.id + "-obj" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Objectif semaine
                    </Button>
                    {isAssigned && (
                      <Button
                        size="sm" variant="destructive"
                        className="h-8 gap-1 text-xs rounded-xl px-2"
                        disabled={actionLoading?.startsWith(m.id) || false}
                        onClick={() => handleRevoke(m.id)}
                      >
                        {actionLoading === m.id + "-rev" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============= Assign Program Dialog =============

function AssignProgramDialog({ program, programSessions, members, coachId, open, onOpenChange }: {
  program: LibraryProgram;
  programSessions: LibrarySession[];
  members: MemberWithTasks[];
  coachId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [memberId, setMemberId] = useState<string>("");
  const [startWeek, setStartWeek] = useState(getCurrentWeekStart());
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setMemberId("");
      setStartWeek(getCurrentWeekStart());
    }
  }, [open]);

  const cyclePreview = useMemo(() => {
    const groups = new Map<string, number>();
    programSessions.forEach(s => {
      const k = s.cycle?.trim() || "Sans cycle";
      groups.set(k, (groups.get(k) || 0) + 1);
    });
    const keys = Array.from(groups.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
    return keys.map((k, idx) => {
      const d = new Date(startWeek + "T00:00:00");
      d.setDate(d.getDate() + idx * 7);
      const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      return { cycle: k, count: groups.get(k)!, weekLabel: label };
    });
  }, [programSessions, startWeek]);

  const handleAssign = async () => {
    if (!memberId) return;
    setBusy(true);
    try {
      const res = await assignProgramToMember(programSessions, memberId, coachId, startWeek);
      toast({
        title: "Programme attribué",
        description: `${res.sessions} séance(s) réparties sur ${res.cycles} semaine(s)`,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Attribuer le programme</DialogTitle>
          <p className="text-xs text-muted-foreground truncate mt-1">{program.title}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Membre</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl h-10">
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Semaine de départ (cycle 1)</Label>
            <WeekSelector weekStart={startWeek} onChange={setStartWeek} allowFuture />
          </div>

          {cyclePreview.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune séance dans ce programme.</p>
          ) : (
            <div className="rounded-xl bg-secondary/40 p-3 space-y-1.5 max-h-48 overflow-y-auto">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Répartition</p>
              {cyclePreview.map((c, i) => (
                <div key={c.cycle} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate flex-1">
                    <span className="text-primary mr-1">S{i + 1}</span>
                    {c.cycle}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {c.count} séance{c.count !== 1 ? "s" : ""} · {c.weekLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button
            size="sm" className="rounded-xl gap-1.5"
            onClick={handleAssign}
            disabled={!memberId || busy || cyclePreview.length === 0}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Attribuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
