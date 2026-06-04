import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Target, Save, Loader2, ChevronDown, Scale, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getMemberIndicators,
  upsertMemberIndicators,
  ZONE_COLORS,
  type MemberIndicators,
} from "@/services/indicatorsService";

const emptyState = (memberId: string): MemberIndicators => ({
  member_id: memberId,
  zone1_min: null, zone1_max: null,
  zone2_min: null, zone2_max: null,
  zone3_min: null, zone3_max: null,
  zone4_min: null, zone4_max: null,
  zone5_min: null, zone5_max: null,
  resting_hr: null, max_hr: null,
  main_goal: null, goal_deadline: null, goal_notes: null,
  current_weight: null,
});

export default function MesIndicateurs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<MemberIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const existing = await getMemberIndicators(user.id);
        setData(existing ?? emptyState(user.id));
      } catch (e) {
        console.error(e);
        setData(emptyState(user.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const setField = <K extends keyof MemberIndicators>(key: K, value: MemberIndicators[K]) => {
    setData((d) => (d ? { ...d, [key]: value } : d));
  };

  const numInput = (key: keyof MemberIndicators, placeholder = "—") => (
    <Input
      type="number"
      inputMode="numeric"
      value={(data?.[key] as number | null) ?? ""}
      onChange={(e) =>
        setField(key, e.target.value === "" ? null : Number(e.target.value) as any)
      }
      className="bg-secondary border-0 rounded-xl h-10"
      placeholder={placeholder}
    />
  );

  const handleSave = async () => {
    if (!data || !user) return;
    setSaving(true);
    try {
      const saved = await upsertMemberIndicators({ ...data, member_id: user.id });
      setData(saved);
      toast({ title: "Indicateurs enregistrés ✅" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground px-5 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="font-bold text-xs">Mes indicateurs</h1>
          <p className="text-sm opacity-90 mt-1">
            Renseignez votre objectif et vos infos essentielles.
          </p>
        </motion.div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* ===== Niveau 1 — Objectif ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Mon objectif principal</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Quel est votre objectif ?</Label>
              <Input
                value={data.main_goal ?? ""}
                onChange={(e) => setField("main_goal", e.target.value || null)}
                placeholder="Ex: Me sentir mieux dans mon corps"
                className="bg-secondary border-0 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date cible</Label>
              <Input
                type="date"
                value={data.goal_deadline ?? ""}
                onChange={(e) => setField("goal_deadline", e.target.value || null)}
                className="bg-secondary border-0 rounded-xl mt-1"
              />
            </div>
          </div>
        </motion.section>

        {/* ===== Niveau 1 — Poids (optionnel) ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold">Poids actuel <span className="text-xs text-muted-foreground font-normal">(optionnel)</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {numInput("current_weight", "Ex: 68")}
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        </motion.section>

        {/* ===== Niveau 1 — Notes ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Notes personnelles</h2>
          </div>
          <Textarea
            value={data.goal_notes ?? ""}
            onChange={(e) => setField("goal_notes", e.target.value || null)}
            placeholder="Pourquoi cet objectif ? Contraintes, motivations, antécédents…"
            rows={3}
            className="bg-secondary border-0 rounded-xl resize-none"
          />
        </motion.section>

        {/* ===== Niveau 2 — Section avancée repliable ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <button
            onClick={() => setAdvancedOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2 text-left">
              <Heart className="h-5 w-5 text-rose-500" />
              <div>
                <h2 className="font-semibold">Paramètres avancés</h2>
                <p className="text-[11px] text-muted-foreground">
                  Fréquence cardiaque et zones d'entraînement
                </p>
              </div>
            </div>
            <motion.div animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ces réglages sont utiles si vous suivez votre fréquence cardiaque avec une montre.
                      Sinon, vous pouvez laisser vide — votre coach s'en occupera si besoin.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">FC repos (bpm)</Label>
                      {numInput("resting_hr")}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">FC max (bpm)</Label>
                      {numInput("max_hr")}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Zones cardiaques</h3>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((z) => {
                        const c = ZONE_COLORS[z];
                        return (
                          <div key={z} className="flex items-center gap-2">
                            <div className={`shrink-0 w-16 h-10 rounded-xl ${c.bg} ${c.text} flex flex-col items-center justify-center`}>
                              <span className="text-[10px] leading-none opacity-80">Zone</span>
                              <span className="text-sm font-bold leading-tight">{z}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-muted-foreground mb-0.5 truncate">{c.label}</div>
                              <div className="flex items-center gap-2">
                                {numInput(`zone${z}_min` as keyof MemberIndicators)}
                                <span className="text-muted-foreground text-xs">–</span>
                                {numInput(`zone${z}_max` as keyof MemberIndicators)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-2xl active:scale-95 transition-transform"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <><Save className="h-5 w-5 mr-2" /> Enregistrer</>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
