import { User, Team } from '@/types/auth';

export function hasTeamAccess(user: User | null, team: Team | undefined): boolean {
  if (!user || !team) return false;
  
  // Everyone in the same organization (determined by backend list) has access
  return true;
}

export function canManageTeam(user: User | null, team: Team | undefined): boolean {
  if (!user || !team) return false;
  
  // Admins can manage everything
  if (user.role === 'admin') return true;
  
  // Only leaders can manage specific team settings
  return team.leaders.some(leader => leader.id === user.id);
}
