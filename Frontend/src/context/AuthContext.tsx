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
    // There's no client-readable token to check first anymore (see
    // SEC-7) - the only way to know if a session cookie exists is to ask
    // the server. A logged-out visitor just gets a 401 here, which
    // resolves to isAuthenticated: false the same as before.
    loadData();
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
    } catch (error: any) {
      // A 401 here is the normal, expected answer for a logged-out visitor
      // - the public landing page triggers this on every anonymous view, so
      // don't dirty the console with it. Anything else is worth reporting.
      if (error?.response?.status !== 401) {
        console.error("Failed to load auth data", error);
      }
      // Don't auto-logout on error, could be network. API client handles 401.
    } finally {
      setIsLoading(false);
    }
  }

  async function login(_token?: string) {
    // The backend already set the auth_token cookie on the login/register
    // response that produced this token - nothing to store client-side
    // (see SEC-7). The parameter is kept so existing callers that pass
    // the access token from the login response don't need to change.
    await loadData();
  }

  async function logout() {
    try {
      await authService.logout();
    } catch (error) {
      // Best-effort: still clear local state and navigate away even if
      // the request fails (e.g. offline) - the cookie will simply expire
      // on its own at worst.
      console.error("Logout request failed", error);
    }
    setUser(null);
    setOrganization(null);
    setTeams([]);
    // Signing out returns to the public landing page rather than dropping
    // the user straight onto a login form.
    window.location.href = "/";
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
