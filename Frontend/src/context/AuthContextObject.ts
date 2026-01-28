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

// Global context storage to survive HMR better
const globalContextKey = '__AUTH_CONTEXT_OBJECT__';

if (typeof window !== 'undefined' && !(window as any)[globalContextKey]) {
  (window as any)[globalContextKey] = createContext<AuthContextType | undefined>(undefined);
}

export const AuthContext = (typeof window !== 'undefined' 
  ? (window as any)[globalContextKey] 
  : createContext<AuthContextType | undefined>(undefined)) as Context<AuthContextType | undefined>;
