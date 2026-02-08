import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { IconContext } from "@phosphor-icons/react";

// Pages
import AllIssuesPage from "@/pages/all-issues/page";
import InboxPage from "@/pages/inbox/page";
import MyIssuesPage from "@/pages/my-issues/page";
import ProjectsPage from "@/pages/projects/page";
import ProjectDetailPage from "@/pages/projects/[projectId]/page";
import InsightsPage from "@/pages/insights/page";
import SettingsPage from "@/pages/settings/page";
import TeamSettingsPage from "@/pages/teams/[teamId]/settings/page";
import FeaturesPage from "@/pages/features/page";
import NewIdeaPage from "@/pages/ideas/NewIdeaPage";
import IdeaReportPage from "@/pages/ideas/IdeaReportPage";
import IdeaDetailsPage from "@/pages/ideas/IdeaDetailsPage";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import OrganizationSetup from "@/pages/auth/OrganizationSetup";

const queryClient = new QueryClient();

const App = () => (
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                <Route path="/ideas/new" element={<NewIdeaPage />} />
                <Route path="/ideas/:ideaId/report" element={<IdeaReportPage />} />
                <Route path="/ideas/:ideaId/details" element={<IdeaDetailsPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/features/:featureId" element={<FeaturesPage />} /> {/* Feature details can be handled in-page or via sidebar */}
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/teams/:teamId/settings" element={<TeamSettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </IconContext.Provider>
  </QueryClientProvider>
);

export default App;
