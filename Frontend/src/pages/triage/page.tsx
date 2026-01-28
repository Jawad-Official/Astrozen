import { useIssueStore } from '@/store/issueStore';
import { IssueBar } from '@/components/IssueBar';
import { Badge } from '@/components/ui/badge';
import { 
  Tray as TriageIcon, 
} from '@phosphor-icons/react';
import { useOutletContext } from 'react-router-dom';

interface MainLayoutContext {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

const TriagePage = () => {
  const { 
    getTriageIssues, 
    setSelectedIssue,
    projects,
    features,
    updateIssue,
    deleteIssue,
    orgMembers,
  } = useIssueStore();
  const { onCreateIssue } = useOutletContext<MainLayoutContext>();
  
  const triageIssues = getTriageIssues();
  
  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-[#090909]">
      <div className="border-b border-white/5 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <TriageIcon className="h-5 w-5 text-orange-400" />
          <h1 className="text-lg font-semibold tracking-tight">Triage</h1>
          {triageIssues.length > 0 && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              {triageIssues.length}
            </Badge>
          )}
        </div>
      </div>
      
      <IssueBar.List 
        issues={triageIssues} 
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

export default TriagePage;
