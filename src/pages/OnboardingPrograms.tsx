import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCoachPrograms, type LibraryProgram } from "@/services/libraryService";

interface OnboardingProgram {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  objective_key: string;
  weeks: number;
  cover_image_url: string | null;
  active: boolean;
  library_program_id: string | null;
}

const OBJECTIVE_OPTIONS = [
  "hyrox", "course", "remise_en_forme", "perte_de_poids",
  "renforcement", "respiration", "mobilite", "sante", "endurance", "autre",
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `prog-${Date.now()}`;

export default function OnboardingPrograms() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<OnboardingProgram[]>([]);
  const [libraryPrograms, setLibraryPrograms] = useState<LibraryProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OnboardingProgram | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, error }, libs] = await Promise.all([
        (supabase as any).from("onboarding_programs").select("*").order("name", { ascending: true }),
        getCoachPrograms(profile!.id),
      ]);
      if (error) throw error;
      setPrograms((data || []) as OnboardingProgram[]);
      setLibraryPrograms(libs);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    if (profile && profile.role !== "coach") {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (profile?.id) load();
  }, [profile, navigate, load]);

  const toggleActive = async (p: OnboardingProgram) => {
    const next = !p.active;
    setPrograms((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    const { error } = await (supabase as any)
      .from("onboarding_programs").update({ active: next }).eq("id", p.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setPrograms((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !next } : x)));
    }
  };

  const remove = async (p: OnboardingProgram) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    const { error } = await (supabase as any).from("onboarding_programs").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Programme supprimé" });
      setPrograms((prev) => prev.filter((x) => x.id !== p.id));
    }
  };

  const libraryName = (id: string | null) =>
    libraryPrograms.find((l) => l.id === id)?.title ?? null;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="px-5 pt-10 pb-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">Programmes d'inscription</h1>
          <p className="text-xs text-muted-foreground break-words">
            Configurez les programmes proposés aux nouveaux membres et liez-les à un programme de la bibliothèque.
          </p>
        </div>
      </header>

      <main className="px-5 py-5 space-y-3">
        <Button
          className="w-full rounded-2xl h-12"
          onClick={() => setCreating(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Nouveau programme
        </Button>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Aucun programme.</p>
        ) : (
          programs.map((p) => {
            const linkedName = libraryName(p.library_program_id);
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground break-words">{p.name}</h3>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {p.objective_key}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">{p.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">{p.weeks} semaines</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                    <span className={`text-[10px] font-semibold ${p.active ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {p.active ? "Disponible" : "Désactivé"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/50 border border-border px-3 py-2 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">Lié à :</span>
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {linkedName || <span className="italic text-muted-foreground">aucun programme</span>}
                  </span>
                  {linkedName && (
                    <button
                      onClick={() => navigate("/library")}
                      className="text-primary text-xs flex items-center gap-1 shrink-0"
                      title="Modifier dans la bibliothèque"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => setEditing(p)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {(editing || creating) && (
        <EditProgramDialog
          program={editing}
          libraryPrograms={libraryPrograms}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function EditProgramDialog({
  program,
  libraryPrograms,
  onClose,
  onSaved,
}: {
  program: OnboardingProgram | null;
  libraryPrograms: LibraryProgram[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(program?.name ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [objectiveKey, setObjectiveKey] = useState(program?.objective_key ?? "autre");
  const [weeks, setWeeks] = useState<number>(program?.weeks ?? 4);
  const [libraryProgramId, setLibraryProgramId] = useState<string>(program?.library_program_id ?? "none");
  const [active, setActive] = useState<boolean>(program?.active ?? true);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || null,
        objective_key: objectiveKey,
        weeks,
        active,
        library_program_id: libraryProgramId === "none" ? null : libraryProgramId,
      };
      if (program) {
        const { error } = await (supabase as any)
          .from("onboarding_programs").update(payload).eq("id", program.id);
        if (error) throw error;
        toast({ title: "Programme mis à jour" });
      } else {
        payload.slug = slugify(name);
        const { error } = await (supabase as any).from("onboarding_programs").insert(payload);
        if (error) throw error;
        toast({ title: "Programme créé" });
      }
      onSaved();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{program ? "Modifier le programme" : "Nouveau programme"}</DialogTitle>
          <DialogDescription>
            Le contenu (séances, cycles) se gère dans la bibliothèque via le programme lié.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Programme Hyrox" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold">Objectif</Label>
              <Select value={objectiveKey} onValueChange={setObjectiveKey}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVE_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold">Durée (semaines)</Label>
              <Input
                type="number" min={1} value={weeks}
                onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">Programme de la bibliothèque</Label>
            <Select value={libraryProgramId} onValueChange={setLibraryProgramId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {libraryPrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sera attribué automatiquement au membre lorsqu'il choisit ce programme.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm font-semibold">Disponible à l'inscription</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "..." : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
