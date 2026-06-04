import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useNavigate } from "react-router-dom";
import { LogOut, Link2, Check, Copy, Bell, BellOff, Camera } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Achievements } from "@/components/Achievements";
import { CoachCard } from "@/components/CoachCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/services/coachService";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [coachCode, setCoachCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { enabled: notifEnabled, supported: notifSupported, permission, toggle: toggleNotif } = useNotifications();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast({ title: "Photo mise à jour 📸" });
    } catch {
      toast({ title: "Erreur lors de l'upload", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleLinkCoach = async () => {
    if (!coachCode.trim() || !user) return;
    setLinking(true);
    try {
      const { data: coach, error: coachError } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("id", coachCode.trim())
        .single();

      if (coachError || !coach) {
        toast({ title: "Coach introuvable", variant: "destructive" });
        return;
      }
      if (coach.role !== "coach") {
        toast({ title: "Cet utilisateur n'est pas un coach", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ coach_id: coach.id })
        .eq("id", user.id);
      if (error) throw error;

      toast({ title: "Coach relié ✅" });
      setCoachCode("");
      window.location.reload();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  if (!profile) return null;

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-20">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-5 pt-12 pb-2"
      >
        <h1 className="font-bold text-foreground text-xs">Mon Profil</h1>
      </motion.header>

      <main className="px-5 space-y-3 mt-2">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 group active:scale-95 transition-transform"
              aria-label="Changer la photo de profil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/15 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground break-words">{profile.name}</h2>
              <p className="text-sm text-muted-foreground break-words">{profile.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {profile.role === "coach" ? "Coach" : "Membre"}
              </span>
            </div>
          </div>
        </motion.div>

        {profile.role === "member" && user && <CoachCard memberId={user.id} variant="full" />}
        {profile.role === "member" && user && <Achievements memberId={user.id} compact />}

        {/* Coach Linking */}
        {profile.role === "member" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Relier un coach</h3>
            </div>

            {profile.coach_id ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 rounded-xl p-3">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-foreground">Coach relié</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Entrez l'identifiant de votre coach
                </p>
                <div className="flex gap-2">
                  <Input
                    value={coachCode}
                    onChange={(e) => setCoachCode(e.target.value)}
                    placeholder="ID du coach"
                    className="flex-1 bg-secondary border-0 rounded-xl text-sm h-10"
                  />
                  <Button
                    onClick={handleLinkCoach}
                    disabled={!coachCode.trim() || linking}
                    className="rounded-xl px-4 h-10 active:scale-95 transition-transform"
                    size="sm"
                  >
                    {linking ? "..." : "Relier"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Coach ID */}
        {profile.role === "coach" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Mon identifiant coach</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Partagez cet identifiant avec vos membres
            </p>
            <div className="bg-secondary rounded-xl p-3 flex items-center gap-2">
              <code className="text-xs text-foreground flex-1 break-all select-all">{profile.id}</code>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl shrink-0 active:scale-95 transition-transform"
                onClick={() => {
                  navigator.clipboard.writeText(profile.id);
                  toast({ title: "Copié! 📋" });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Notifications */}
        {notifSupported && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  {notifEnabled ? (
                    <Bell className="w-4 h-4 text-primary" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    {permission === "denied"
                      ? "Bloquées par le navigateur"
                      : notifEnabled
                      ? "Activées"
                      : "Désactivées"}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifEnabled}
                onCheckedChange={toggleNotif}
                disabled={permission === "denied"}
              />
            </div>
          </motion.div>
        )}

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full h-12 rounded-2xl text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-transform"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
