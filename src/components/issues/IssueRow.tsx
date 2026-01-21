import { Issue, STATUS_CONFIG, PRIORITY_CONFIG } from '@/types/issue';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';
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
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IssueRowProps {
  issue: Issue;
  onClick?: () => void;
}

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

export function IssueRow({ issue, onClick }: IssueRowProps) {
  const { updateIssue, deleteIssue, projects } = useIssueStore();
  const project = projects.find((p) => p.id === issue.projectId);

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-2 border-b border-border',
        'hover:bg-accent/50 cursor-pointer transition-colors'
      )}
      onClick={onClick}
    >
      {/* Priority */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="hover:bg-accent p-1 -m-1">
            <PriorityIcon priority={issue.priority} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => updateIssue(issue.id, { priority: key as any })}
            >
              <PriorityIcon priority={key as any} className="mr-2" />
              {config.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Identifier */}
      <span className="text-xs text-muted-foreground font-mono w-14">
        {issue.identifier}
      </span>

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="hover:bg-accent p-1 -m-1">
            <StatusIcon status={issue.status} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => updateIssue(issue.id, { status: key as any })}
            >
              <StatusIcon status={key as any} className="mr-2" />
              {config.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Title */}
      <span className="flex-1 truncate text-sm">{issue.title}</span>

      {/* Labels */}
      <div className="flex items-center gap-1">
        {issue.labels.map((label) => (
          <span
            key={label.id}
            className={cn(
              'px-1.5 py-0.5 text-xs font-medium text-foreground',
              labelColors[label.color]
            )}
            style={{ opacity: 0.9 }}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Project */}
      {project && (
        <span className="text-xs text-muted-foreground">
          {project.icon} {project.name}
        </span>
      )}

      {/* Assignee */}
      {issue.assignee && (
        <div className="flex h-5 w-5 items-center justify-center bg-primary/20 text-primary text-[10px] font-medium">
          {issue.assignee.split(' ').map((n) => n[0]).join('')}
        </div>
      )}

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => updateIssue(issue.id, { status: key as any })}
                >
                  <StatusIcon status={key as any} className="mr-2" />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Change priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => updateIssue(issue.id, { priority: key as any })}
                >
                  <PriorityIcon priority={key as any} className="mr-2" />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteIssue(issue.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
