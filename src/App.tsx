import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CoachDashboard from "./pages/CoachDashboard";
import MemberDetail from "./pages/MemberDetail";
import Progress from "./pages/Progress";
import StudioWork from "./pages/StudioWork";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Library from "./pages/Library";
import MesIndicateurs from "./pages/MesIndicateurs";
import Onboarding from "./pages/Onboarding";
import OnboardingPrograms from "./pages/OnboardingPrograms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles, skipOnboardingCheck }: { children: React.ReactNode; allowedRoles?: ("coach" | "member")[]; skipOnboardingCheck?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Force members through onboarding until completed
  if (!skipOnboardingCheck && profile?.role === "member" && !profile.onboarding_completed_at) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {profile?.role === "coach" ? <Navigate to="/coach" replace /> : <Dashboard />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute allowedRoles={["coach"]}>
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/member/:memberId"
          element={
            <ProtectedRoute allowedRoles={["coach"]}>
              <MemberDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <Progress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute allowedRoles={["coach"]}>
              <Library />
            </ProtectedRoute>
          }
        />
        <Route
          path="/indicateurs"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <MesIndicateurs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <StudioWork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowedRoles={["member"]} skipOnboardingCheck>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/programs"
          element={
            <ProtectedRoute allowedRoles={["coach"]}>
              <OnboardingPrograms />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
