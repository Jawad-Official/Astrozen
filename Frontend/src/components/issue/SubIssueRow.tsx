import { useIssueStore } from '@/store/issueStore';
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
import { DotsThree, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  IssueStatusIcon, 
  IssueTypeIcon, 
  IssuePriorityIcon, 
  IssueStatusBadge, 
  IssueIdentifier
} from './IssueAtomicComponents';

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
};

interface SubIssueRowProps {
  issue: Issue;
  parentIssue: Issue;
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdate: (id: string, updates: Partial<Issue>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick?: () => void;
}

export function SubIssueRow({ 
  issue, 
  parentIssue: initialParent, 
  projects, 
  features, 
  orgMembers, 
  onUpdate, 
  onDelete, 
  onClick 
}: SubIssueRowProps) {
  const { getIssueById } = useIssueStore();
  const parentIssue = initialParent || (issue.parentId ? getIssueById(issue.parentId) : undefined);
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
      toast({ title: 'Sub-issue deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete sub-issue', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div 
      className={cn(
        'group relative grid grid-cols-[32px_75px_1fr_80px_32px] md:grid-cols-[32px_80px_1fr_100px_32px_85px_32px_32px] items-center gap-2 md:gap-2 px-4 py-2 cursor-pointer transition-all duration-300 border-b border-white/[0.02] last:border-none bg-white/[0.03] hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl hover:z-10 hover:scale-[1.01] select-none tracking-tight'
      )} 
      onClick={onClick}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-500 rounded-xl" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="relative z-20 hover:bg-white/5 p-1 rounded transition-colors flex justify-center">
            <IssuePriorityIcon priority={issue.priority} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10 backdrop-blur-md">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <DropdownMenuItem key={key} onClick={() => handleUpdate({ priority: key as any }, 'Priority')} className="focus:bg-white/5">
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
        <span className="truncate text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
          {issue.title}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground/50">
          <span className="text-[10px] font-bold">&gt;</span>
          <span className="text-[11px] font-medium truncate max-w-[120px]">
            {parentIssue.title}
          </span>
        </div>
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
            <button className="relative z-20">
              <IssueStatusBadge status={issue.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 backdrop-blur-md">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => handleUpdate({ status: key as any }, 'Status')} className="focus:bg-white/5">
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
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10">
              <DotsThree className="h-4 w-4 text-white/50 hover:text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/10 backdrop-blur-md">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="focus:bg-white/5">Change status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-900 border-white/10">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleUpdate({ status: key as any }, 'Status')} className="focus:bg-white/5">
                    <IssueStatusIcon status={key as IssueStatus} className="mr-2" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="focus:bg-white/5">Change priority</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-900 border-white/10">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => handleUpdate({ priority: key as any }, 'Priority')} className="focus:bg-white/5">
                    <IssuePriorityIcon priority={key as any} className="mr-2" />
                    <span className={config.color}>{config.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={handleDelete}>
              <Trash className="mr-2 h-4 w-4" />
              Delete sub-issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
