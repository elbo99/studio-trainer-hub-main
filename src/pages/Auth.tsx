import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Mail, Eye, EyeOff, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { InstallHelp } from "@/components/InstallHelp";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setFirstName("");
    setLastName("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp) {
      if (password.length < 6) {
        setError("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }
      if (password !== passwordConfirm) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setError("Prénom et nom sont requis");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await signUp(email, password, fullName, "member");
        if (error) {
          if (error.message.includes("already registered")) {
            setError("Cet email est déjà utilisé");
          } else {
            setError(error.message);
          }
          return;
        }
        toast({ title: "Compte créé ✅", description: "Bienvenue dans Studio Gym 360" });
        // Auto sign-in after sign-up (email auto-confirm is enabled)
        await signIn(email, password);
        navigate("/onboarding");
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            setError("Email ou mot de passe incorrect");
          } else {
            setError(error.message);
          }
          return;
        }
        toast({ title: "Bienvenue 👋" });
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-12 pb-8 px-6 flex flex-col items-center text-center"
      >
        <img src={logo} alt="Studio Gym" className="w-28 h-28 rounded-full mb-4" />
        <h1 className="text-2xl text-foreground font-sans font-bold">Studio Gym 360</h1>
        <p className="text-muted-foreground mt-1">Le sport qui s'adapte à votre quotidien</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 px-6 pb-8"
      >
        <div className="bg-card rounded-3xl p-6 border border-border">
          <div className="flex bg-secondary rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); resetForm(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                !isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <User className="w-4 h-4" />
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); resetForm(); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Créer un compte
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mb-4">
            {isSignUp
              ? "Crée ton compte membre et démarre ton accompagnement."
              : "Connectez-vous avec vos identifiants."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-sm text-muted-foreground">Prénom</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setError(""); }}
                    placeholder="Prénom"
                    className="mt-1 h-14 bg-secondary border-0 rounded-2xl px-4"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm text-muted-foreground">Nom</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setError(""); }}
                    placeholder="Nom"
                    className="mt-1 h-14 bg-secondary border-0 rounded-2xl px-4"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="votre@email.com"
                  className="pl-12 h-14 bg-secondary border-0 rounded-2xl"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground">Mot de passe</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="pl-12 pr-12 h-14 bg-secondary border-0 rounded-2xl"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isSignUp && <p className="text-xs text-muted-foreground mt-1">Minimum 6 caractères</p>}
            </div>

            {isSignUp && (
              <div>
                <Label htmlFor="passwordConfirm" className="text-sm text-muted-foreground">Confirmer le mot de passe</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="passwordConfirm"
                    type={showPassword ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => { setPasswordConfirm(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="pl-12 h-14 bg-secondary border-0 rounded-2xl"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl text-base font-semibold mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
              ) : (
                <>
                  {isSignUp ? "Créer mon compte" : "Se connecter"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
        <div className="mt-4">
          <InstallHelp />
        </div>
      </motion.div>
    </div>
  );
}
