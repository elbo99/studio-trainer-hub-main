import { useEffect, useState } from "react";
import { Bell, Loader2, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getCoachNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  labelForNotification,
  type CoachNotification,
} from "@/services/coachNotificationsService";
import { assignProgramToMember } from "@/services/libraryService";
import { getCurrentWeekStart } from "@/components/WeekSelector";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const typeEmoji: Record<string, string> = {
  "member.created": "👋",
  "program.chosen": "🎯",
  "session.completed": "✅",
  "comment.left": "💬",
  "message.sent": "✉️",
};

const ASSIGNABLE_TYPES = new Set(["member.created", "program.chosen"]);

export function CoachNotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<CoachNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    memberId: string;
    memberName: string;
    programName: string;
    libraryProgramId: string | null;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const refreshCount = async () => {
    if (!user) return;
    try {
      const c = await getUnreadNotificationsCount(user.id);
      setUnread(c);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!user) return;
    refreshCount();
    const ch = supabase
      .channel("coach-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_notifications", filter: `coach_id=eq.${user.id}` },
        () => { refreshCount(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCoachNotifications(user.id, 20);
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      await loadItems();
      if (user) {
        try { await markAllNotificationsRead(user.id); setUnread(0); } catch (e) { console.error(e); }
      }
    }
  };

  const handleClick = (n: CoachNotification) => {
    setOpen(false);
    if (n.type === "message.sent") {
      navigate("/messages");
    } else if (n.member_id) {
      navigate(`/member/${n.member_id}`);
    }
  };

  const openAssignDialog = async (n: CoachNotification) => {
    if (!n.member_id) return;
    try {
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("name, onboarding_program_id")
        .eq("id", n.member_id)
        .maybeSingle();
      if (!prof) return;
      let programName = "Programme par défaut";
      let libraryProgramId: string | null = null;
      if (prof.onboarding_program_id) {
        const { data: prog } = await (supabase as any)
          .from("onboarding_programs")
          .select("name, library_program_id")
          .eq("id", prof.onboarding_program_id)
          .maybeSingle();
        if (prog) {
          programName = prog.name;
          libraryProgramId = prog.library_program_id;
        }
      }
      setAssignTarget({
        memberId: n.member_id,
        memberName: prof.name || "Membre",
        programName,
        libraryProgramId,
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const confirmAssign = async () => {
    if (!assignTarget || !user) return;
    setAssigning(true);
    try {
      if (!assignTarget.libraryProgramId) {
        toast({ title: "Aucun programme lié", description: "Ce programme n'a pas encore de séances en bibliothèque.", variant: "destructive" });
        return;
      }
      const { data: sessions } = await (supabase as any)
        .from("coach_library_sessions")
        .select("*")
        .eq("program_id", assignTarget.libraryProgramId)
        .order("session_order", { ascending: true });
      if (!sessions || sessions.length === 0) {
        toast({ title: "Programme vide", description: "Ajoute d'abord des séances à ce programme.", variant: "destructive" });
        return;
      }
      const res = await assignProgramToMember(sessions, assignTarget.memberId, user.id, getCurrentWeekStart());
      toast({ title: "Programme attribué ✅", description: `${res.sessions} séance(s) sur ${res.cycles} semaine(s).` });
      setAssignTarget(null);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-y-auto">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="font-semibold text-sm">Notifications</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune notification</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 hover:bg-secondary/60 transition-all ${!n.read_at ? "bg-primary/5" : ""}`}
                >
                  <button
                    onClick={() => handleClick(n)}
                    className="w-full text-left flex gap-2 active:scale-[0.99] transition-transform"
                  >
                    <span className="text-base shrink-0">{typeEmoji[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground break-words">{labelForNotification(n)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </button>
                  {ASSIGNABLE_TYPES.has(n.type) && n.member_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 ml-7 h-7 text-[11px] rounded-lg"
                      onClick={(e) => { e.stopPropagation(); openAssignDialog(n); }}
                    >
                      <Sparkles className="w-3 h-3 mr-1" /> Attribuer le programme
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={!!assignTarget} onOpenChange={(v) => { if (!v) setAssignTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'attribution</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Attribuer ce programme à :</p>
                <div className="rounded-xl bg-secondary p-3 text-sm">
                  <p><span className="text-muted-foreground">Membre :</span> <span className="font-semibold text-foreground">{assignTarget?.memberName}</span></p>
                  <p className="mt-1"><span className="text-muted-foreground">Programme :</span> <span className="font-semibold text-foreground">{assignTarget?.programName}</span></p>
                </div>
                <p className="text-xs text-muted-foreground">Les séances seront réparties automatiquement sur les semaines à venir.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assigning}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmAssign(); }} disabled={assigning}>
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer l'attribution"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
