import { createContext } from "react";
import { User, Organization, Team } from "@/types/auth";

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  teams: Team[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
