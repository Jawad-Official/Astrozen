import { createContext, Context } from 'react';
import { User, Organization, Team } from '@/types/auth';

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

const globalContextKey = '__AUTH_CONTEXT_OBJECT__';
type AuthWindow = Window & {
  [globalContextKey]?: Context<AuthContextType | undefined>;
};

if (typeof window !== 'undefined' && !(window as AuthWindow)[globalContextKey]) {
  (window as AuthWindow)[globalContextKey] = createContext<AuthContextType | undefined>(undefined);
}

export const AuthContext = (typeof window !== 'undefined' 
  ? (window as AuthWindow)[globalContextKey] 
  : createContext<AuthContextType | undefined>(undefined)) as Context<AuthContextType | undefined>;
