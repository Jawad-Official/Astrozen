// Auth provider component and useAuth hook
import { useContext, useEffect, useState, ReactNode } from "react";
import { User, Organization, Team } from "@/types/auth";
import { authService } from "@/services/auth";
import { organizationService } from "@/services/organization";
import { teamService } from "@/services/teams";
import { AuthContext } from "./AuthContextObject";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadData() {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);

      if (userData.organizationId) {
        const [orgData, teamsData] = await Promise.all([
          organizationService.getMyOrganization(),
          teamService.getAll(),
        ]);
        setOrganization(orgData);
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Failed to load auth data", error);
      // Don't auto-logout on error, could be network. API client handles 401.
    } finally {
      setIsLoading(false);
    }
  }

  async function login(token: string) {
    localStorage.setItem("token", token);
    await loadData();
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setOrganization(null);
    setTeams([]);
    window.location.href = "/login";
  }

  const value = {
    user,
    organization,
    teams,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: loadData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
