import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Loader2, Ban, RotateCcw } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_TYPE_LABELS,
  createAppointment,
  getCoachAppointments,
  setAppointmentStatus,
  updateAppointment,
  type Appointment,
  type AppointmentType,
} from "@/services/appointmentsService";

type MemberOption = { id: string; name: string };

type FormState = {
  id: string | null;
  status: Appointment["status"];
  type: AppointmentType;
  memberId: string; // "none" = aucun membre
  title: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  notes: string;
};

const NO_MEMBER = "none";

const TYPE_TONES: Record<AppointmentType, string> = {
  coaching_prive: "bg-primary/15 text-primary",
  coaching_duo: "bg-primary/15 text-primary",
  small_group: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  yoga: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  kids: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  bloque: "bg-muted text-muted-foreground",
  autre: "bg-secondary text-secondary-foreground",
};

const toLocalDate = (date: string, time: string) => new Date(`${date}T${time}:00`);

function emptyForm(day: Date): FormState {
  return {
    id: null,
    status: "confirme",
    type: "coaching_prive",
    memberId: NO_MEMBER,
    title: "",
    date: format(day, "yyyy-MM-dd"),
    start: "09:00",
    end: "10:00",
    notes: "",
  };
}

export default function CoachAgenda() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const loadWeek = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setAppointments(await getCoachAppointments(user.id, weekStart, addDays(weekStart, 7)));
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast({ title: "Impossible de charger l'agenda", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, weekStart, toast]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, name")
      .eq("coach_id", user.id)
      .eq("role", "member")
      .order("name")
      .then(({ data }) => setMembers(data || []));
  }, [user]);

  const openEdit = (a: Appointment) => {
    const s = new Date(a.starts_at);
    const e = new Date(a.ends_at);
    setForm({
      id: a.id,
      status: a.status,
      type: a.type,
      memberId: a.member_id ?? NO_MEMBER,
      title: a.title ?? "",
      date: format(s, "yyyy-MM-dd"),
      start: format(s, "HH:mm"),
      end: format(e, "HH:mm"),
      notes: a.notes ?? "",
    });
  };

  const handleSave = async () => {
    if (!user || !form) return;
    const startsAt = toLocalDate(form.date, form.start);
    const endsAt = toLocalDate(form.date, form.end);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      toast({ title: "Date ou heure invalide", variant: "destructive" });
      return;
    }
    if (endsAt <= startsAt) {
      toast({ title: "L'heure de fin doit être après le début", variant: "destructive" });
      return;
    }
    const input = {
      memberId: form.memberId === NO_MEMBER ? null : form.memberId,
      type: form.type,
      title: form.title.trim() || null,
      startsAt,
      endsAt,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      if (form.id) await updateAppointment(form.id, input);
      else await createAppointment(user.id, input);
      toast({ title: form.id ? "Rendez-vous modifié ✅" : "Rendez-vous ajouté ✅" });
      setForm(null);
      loadWeek();
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCancel = async () => {
    if (!form?.id) return;
    const next = form.status === "annule" ? "confirme" : "annule";
    setSaving(true);
    try {
      await setAppointmentStatus(form.id, next);
      toast({ title: next === "annule" ? "Rendez-vous annulé" : "Rendez-vous rétabli" });
      setForm(null);
      loadWeek();
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}`;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-12 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground text-xs">Agenda</h1>
              <p className="text-sm text-muted-foreground">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="outline" className="rounded-xl h-8 w-8" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Semaine précédente">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Aujourd'hui
              </Button>
              <Button size="icon" variant="outline" className="rounded-xl h-8 w-8" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Semaine suivante">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.header>

        <main className="px-5 space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            days.map((day) => {
              const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.starts_at), day));
              const isToday = isSameDay(day, new Date());
              return (
                <section key={day.toISOString()} className={cn("bg-card rounded-2xl p-3", isToday && "ring-1 ring-primary/40")}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground text-sm capitalize">
                      {format(day, "EEEE d MMMM", { locale: fr })}
                    </h2>
                    <button
                      onClick={() => setForm(emptyForm(day))}
                      className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-90 transition-transform"
                      aria-label="Ajouter un rendez-vous"
                    >
                      <Plus className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                  {dayAppointments.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">Aucun rendez-vous</p>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {dayAppointments.map((a) => {
                        const cancelled = a.status === "annule";
                        const who = a.member_id ? memberName.get(a.member_id) : null;
                        return (
                          <button
                            key={a.id}
                            onClick={() => openEdit(a)}
                            className={cn(
                              "w-full bg-secondary/60 rounded-xl p-2.5 flex items-start gap-2.5 text-left active:scale-[0.98] transition-transform",
                              cancelled && "opacity-50"
                            )}
                          >
                            <div className="text-xs font-semibold text-foreground tabular-nums w-[78px] shrink-0">
                              {format(new Date(a.starts_at), "HH:mm")}–{format(new Date(a.ends_at), "HH:mm")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm text-foreground break-words", cancelled && "line-through")}>
                                {a.title || who || APPOINTMENT_TYPE_LABELS[a.type]}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                <span className={cn("inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-medium", TYPE_TONES[a.type])}>
                                  {APPOINTMENT_TYPE_LABELS[a.type]}
                                </span>
                                {who && a.title && <span className="text-[10px] text-muted-foreground">{who}</span>}
                                {cancelled && <span className="text-[10px] text-destructive font-medium">Annulé</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </main>

        <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent className="rounded-2xl max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{form?.id ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}</DialogTitle>
            </DialogHeader>
            {form && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AppointmentType })}>
                    <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map((t) => (
                        <SelectItem key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Membre</Label>
                  <Select value={form.memberId} onValueChange={(v) => setForm({ ...form, memberId: v })}>
                    <SelectTrigger className="mt-1 bg-secondary border-0 rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MEMBER}>Aucun (créneau bloqué / groupe)</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Titre (optionnel)</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Bilan, Yoga du mardi…" className="mt-1 bg-secondary border-0 rounded-xl h-10" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 bg-secondary border-0 rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Début</Label>
                    <Input type="time" step={300} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-1 bg-secondary border-0 rounded-xl h-10" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fin</Label>
                    <Input type="time" step={300} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-1 bg-secondary border-0 rounded-xl h-10" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notes (privées)</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 bg-secondary border-0 rounded-xl min-h-[60px]" />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              {form?.id && (
                <Button variant="outline" onClick={handleToggleCancel} disabled={saving} className="rounded-xl">
                  {form.status === "annule" ? <><RotateCcw className="w-4 h-4 mr-1" />Rétablir</> : <><Ban className="w-4 h-4 mr-1" />Annuler le RDV</>}
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} className="rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    </PageTransition>
  );
}
