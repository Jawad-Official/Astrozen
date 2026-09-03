import { MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectBar } from '@/components/ProjectBar';
import { PROJECT_HEALTH_OPTIONS } from '@/lib/project-options';
import { Project, ProjectHealth, ProjectUpdate as ProjectUpdateType } from '@/types/issue';
import { User } from '@/types/auth';

export const ProjectUpdatesTab = ({
  project,
  selectedHealth,
  setSelectedHealth,
  updateContent,
  setUpdateContent,
  handleAddUpdate,
  sortedUpdates,
  user,
  currentUser,
  handleDeleteUpdate,
  handleUpdateUpdate,
  handleAddUpdateComment,
  handleDeleteUpdateComment,
  toggleUpdateReaction,
  toggleUpdateCommentReaction,
}: {
  project: Project;
  selectedHealth: ProjectHealth;
  setSelectedHealth: (health: ProjectHealth) => void;
  updateContent: string;
  setUpdateContent: (value: string) => void;
  handleAddUpdate: () => Promise<void>;
  sortedUpdates: ProjectUpdateType[];
  user: User | null;
  currentUser: string | null;
  handleDeleteUpdate: (updateId: string) => Promise<void>;
  handleUpdateUpdate: (updateId: string, updates: Partial<ProjectUpdateType>) => Promise<void>;
  handleAddUpdateComment: (updateId: string, content: string, parentId?: string) => Promise<void>;
  handleDeleteUpdateComment: (updateId: string, commentId: string) => Promise<void>;
  toggleUpdateReaction: (projectId: string, updateId: string, emoji: string) => Promise<void>;
  toggleUpdateCommentReaction: (projectId: string, updateId: string, commentId: string, emoji: string) => Promise<void>;
}) => {
  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* New update input */}
      <div className="bg-card/50 rounded-lg border border-border p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant="outline"
                className={cn('gap-1.5 text-xs cursor-pointer', PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.className)}
              >
                {PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.icon}
                {PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border">
              {PROJECT_HEALTH_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => setSelectedHealth(opt.value)} className="gap-2">
                  {opt.icon}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Textarea
          placeholder="Write a project update..."
          value={updateContent}
          onChange={(e) => setUpdateContent(e.target.value)}
          className="min-h-[80px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
        />
        {updateContent.trim() && (
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={handleAddUpdate}>Post update</Button>
          </div>
        )}
      </div>

      {/* Updates timeline */}
      <div className="space-y-6">
        {sortedUpdates.map((update) => (
          <ProjectBar.UpdateCard
            key={update.id}
            update={update}
            onDelete={() => handleDeleteUpdate(update.id)}
            onUpdate={(updates) => handleUpdateUpdate(update.id, updates)}
            currentUser={user?.id || currentUser || ''}
            onAddComment={(content, parentId) => handleAddUpdateComment(update.id, content, parentId)}
            onDeleteComment={(commentId) => handleDeleteUpdateComment(update.id, commentId)}
            onToggleReaction={(emoji) => toggleUpdateReaction(project.id, update.id, emoji)}
            onToggleCommentReaction={(commentId, emoji) => toggleUpdateCommentReaction(project.id, update.id, commentId, emoji)}
          />
        ))}

        {/* Created activity */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MagnifyingGlass className="h-3.5 w-3.5" />
          <span>{user?.fullName || currentUser} created the project · {format(new Date(project.createdAt), 'MMM d')}</span>
        </div>
      </div>
    </div>
  );
};
