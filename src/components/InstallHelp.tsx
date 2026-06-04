import { useState } from "react";
import { Smartphone, Share, MoreVertical, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="text-sm text-foreground leading-relaxed">{children}</span>
    </li>
  );
}

export function InstallHelp() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-left active:scale-[0.98] transition-transform">
          <Smartphone className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm text-foreground flex-1">
            Comment ajouter Studio Gym 360 sur mon écran d'accueil ?
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Installer Studio Gym 360</DialogTitle>
          <DialogDescription>
            Ajoute l'app sur ton écran d'accueil pour y accéder en un tap, comme une vraie app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* iPhone */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Share className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Sur iPhone</h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground ml-auto">
                Safari
              </span>
            </div>
            <ol className="space-y-2.5">
              <Step n={1}>Ouvre Studio Gym 360 dans Safari.</Step>
              <Step n={2}>
                Appuie sur l'icône de partage <Share className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" /> en bas de l'écran.
              </Step>
              <Step n={3}>Sélectionne « Sur l'écran d'accueil ».</Step>
              <Step n={4}>Appuie sur « Ajouter ».</Step>
            </ol>
          </section>

          {/* Android */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <MoreVertical className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Sur Android</h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground ml-auto">
                Chrome
              </span>
            </div>
            <ol className="space-y-2.5">
              <Step n={1}>Ouvre Studio Gym 360 dans Chrome.</Step>
              <Step n={2}>
                Appuie sur les trois points <MoreVertical className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" /> en haut à droite.
              </Step>
              <Step n={3}>Sélectionne « Ajouter à l'écran d'accueil ».</Step>
              <Step n={4}>
                Confirme avec « Ajouter » <Plus className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" />.
              </Step>
            </ol>
          </section>

          <button
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <X className="w-4 h-4" /> Fermer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
