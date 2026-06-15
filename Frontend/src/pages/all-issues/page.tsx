import { useEffect, useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { useAuth } from '@/context/AuthContext';
import { hasTeamAccess } from '@/lib/permissions';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { IssueBar } from '@/components/IssueBar';
import { AllIssuesHeader } from '@/components/AllIssuesHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { Lock } from '@phosphor-icons/react';

interface MainLayoutContext {
  onCreateIssue: () => void;
  onCreateSubIssue: (parentId: string) => void;
  onOpenCommandPalette: () => void;
}

const AllIssuesPage = () => {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const { user, teams } = useAuth();
  
  const { 
    viewMode, 
    setCurrentView, 
    getFilteredIssues, 
    updateIssue, 
    deleteIssue, 
    setSelectedIssue, 
    projects,
    features,
    orgMembers,
    isLoading
  } = useIssueStore();
  const { onCreateIssue, onCreateSubIssue, onOpenCommandPalette } = useOutletContext<MainLayoutContext>();
  
  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
  const hasAccess = useMemo(() => {
    if (!teamId) return true;
    return hasTeamAccess(user, selectedTeam);
  }, [user, selectedTeam, teamId]);

  const issues = getFilteredIssues();
  const filteredIssues = useMemo(() => {
    if (!hasAccess) return [];
    return teamId 
      ? issues.filter(issue => issue.teamId === teamId)
      : issues;
  }, [issues, teamId, hasAccess]);

  useEffect(() => {
    setCurrentView('all');
  }, [setCurrentView]);

  if (teamId && !hasAccess) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <AllIssuesHeader 
          onCreateIssue={onCreateIssue}
          onOpenCommandPalette={onOpenCommandPalette}
        />
        <EmptyState
          icon={<Lock weight="duotone" className="h-8 w-8 text-muted-foreground/40" />}
          title="Restricted Access"
          description={`You don't have permission to view data for the ${selectedTeam?.name || 'requested'} team. Only admins and team leaders can access this information.`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <AllIssuesHeader 
        onCreateIssue={onCreateIssue}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      {viewMode === 'list' ? (
        <IssueBar.List 
          issues={filteredIssues} 
          projects={projects}
          features={features}
          orgMembers={orgMembers}
          loading={isLoading}
          onUpdateIssue={updateIssue}
          onDeleteIssue={deleteIssue}
          onSelectIssue={setSelectedIssue}
          onCreateIssue={onCreateIssue}
          onCreateSubIssue={onCreateSubIssue}
        />
      ) : (
        <IssueBar.Board 
          issues={filteredIssues} 
          projects={projects}
          features={features}
          orgMembers={orgMembers}
          onUpdateIssue={updateIssue}
          onCreateIssue={onCreateIssue}
        />
      )}
    </div>
  );
};

export default AllIssuesPage;
