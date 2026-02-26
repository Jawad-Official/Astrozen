import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useIssueStore } from '@/store/issueStore';
import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  Project
} from '@/types/issue';
import { Feature } from '@/types/feature';
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
  IssuePriorityIcon
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
  const lastDraggedStatus = useRef<IssueStatus | null>(null);
  
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

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'backlog': return 'text-zinc-400';
      case 'todo': return 'text-zinc-300';
      case 'in_progress': return 'text-yellow-400';
      case 'done': return 'text-emerald-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <motion.div 
      layout
      drag="y"
      dragElastic={1} 
      whileDrag={{ 
        pointerEvents: "none", 
        zIndex: 100, 
        scale: 1.02,
        x: [-2, 2, -2, 2, 0], 
        rotate: [0, 0.5, -0.5, 0.5, 0], 
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)"
      }}
      onDrag={(_, info) => {
        const x = info.point.x;
        const y = info.point.y;
        const statusElements = document.querySelectorAll('[data-status]');
        let closestStatus: IssueStatus | null = null;
        let minDistance = Infinity;

        statusElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const dx = Math.max(rect.left - x, 0, x - rect.right);
          const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            closestStatus = el.getAttribute('data-status') as IssueStatus;
          }
        });

        if (closestStatus && closestStatus !== lastDraggedStatus.current) {
          lastDraggedStatus.current = closestStatus;
        }
      }}
      onDragEnd={(_, info) => {
        const x = info.point.x;
        const y = info.point.y;
        const statusElements = document.querySelectorAll('[data-status]');
        let closestStatus: IssueStatus | null = null;
        let minDistance = Infinity;

        statusElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const dx = Math.max(rect.left - x, 0, x - rect.right);
          const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            closestStatus = el.getAttribute('data-status') as IssueStatus;
          }
        });

        lastDraggedStatus.current = null;
        if (closestStatus && closestStatus !== issue.status) {
          onUpdate(issue.id, { status: closestStatus });
        }
      }}
      className="flex flex-col group/row"
    >
      <div 
        className={cn(
          'group relative grid grid-cols-[60px_32px_32px_1fr_100px_140px_32px_32px] items-center gap-2 px-4 py-2 cursor-grab active:cursor-grabbing transition-all duration-300 border-b border-border/20 last:border-none bg-secondary/20 hover:bg-secondary/40 first:rounded-t-xl last:rounded-b-xl hover:z-10 hover:scale-[1.01] select-none tracking-tight'
        )} 
        onClick={onClick}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-500 rounded-xl" />
        
        <div className="flex justify-center">
          {issue.identifier && (
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded border border-border">
              {issue.identifier}
            </span>
          )}
        </div>

        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="relative z-20 hover:bg-muted p-1 rounded transition-colors">
                <IssuePriorityIcon priority={issue.priority || 'none'} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border backdrop-blur-md">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={(e) => {
                  e.stopPropagation();
                  handleUpdate({ priority: key as any }, 'Priority');
                }} className="focus:bg-muted">
                  <div className="flex items-center gap-2">
                    <IssuePriorityIcon priority={key as IssuePriority} />
                    <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-center">
          <IssueTypeIcon type={issue.issueType} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="truncate text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            {issue.title}
          </span>
          {parentIssue && (
            <div className="flex items-center gap-1.5 text-muted-foreground/30 shrink-0">
              <span className="text-[10px] font-bold">&gt;</span>
              <span className="text-[11px] font-medium truncate max-w-[120px]">
                {parentIssue.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="relative z-20">
                <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-bold uppercase border-border bg-muted/50", getStatusColor(issue.status))}>
                  {STATUS_CONFIG[issue.status].label}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border backdrop-blur-md">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={(e) => {
                  e.stopPropagation();
                  handleUpdate({ status: key as any }, 'Status');
                }} className="focus:bg-muted">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{config.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-center">
          {feature && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden">
              <span>{project?.icon || '🔹'}</span>
              <span className="max-w-[80px] truncate">{feature.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {assigneeName ? (
            <div className="h-6 w-6 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shadow-inner">
              {getInitials(assigneeName)}
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center">
              <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
                <DotsThree className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border backdrop-blur-md">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="focus:bg-muted">Change status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-popover border-border">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={(e) => {
                      e.stopPropagation();
                      handleUpdate({ status: key as any }, 'Status');
                    }} className="focus:bg-muted">
                      <IssueStatusIcon status={key as IssueStatus} className="mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="focus:bg-muted">Change priority</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-popover border-border">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={(e) => {
                      e.stopPropagation();
                      handleUpdate({ priority: key as any }, 'Priority');
                    }} className="focus:bg-muted">
                      <IssuePriorityIcon priority={key as any} className="mr-2" />
                      <span className={config.color}>{config.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator className="border-border" />
              <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}>
                <Trash className="mr-2 h-4 w-4" />
                Delete sub-issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}