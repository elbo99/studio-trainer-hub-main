import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { ChevronRight, CheckCircle, Clock, XCircle, Plus, X, Loader2, MessageCircle, Target, Flame, Activity, Users, TrendingUp, AlertTriangle, TrendingDown, MessageSquareWarning, Zap } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getCoachMembers, type MemberWithTasks } from "@/services/membersService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CoachNotificationsBell } from "@/components/coach/CoachNotificationsBell";

export default function CoachDashboard() {
  const [members, setMembers] = useState<MemberWithTasks[]>([]);
  const [unreadByMember, setUnreadByMember] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "" });
  const [creatingMember, setCreatingMember] = useState(false);
  const navigate = useNavigate();
  const { user, profile, createMember } = useAuth();
  const { toast } = useToast();

  const loadMembers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getCoachMembers(user.id);
      setMembers(data);

      const { data: unreadMessages } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (unreadMessages) {
        const counts: Record<string, number> = {};
        unreadMessages.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
        setUnreadByMember(counts);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role !== "coach") { navigate("/dashboard"); return; }
    loadMembers();
  }, [profile, navigate, loadMembers]);

  const handleCreateMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim() || !newMember.password.trim()) {
      toast({ title: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    if (newMember.password.length < 6) {
      toast({ title: "Mot de passe : 6 caractères minimum", variant: "destructive" });
      return;
    }
    setCreatingMember(true);
    try {
      const { error } = await createMember(newMember.email, newMember.password, newMember.name);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
      toast({ title: "Membre ajouté ✅" });
      setNewMember({ name: "", email: "", password: "" });
      setIsAdding(false);
      loadMembers();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setCreatingMember(false);
    }
  };

  const formatRelative = (iso?: string | null) => {
    if (!iso) return "Aucune validation";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d === 1) return "hier";
    if (d < 7) return `il y a ${d}j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Aggregate dashboard stats
  const totalUnread = Object.values(unreadByMember).reduce((a, b) => a + b, 0);
  const activeToday = members.filter(m => m.activeToday).length;

  // Average completion rate across members (per-member %, then averaged)
  const membersWithObjectives = members.filter(m => (m.weekStats?.targetUnits || 0) > 0);
  const avgCompletion = membersWithObjectives.length > 0
    ? Math.round(
        membersWithObjectives.reduce((acc, m) => {
          const ws = m.weekStats!;
          return acc + (ws.doneUnits / ws.targetUnits) * 100;
        }, 0) / membersWithObjectives.length
      )
    : 0;

  // Day of week progress expectation (Mon=1 ... Sun=7)
  const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const expectedPct = Math.round((todayDow / 7) * 100);

  // Inactive 7+ days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const inactiveMembers = members.filter(m => {
    if (!m.lastCompletionAt) return true;
    return new Date(m.lastCompletionAt).getTime() < sevenDaysAgo;
  });

  // En retard sur objectif : progression réelle < (jour de la semaine / 7) - 20%
  const lateMembers = members.filter(m => {
    const ws = m.weekStats;
    if (!ws || ws.targetUnits === 0) return false;
    const pct = (ws.doneUnits / ws.targetUnits) * 100;
    return pct < Math.max(0, expectedPct - 20);
  });

  // Messages sans réponse = membres avec messages non lus côté coach
  const unansweredMembers = members.filter(m => (unreadByMember[m.id] || 0) > 0);

  // Action prioritaires (déduplication + raison)
  type Priority = { member: MemberWithTasks; reasons: string[]; severity: number };
  const priorityMap = new Map<string, Priority>();
  const addReason = (m: MemberWithTasks, reason: string, weight: number) => {
    const existing = priorityMap.get(m.id);
    if (existing) {
      existing.reasons.push(reason);
      existing.severity += weight;
    } else {
      priorityMap.set(m.id, { member: m, reasons: [reason], severity: weight });
    }
  };
  inactiveMembers.forEach(m => addReason(m, "Inactif depuis 7 jours", 3));
  lateMembers.forEach(m => addReason(m, "En retard sur l'objectif", 2));
  unansweredMembers.forEach(m => addReason(m, `${unreadByMember[m.id]} message${unreadByMember[m.id] > 1 ? "s" : ""} sans réponse`, 2));
  const priorities = Array.from(priorityMap.values()).sort((a, b) => b.severity - a.severity);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub, tone = "default" }: { icon: any; label: string; value: string | number; sub?: string; tone?: "default" | "danger" | "warning" | "success" | "primary" }) => {
    const toneClass = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-500" : tone === "success" ? "text-emerald-500" : tone === "primary" ? "text-primary" : "text-foreground";
    return (
      <div className="bg-card rounded-2xl p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]"><Icon className="w-3.5 h-3.5" />{label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`font-bold text-base ${toneClass}`}>{value}</span>
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-20">
      <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground text-xs">Espace Coach</h1>
            <p className="text-sm text-muted-foreground">{members.length} membre{members.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <CoachNotificationsBell />
            <Button onClick={() => navigate("/coach/programs")} size="sm" variant="outline" className="rounded-xl active:scale-95 transition-transform">
              Programmes
            </Button>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm" className="rounded-xl active:scale-95 transition-transform">
                <Plus className="w-4 h-4 mr-1" />
                Nouveau
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="px-5 space-y-3 mt-2">
        {members.length > 0 && (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
              <StatCard icon={Users} label="Membres actifs" value={members.length} />
              <StatCard icon={TrendingUp} label="Complétion moyenne" value={`${avgCompletion}%`} tone={avgCompletion >= 70 ? "success" : avgCompletion >= 40 ? "primary" : "warning"} />
              <StatCard icon={AlertTriangle} label="En retard" value={lateMembers.length} sub={`/ ${members.length}`} tone={lateMembers.length > 0 ? "warning" : "default"} />
              <StatCard icon={Activity} label="Inactifs 7j+" value={inactiveMembers.length} sub={`/ ${members.length}`} tone={inactiveMembers.length > 0 ? "danger" : "default"} />
              <StatCard icon={MessageCircle} label="Messages non lus" value={totalUnread} tone={totalUnread > 0 ? "danger" : "default"} />
              <StatCard icon={Activity} label="Actifs aujourd'hui" value={activeToday} sub={`/ ${members.length}`} tone="success" />
            </motion.div>

            {/* Actions prioritaires */}
            {priorities.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-destructive/10 via-amber-500/5 to-transparent border border-destructive/20 rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-foreground text-sm">Actions prioritaires</h2>
                    <p className="text-[11px] text-muted-foreground">{priorities.length} membre{priorities.length > 1 ? "s" : ""} à contacter</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {priorities.slice(0, 5).map(({ member, reasons }) => (
                    <button
                      key={member.id}
                      onClick={() => navigate(`/member/${member.id}`)}
                      className="w-full bg-card/80 backdrop-blur rounded-xl p-2.5 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform"
                    >
                      <UserAvatar name={member.name} avatarUrl={(member as any).avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm break-words">{member.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {reasons.map((r, idx) => {
                            const isInactive = r.includes("Inactif");
                            const isLate = r.includes("retard");
                            const isMsg = r.includes("message");
                            const Icon = isInactive ? Activity : isLate ? TrendingDown : MessageSquareWarning;
                            const cls = isInactive
                              ? "bg-destructive/15 text-destructive"
                              : isLate
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-primary/15 text-primary";
                            return (
                              <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${cls}`}>
                                <Icon className="w-3 h-3" />
                                {r}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}


        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Nouveau membre</h3>
              <button onClick={() => setIsAdding(false)} className="active:scale-90 transition-transform">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Jean Dupont" className="mt-1 bg-secondary border-0 rounded-xl h-10" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="email@exemple.com" className="mt-1 bg-secondary border-0 rounded-xl h-10" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mot de passe</Label>
              <Input type="password" value={newMember.password} onChange={(e) => setNewMember({ ...newMember, password: e.target.value })} placeholder="Min. 6 caractères" className="mt-1 bg-secondary border-0 rounded-xl h-10" />
            </div>
            <Button onClick={handleCreateMember} disabled={creatingMember} className="w-full rounded-xl h-10 active:scale-[0.98] transition-transform">
              {creatingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer"}
            </Button>
          </motion.div>
        )}

        {/* Members List */}
        {members.map((member, i) => {
          const ws = member.weekStats || { total: 0, done: 0, pending: 0, notDone: 0, targetUnits: 0, doneUnits: 0 };
          const pct = ws.targetUnits > 0 ? Math.round((ws.doneUnits / ws.targetUnits) * 100) : 0;
          const unread = unreadByMember[member.id] || 0;
          return (
            <motion.button
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/member/${member.id}`)}
              className="w-full bg-card rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <UserAvatar name={member.name} avatarUrl={(member as any).avatar_url} size="lg" className="rounded-xl" />
                  {member.activeToday && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" title="Actif aujourd'hui" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-[15px] break-words">{member.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Dernière validation : {formatRelative(member.lastCompletionAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {unread > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      <MessageCircle className="w-3 h-3" />{unread}
                    </span>
                  )}
                  {ws.targetUnits > 0 && (
                    <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-500" : pct >= 50 ? "text-primary" : "text-amber-500"}`}>{pct}%</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {member.weeklyObjective && (
                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 rounded-lg px-2 py-1.5">
                  <Target className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                  <span className="break-words line-clamp-2">{member.weeklyObjective}</span>
                </div>
              )}

              {ws.targetUnits > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{ws.doneUnits}</span> / {ws.targetUnits} validations cette semaine
                    </span>
                    <span className="text-muted-foreground">{ws.total} obj.</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-500"><CheckCircle className="w-3 h-3" />{ws.done}</span>
                    <span className="flex items-center gap-1 text-amber-500"><Clock className="w-3 h-3" />{ws.pending}</span>
                    {ws.notDone > 0 && (
                      <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" />{ws.notDone}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Aucun objectif cette semaine</p>
              )}
            </motion.button>
          );
        })}

        {members.length === 0 && !isAdding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">Créez votre premier membre</p>
            <Button onClick={() => setIsAdding(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Créer un membre
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
