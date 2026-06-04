import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { availableIcons, categoryPresets } from "@/services/studioService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, icon: string, subtitle: string, description: string) => Promise<void>;
  initialName?: string;
  initialIcon?: string;
  initialSubtitle?: string;
  initialDescription?: string;
  title: string;
  showPresets?: boolean;
}

export function CategoryFormDialog({
  open, onOpenChange, onSubmit,
  initialName = "", initialIcon = "📁",
  initialSubtitle = "", initialDescription = "",
  title, showPresets = true,
}: Props) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName); setIcon(initialIcon);
      setSubtitle(initialSubtitle); setDescription(initialDescription);
    }
  }, [open, initialName, initialIcon, initialSubtitle, initialDescription]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim(), icon, subtitle.trim(), description.trim());
      onOpenChange(false);
    } catch { /* handled upstream */ }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {showPresets && !initialName && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryPresets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { setName(p.name); setIcon(p.icon); setSubtitle(p.subtitle); }}
                    className="px-2.5 py-1 rounded-full text-xs bg-secondary hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <span>{p.icon}</span><span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Nom</label>
            <Input placeholder="Ex: Perte de poids" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Sous-titre (court)</label>
            <Input placeholder="Méthode complète pour…" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Description (optionnel)</label>
            <Textarea
              placeholder="Présentez la méthode, à qui elle s'adresse, ce qu'elle contient…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Icône</p>
            <div className="flex flex-wrap gap-2">
              {availableIcons.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    icon === ic ? "bg-primary/20 ring-2 ring-primary scale-110" : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Enregistrement..." : "Valider"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
