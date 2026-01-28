import { useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { IssueBar } from '@/components/IssueBar';
import { Issue, IssueStatus, STATUS_CONFIG, Project } from '@/types/issue';
import { Feature } from '@/types/feature';


interface StatusGroupProps {
  status: IssueStatus;
  label: string;
  issues: Issue[];
  onIssueClick: (id: string) => void;
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  onDeleteIssue: (id: string) => Promise<void>;
  onCreateSubIssue?: (parentId: string) => void;
  defaultExpanded?: boolean;
}

export function StatusGroup({ 
  status, 
  label, 
  issues, 
  onIssueClick, 
  projects,
  features,
  orgMembers,
  onUpdateIssue,
  onDeleteIssue,
  onCreateSubIssue,
  defaultExpanded = true 
}: StatusGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const statusIssues = issues.filter(i => i.status === status);
  
  // Create issue map for O(1) parent lookup
  // We use all 'issues' passed to the component to find parents even if they are in different status
  const issueMap = new Map(issues.map(i => [i.id, i]));
  
  if (statusIssues.length === 0) return null;
  
  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground w-full group"
      >
        <CaretRight weight="bold" className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{STATUS_CONFIG[status].label}</span>
        <span className="text-xs ml-1 opacity-40">{statusIssues.length}</span>
      </button>
      
      {expanded && (
        <div className="space-y-[1px]">
          {statusIssues.map(issue => {
            const parentIssue = issue.parentId ? issueMap.get(issue.parentId) : undefined;
            
            if (issue.parentId && parentIssue) {
              return (
                <IssueBar.SubRow
                  key={issue.id}
                  issue={issue}
                  parentIssue={parentIssue}
                  projects={projects}
                  features={features}
                  orgMembers={orgMembers}
                  onUpdate={onUpdateIssue}
                  onDelete={onDeleteIssue}
                  onClick={() => onIssueClick(issue.id)}
                />
              );
            }

            return (
              <IssueBar.Row 
                key={issue.id} 
                issue={issue} 
                projects={projects} 
                features={features} 
                orgMembers={orgMembers} 
                onUpdate={onUpdateIssue} 
                onDelete={onDeleteIssue} 
                onClick={() => onIssueClick(issue.id)} 
                onCreateSubIssue={onCreateSubIssue}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
