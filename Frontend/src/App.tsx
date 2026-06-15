import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RequireAuth } from "@/components/RequireAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { IconContext } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";

const AllIssuesPage = lazy(() => import("@/pages/all-issues/page"));
const InboxPage = lazy(() => import("@/pages/inbox/page"));
const MyIssuesPage = lazy(() => import("@/pages/my-issues/page"));
const ProjectsPage = lazy(() => import("@/pages/projects/page"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/[projectId]/page"));
const InsightsPage = lazy(() => import("@/pages/insights/page"));
const SettingsPage = lazy(() => import("@/pages/settings/page"));
const TeamSettingsPage = lazy(() => import("@/pages/teams/[teamId]/settings/page"));
const FeaturesPage = lazy(() => import("@/pages/features/page"));
const AIGeneratorPage = lazy(() => import("@/pages/ai-generator/page"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const OrganizationSetup = lazy(() => import("@/pages/auth/OrganizationSetup"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <IconContext.Provider
      value={{
        color: "currentColor",
        size: "1em",
        weight: "regular",
        mirrored: false,
      }}
    >
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes (No Layout) */}
              <Route path="/org-setup" element={
                <RequireAuth>
                  <OrganizationSetup />
                </RequireAuth>
              } />

              {/* Application Routes (With Layout) */}
              <Route element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }>
                <Route path="/" element={<Navigate to="/all-issues" replace />} />
                <Route path="/all-issues" element={<AllIssuesPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/my-issues" element={<MyIssuesPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/features/:featureId" element={<FeaturesPage />} /> {/* Feature details can be handled in-page or via sidebar */}
                <Route path="/ai-generator" element={<AIGeneratorPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/teams/:teamId/settings" element={<TeamSettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
    </IconContext.Provider>
  </QueryClientProvider>
  );
};

export default App;
