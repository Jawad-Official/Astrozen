import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG 
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { Project } from '@/types/issue';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DotsThree, Trash, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  IssueStatusIcon, 
  IssueTypeIcon, 
  IssuePriorityIcon, 
  IssueStatusBadge, 
  IssueIdentifier,
  getStatusColorClass 
} from './IssueAtomicComponents';

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
};

interface IssueRowProps {
  issue: Issue;
  parentIssue?: Issue;
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdate: (id: string, updates: Partial<Issue>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick?: () => void;
  onCreateSubIssue?: (parentId: string) => void;
}

export function IssueRow({ 
  issue, 
  parentIssue, 
  projects, 
  features, 
  orgMembers, 
  onUpdate, 
  onDelete, 
  onClick, 
  onCreateSubIssue 
}: IssueRowProps) {
  const { toast } = useToast();
  const feature = features.find((f) => f.id === issue.featureId);
  const project = feature ? projects.find((p) => p.id === feature.projectId) : null;
  const assigneeName = issue.assigneeName || orgMembers.find(m => m.id === issue.assignee)?.full_name || issue.assignee;
  
  const handleUpdate = async (updates: Partial<Issue>, label: string) => {
    try {
      await onUpdate(issue.id, updates);
      toast({ title: `${label} updated` });
    } catch (error: any) {
      toast({ 
        title: `Failed to update ${label.toLowerCase()}`, 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(issue.id);
      toast({ title: 'Issue deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete issue', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div 
      className={cn(
        'group relative grid grid-cols-[32px_75px_1fr_80px_32px] md:grid-cols-[32px_80px_1fr_100px_32px_85px_32px_32px] items-center gap-2 md:gap-2 px-4 py-2.5 cursor-pointer transition-all duration-200 border-b border-white/[0.02] last:border-none bg-white/[0.02] hover:bg-white/[0.04] first:rounded-t-xl last:rounded-b-xl hover:z-10 select-none tracking-tight',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
      )} 
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/[0.03] to-transparent pointer-events-none transition-opacity duration-300 rounded-xl" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button 
            className="relative z-20 hover:bg-white/5 p-1 rounded-md transition-all duration-150 flex justify-center focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Priority: ${issue.priority}`}
          >
            <IssuePriorityIcon priority={issue.priority} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-zinc-900/95 border-white/10 backdrop-blur-xl">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <DropdownMenuItem key={key} onClick={() => handleUpdate({ priority: key as any }, 'Priority')} className="focus:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-2">
                <IssuePriorityIcon priority={key} />
                <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative z-20 overflow-hidden">
        <IssueIdentifier identifier={issue.identifier} className="group-hover:text-white" />
      </div>
      
      <div className="flex items-center gap-2 min-w-0">
        {parentIssue && (
           <span className="text-sm font-medium text-muted-foreground truncate max-w-[120px]">
             {parentIssue.title} <span className="opacity-50 mx-1">&gt;</span>
           </span>
        )}
        <span className="truncate text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">{issue.title}</span>
      </div>

      <div className="hidden md:flex justify-center overflow-hidden">
        {feature && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden">
            <span className="shrink-0">{project?.icon || '🔹'}</span>
            <span className="truncate">{feature.name}</span>
          </div>
        )}
      </div>

      <div className="hidden md:flex justify-center">
        <IssueTypeIcon type={issue.issueType} className="opacity-50 group-hover:opacity-100" />
      </div>

      <div className="flex justify-center md:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="relative z-20 focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label={`Status: ${issue.status}`}>
              <IssueStatusBadge status={issue.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900/95 border-white/10 backdrop-blur-xl">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => handleUpdate({ status: key as any }, 'Status')} className="focus:bg-white/5 cursor-pointer">
                <span className="text-[10px] font-bold uppercase text-white/60">{config.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden md:flex justify-center">
        {assigneeName ? (
          <div className="h-6 w-6 rounded-full border border-primary/20 bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-[10px] font-bold text-primary shadow-inner">
            {getInitials(assigneeName)}
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full border border-dashed border-white/10 flex items-center justify-center">
            <div className="h-1 w-1 rounded-full bg-white/20" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Issue actions"
            >
              <DotsThree className="h-4 w-4 text-white/50 hover:text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 border-white/10 backdrop-blur-xl">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="focus:bg-white/5 cursor-pointer">Change status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-900/95 border-white/10">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleUpdate({ status: key as any }, 'Status')} className="focus:bg-white/5 cursor-pointer">
                    <IssueStatusIcon status={key as IssueStatus} className="mr-2" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="focus:bg-white/5 cursor-pointer">Change priority</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-900/95 border-white/10">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleUpdate({ priority: key as any }, 'Priority')} className="focus:bg-white/5 cursor-pointer">
                    <IssuePriorityIcon priority={key as any} className="mr-2" />
                    <span className={config.color}>{config.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={() => onCreateSubIssue?.(issue.id)} className="focus:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-2">
                 <Plus className="h-4 w-4 text-white/50" />
                 <span>Create sub-issue</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer" onClick={handleDelete}>
              <Trash className="mr-2 h-4 w-4" />
              Delete issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
