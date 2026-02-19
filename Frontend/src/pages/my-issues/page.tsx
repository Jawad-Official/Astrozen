import { useIssueStore } from '@/store/issueStore';
import { IssueBar } from '@/components/IssueBar';
import { useAuth } from '@/context/AuthContext';
import { useOutletContext } from 'react-router-dom';

interface MainLayoutContext {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

const MyIssuesPage = () => {
  const { user } = useAuth();
  const { onCreateIssue } = useOutletContext<MainLayoutContext>();
  const { getMyIssues, currentUser, updateIssue, deleteIssue, setSelectedIssue, projects, features, orgMembers } = useIssueStore();
  
  const myIssues = getMyIssues();
  const displayName = user?.fullName || currentUser || 'User';
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#090909]">
      <div className="border-b border-white/5 p-6 flex items-center gap-4 bg-[#090909] shrink-0">
        <div className="h-10 w-10 rounded-full border border-white/10 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
          {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white/90">My Issues</h1>
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mt-0.5">
            {myIssues.length} issues assigned to you
          </p>
        </div>
      </div>
      
      <IssueBar.List 
        issues={myIssues} 
        projects={projects}
        features={features}
        orgMembers={orgMembers}
        onUpdateIssue={updateIssue}
        onDeleteIssue={deleteIssue}
        onSelectIssue={setSelectedIssue}
        onCreateIssue={onCreateIssue}
      />
    </div>
  );
};

export default MyIssuesPage;
