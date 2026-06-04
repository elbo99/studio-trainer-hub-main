import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Sparkles, ShieldCheck, MessageCircle, Activity, BookOpen, Smartphone, Target, ChevronDown, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { upsertMemberIndicators } from "@/services/indicatorsService";

const GOAL_OPTIONS = [
  "Perte de poids",
  "Reprise sportive",
  "Performance / Hyrox",
  "Course à pied",
  "Renforcement musculaire",
  "Santé / bien-être",
  "Autre",
];
const LEVEL_OPTIONS = ["Débutant", "Intermédiaire", "Avancé"];
const FREQUENCY_OPTIONS = ["1", "2", "3", "4+"];

// Sport objective options shown on step 4 — each maps to an `objective_key` in onboarding_programs
const OBJECTIVES: { key: string; label: string; emoji: string }[] = [
  { key: "hyrox", label: "Hyrox", emoji: "🏋️" },
  { key: "course", label: "Course à pied", emoji: "🏃" },
  { key: "remise_en_forme", label: "Remise en forme", emoji: "💪" },
  { key: "perte_de_poids", label: "Perte de poids", emoji: "🔥" },
  { key: "renforcement", label: "Renforcement musculaire", emoji: "🏋️‍♂️" },
  { key: "respiration", label: "Respiration", emoji: "🌬️" },
  { key: "mobilite", label: "Mobilité", emoji: "🤸" },
  { key: "sante", label: "Santé & bien-être", emoji: "🧘" },
  { key: "endurance", label: "Endurance", emoji: "⚡" },
  { key: "autre", label: "Autre", emoji: "✨" },
];

const DEFAULT_COACH = {
  id: "b311644c-9014-4e77-b1f8-c57aecf0cc99",
  name: "Guillaume",
  role: "Coach Studio Gym",
  avatar: "https://bvswrxdxfqtdwbplycoy.supabase.co/storage/v1/object/public/avatars/b311644c-9014-4e77-b1f8-c57aecf0cc99/avatar-1780081511599.jpg",
};

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [coachExpanded, setCoachExpanded] = useState(false);

  // Step 1
  const [goal, setGoal] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [level, setLevel] = useState("");
  const [frequency, setFrequency] = useState("");
  const [constraints, setConstraints] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (profile && (profile as any).onboarding_completed_at) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const buildGoalNotes = () => {
    const parts: string[] = [];
    if (goalDescription.trim()) parts.push(goalDescription.trim());
    if (level) parts.push(`Niveau: ${level}`);
    if (frequency) parts.push(`Fréquence: ${frequency} séance(s) / semaine`);
    if (constraints.trim()) parts.push(`Contraintes: ${constraints.trim()}`);
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    return parts.join(" | ");
  };

  const handleSubmitQuestionnaire = async () => {
    if (!user) return;
    if (!goal) {
      toast({ title: "Sélectionne ton objectif principal", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await upsertMemberIndicators({
        member_id: user.id,
        main_goal: goal,
        goal_deadline: deadline || null,
        goal_notes: buildGoalNotes() || null,
        current_weight: weight ? Number(weight) : null,
        zone1_min: null, zone1_max: null,
        zone2_min: null, zone2_max: null,
        zone3_min: null, zone3_max: null,
        zone4_min: null, zone4_max: null,
        zone5_min: null, zone5_max: null,
        resting_hr: null, max_hr: null,
      });
      setStep(2);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseCoach = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assign-coach", {
        body: { coachId: DEFAULT_COACH.id, finalize: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStep(3);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible d'assigner le coach", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseOffer = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ onboarding_offer: "studio_hybrid" })
        .eq("id", user.id);
      if (error) throw error;
      setStep(4);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseObjective = async (objKey: string) => {
    if (!user) return;
    setLoading(true);
    try {
      // Find an active program for this objective (fallback to "autre")
      const { data: prog } = await (supabase as any)
        .from("onboarding_programs")
        .select("id, library_program_id")
        .eq("active", true)
        .eq("objective_key", objKey)
        .maybeSingle();

      let programId: string | null = prog?.id ?? null;
      let libraryProgramId: string | null = prog?.library_program_id ?? null;
      if (!programId) {
        const { data: fb } = await (supabase as any)
          .from("onboarding_programs")
          .select("id, library_program_id")
          .eq("active", true)
          .eq("objective_key", "autre")
          .maybeSingle();
        programId = fb?.id ?? null;
        libraryProgramId = fb?.library_program_id ?? null;
      }

      // Auto-assign the linked library program (sessions spread over weeks)
      let assignedCount = 0;
      if (libraryProgramId) {
        try {
          const { data: sessions } = await (supabase as any)
            .from("coach_library_sessions")
            .select("*")
            .eq("program_id", libraryProgramId)
            .order("session_order", { ascending: true });
          if (sessions && sessions.length > 0) {
            const today = new Date();
            const day = today.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            today.setDate(today.getDate() + diff);
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, "0");
            const d = String(today.getDate()).padStart(2, "0");
            const weekStart = `${y}-${m}-${d}`;
            const { assignProgramToMember } = await import("@/services/libraryService");
            const res = await assignProgramToMember(sessions as any, user.id, DEFAULT_COACH.id, weekStart);
            assignedCount = res.sessions;
          }
        } catch (assignErr: any) {
          console.error("Auto-assign program failed:", assignErr);
        }
      }

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          onboarding_objective: objKey,
          onboarding_program_id: programId,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      toast({
        title: "Programme attribué ✅",
        description: assignedCount > 0
          ? `${assignedCount} séance(s) ajoutées à ton espace.`
          : "Ton coach finalise le contenu — disponible très prochainement.",
      });
      setStep(5);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const titleByStep: Record<number, string> = {
    1: `Bienvenue${profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} !`,
    2: "Choisis ton coach",
    3: "Choisissez votre accompagnement",
    4: "Quel est votre objectif principal ?",
    5: "Bienvenue dans Studio Gym 360",
  };
  const subtitleByStep: Record<number, string> = {
    1: "Quelques questions pour personnaliser ton accompagnement.",
    2: "Une étape avant de choisir ton accompagnement.",
    3: "Un programme structuré, un suivi humain et un accompagnement qui s'adapte à votre quotidien.",
    4: "On t'attribue un programme adapté à ton objectif.",
    5: "Tout est prêt.",
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-10 pb-6 px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Étape {step} sur {TOTAL_STEPS}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{titleByStep[step]}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{subtitleByStep[step]}</p>
      </motion.div>

      <div className="px-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 bg-card rounded-3xl p-5 border border-border">
            <div>
              <Label className="text-sm font-semibold">Quel est ton objectif principal ?</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button key={g} type="button" onClick={() => setGoal(g)}
                    className={`text-left px-3 py-3 rounded-2xl text-sm font-medium border transition-all active:scale-95 ${goal === g ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"}`}>
                    {goal === g && <Check className="inline w-4 h-4 mr-1" />}{g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="goalDesc" className="text-sm font-semibold">Décris ton objectif</Label>
              <Textarea id="goalDesc" value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="En quelques mots..." className="mt-2 bg-secondary border-0 rounded-2xl" rows={3} />
            </div>

            <div>
              <Label htmlFor="deadline" className="text-sm font-semibold">Date cible <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-2 h-12 bg-secondary border-0 rounded-2xl" />
            </div>

            <div>
              <Label className="text-sm font-semibold">Niveau actuel</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {LEVEL_OPTIONS.map((l) => (
                  <button key={l} type="button" onClick={() => setLevel(l)}
                    className={`px-2 py-3 rounded-2xl text-xs font-medium border transition-all active:scale-95 leading-tight break-words ${level === l ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"}`}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Séances par semaine</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button key={f} type="button" onClick={() => setFrequency(f)}
                    className={`px-2 py-3 rounded-2xl text-sm font-medium border transition-all active:scale-95 ${frequency === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-foreground"}`}>{f}</button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="constraints" className="text-sm font-semibold">Blessures / contraintes <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Textarea id="constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="Décris tes éventuelles douleurs ou limitations..." className="mt-2 bg-secondary border-0 rounded-2xl" rows={2} />
            </div>

            <div>
              <Label htmlFor="weight" className="text-sm font-semibold">Poids actuel <span className="text-muted-foreground font-normal">(kg, optionnel)</span></Label>
              <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72.5" className="mt-2 h-12 bg-secondary border-0 rounded-2xl" />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-semibold">Notes personnelles <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tout ce que ton coach devrait savoir..." className="mt-2 bg-secondary border-0 rounded-2xl" rows={3} />
            </div>

            <Button onClick={handleSubmitQuestionnaire} disabled={loading} className="w-full h-14 rounded-2xl text-base font-semibold mt-4">
              {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" /> : <>Continuer <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <button
              type="button"
              onClick={() => setCoachExpanded((v) => !v)}
              className="w-full bg-card rounded-3xl p-6 border border-border text-center transition-all active:scale-[0.99] hover:border-primary/40"
              aria-expanded={coachExpanded}
            >
              <img src={DEFAULT_COACH.avatar} alt={DEFAULT_COACH.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="w-28 h-28 rounded-full mx-auto mb-4 object-cover border-4 border-primary/20" />
              <h2 className="text-xl font-bold text-foreground">{DEFAULT_COACH.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Coach sportif • Fondateur Studio Gym</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                {coachExpanded ? "Réduire" : "En savoir plus sur Guillaume"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${coachExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {coachExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <div className="bg-card rounded-3xl p-6 border border-border">
                      <h3 className="text-lg font-bold text-foreground">À propos de Guillaume</h3>
                      <p className="text-xs uppercase tracking-wide text-primary font-semibold mt-1">Coach sportif • Fondateur Studio Gym</p>

                      <div className="mt-5 space-y-4 text-sm leading-relaxed text-foreground">
                        <p className="font-semibold">Mon objectif : mettre mon expertise au service de votre progression.</p>
                        <p className="text-muted-foreground">
                          Avec plus de 7 ans d'expérience dans le domaine du fitness et de la remise en forme, ainsi qu'une centaine de personnes accompagnées, j'ai développé une approche structurée, personnalisée et orientée résultats.
                        </p>
                        <p className="text-muted-foreground">Chaque accompagnement est construit autour d'un principe simple :</p>
                        <p className="font-semibold text-foreground italic">Le sport doit s'adapter à votre quotidien, et non l'inverse.</p>
                        <p className="text-muted-foreground">
                          Que votre objectif soit une remise en forme, une perte de poids, une préparation Hyrox, un retour au sport ou simplement l'envie de vous sentir mieux au quotidien, mon rôle est de vous guider étape après étape.
                        </p>
                        <p className="text-muted-foreground">
                          Je me réjouis de vous rencontrer et d'échanger avec vous autour de vos objectifs afin de construire un accompagnement adapté à vos besoins.
                        </p>
                      </div>
                    </div>

                    <div className="bg-card rounded-3xl p-6 border border-border">
                      <h3 className="text-lg font-bold text-foreground mb-4">Pourquoi choisir Guillaume ?</h3>
                      <ul className="space-y-3">
                        {[
                          "Plus de 7 ans d'expérience",
                          "Plus de 100 personnes accompagnées",
                          "Ancien sportif de haut niveau",
                          "Coach spécialisé en accompagnement personnalisé",
                          "Suivi humain et réactif",
                          "Application Studio Gym 360 incluse",
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                            <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-3xl p-6 border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Quote className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Ma philosophie</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground italic">
                        « Le sport doit s'intégrer dans votre vie. Ensemble, nous construisons un accompagnement réaliste, durable et adapté à votre quotidien. »
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={handleChooseCoach} disabled={loading} className="w-full h-14 rounded-2xl text-base font-semibold">
              {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" /> : <>Choisir {DEFAULT_COACH.name} comme coach <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
            <button type="button" onClick={() => setStep(1)} disabled={loading} className="w-full text-sm text-muted-foreground py-2 flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Revenir au questionnaire
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-card rounded-3xl p-6 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">Offre</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Studio Hybrid</h2>
              <p className="text-sm text-muted-foreground mt-1">Programme + suivi humain par {DEFAULT_COACH.name}.</p>

              <ul className="mt-5 space-y-3 text-sm text-foreground">
                {[
                  { icon: Target, t: "Programme adapté à votre objectif" },
                  { icon: ShieldCheck, t: `Suivi par ${DEFAULT_COACH.name}` },
                  { icon: MessageCircle, t: "Messagerie directe avec votre coach" },
                  { icon: Activity, t: "Ajustements en fonction de votre progression" },
                  { icon: BookOpen, t: "Ressources Studio Work incluses" },
                  { icon: Smartphone, t: "Accès à l'application Studio Gym 360" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="break-words">{t}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 p-3 rounded-2xl bg-secondary text-xs text-muted-foreground leading-relaxed">
                Chaque membre suit une structure de programme, mais l'accompagnement reste personnalisé. Votre coach suit votre évolution et peut ajuster votre parcours si nécessaire.
              </div>
            </div>

            <Button onClick={handleChooseOffer} disabled={loading} className="w-full h-14 rounded-2xl text-base font-semibold">
              {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" /> : <>Choisir Studio Hybrid <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  disabled={loading}
                  onClick={() => handleChooseObjective(o.key)}
                  className="text-left p-4 rounded-2xl bg-card border border-border hover:border-primary transition-all active:scale-95 disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">{o.emoji}</div>
                  <div className="text-sm font-semibold text-foreground break-words">{o.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 text-center">
            <div className="bg-card rounded-3xl p-8 border border-border">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-foreground leading-relaxed">
                Votre programme est prêt. {DEFAULT_COACH.name} va prochainement prendre contact avec vous afin de découvrir votre situation et personnaliser votre accompagnement.
              </p>
            </div>
            <Button onClick={() => { window.location.href = "/dashboard"; }} className="w-full h-14 rounded-2xl text-base font-semibold">
              Accéder à mon espace <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
