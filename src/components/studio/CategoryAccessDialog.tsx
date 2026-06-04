import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getCategoryAssignments, assignCategoryToMember, revokeCategoryFromMember,
  type StudioCategory,
} from "@/services/studioService";

interface Props {
  category: StudioCategory | null;
  members: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryAccessDialog({ category, members, open, onOpenChange }: Props) {
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open && category) {
      setLoading(true);
      getCategoryAssignments(category.id)
        .then(a => setAssignedIds(new Set(a.map(x => x.member_id))))
        .catch(() => toast.error("Erreur de chargement"))
        .finally(() => setLoading(false));
    }
  }, [open, category]);

  const handleAssign = async (memberId: string) => {
    if (!category) return;
    setActionLoading(memberId);
    try {
      await assignCategoryToMember(category.id, memberId);
      setAssignedIds(s => new Set([...s, memberId]));
      toast.success("Accès accordé");
    } catch { toast.error("Erreur"); }
    finally { setActionLoading(null); }
  };

  const handleRevoke = async (memberId: string) => {
    if (!category) return;
    setActionLoading(memberId);
    try {
      await revokeCategoryFromMember(category.id, memberId);
      setAssignedIds(s => { const n = new Set(s); n.delete(memberId); return n; });
      toast.success("Accès retiré");
    } catch { toast.error("Erreur"); }
    finally { setActionLoading(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Accès : {category?.name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun membre</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(m => {
              const assigned = assignedIds.has(m.id);
              const busy = actionLoading === m.id;
              return (
                <div key={m.id} className="flex items-center justify-between px-2 py-2 rounded-xl bg-muted/40">
                  <span className="text-sm font-medium text-foreground">{m.name}</span>
                  <Button
                    size="sm"
                    variant={assigned ? "destructive" : "default"}
                    disabled={busy}
                    onClick={() => assigned ? handleRevoke(m.id) : handleAssign(m.id)}
                    className="gap-1.5 h-8"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : assigned ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {assigned ? "Retirer" : "Donner accès"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
