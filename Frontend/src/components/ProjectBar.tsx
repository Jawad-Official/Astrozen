import { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Project, 
  ProjectStatus, 
  ProjectHealth, 
  ProjectPriority, 
  Issue,
  Milestone,
  ProjectUpdate,
  UpdateComment,
  UpdateAttachment,
  EmojiReaction,
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { Team } from '@/types/auth';
import {
  Check,
  Square,
  CheckSquare,
  WarningCircle,
  CircleHalf,
  X,
  Plus,
  DotsThree,
  Trash,
  Users,
  CaretRight,
  CaretDown,
  Star,
  ChatTeardrop,
  Smiley,
  Paperclip,
  Image,
  FileText,
  File,
  CaretUp,
  PaperPlaneRight,
  ChatTeardropText,
  ClockCounterClockwise,
  Info,
  CalendarBlank,
  Stack,
  CircleNotch,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const healthConfig: Record<ProjectHealth, { label: string; className: string; icon: React.ReactNode }> = {
  on_track: { label: 'On track', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <Check className="h-3 w-3" /> },
  at_risk: { label: 'At risk', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: <WarningCircle className="h-3 w-3" /> },
  off_track: { label: 'Off track', className: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <WarningCircle className="h-3 w-3" /> },
  no_updates: { label: 'No updates', className: 'bg-white/5 text-white/40 border-white/10', icon: <Square className="h-3 w-3" /> },
};

const priorityBars: Record<ProjectPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

import { ProjectDialog } from './dialogs/ProjectDialog';

export const ProjectBar = {
  // ... (previous components: HealthBadge, PriorityIcon, Row remain unchanged)
  HealthBadge: ({ health, className }: { health: ProjectHealth; className?: string }) => {
    const config = healthConfig[health];
    return (<div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border', config.className, className)}>{config.icon}{config.label}</div>);
  },

  PriorityIcon: ({ priority, className }: { priority: ProjectPriority; className?: string }) => {
    const bars = priorityBars[priority] || 0;
    return (
      <div className={cn('flex items-end gap-0.5 h-4 w-4', className)}>
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className={cn('w-[3px] transition-colors rounded-full', level <= bars ? 'bg-foreground' : 'bg-muted/30', level === 1 && 'h-1', level === 2 && 'h-2', level === 3 && 'h-3', level === 4 && 'h-4')} />
        ))}
      </div>
    );
  },

  Row: ({ project, issues, features, orgMembers, user, teams, onDelete, onClick }: { project: Project; issues: Issue[]; features: Feature[]; orgMembers: any[]; user: any; teams: Team[]; onDelete: (id: string) => Promise<void>; onClick: () => void; }) => {
    const { toast } = useToast();
    const progress = useMemo(() => {
      const projectIssues = issues.filter(i => {
        const feature = features.find(f => f.id === i.featureId);
        return feature?.projectId === project.id;
      });
      const completed = projectIssues.filter(i => i.status === 'done').length;
      return projectIssues.length > 0 ? Math.round((completed / projectIssues.length) * 100) : 0;
    }, [issues, project.id, features]);

    const canManage = useMemo(() => {
      if (!user) return false;
      const isAdmin = user.role === 'admin';
      if (isAdmin) return true;
      
      const assignedTeamIds = [project.teamId, ...(project.teams || [])].filter(Boolean);
      const isTeamLeader = teams.some(team => 
        assignedTeamIds.includes(team.id) && 
        team.leaders?.some((l: any) => l.id === user.id)
      );
      return isTeamLeader;
    }, [user, project, teams]);

    const handleDelete = async () => {
      if (!confirm(`Delete project "${project.name}"?`)) return;
      try {
        await onDelete(project.id);
        toast({ title: 'Project deleted' });
      } catch (error: any) {
        toast({ 
          title: 'Failed to delete project', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const leadDisplayName = project.leadName || orgMembers.find(m => m.id === project.lead)?.full_name || project.lead;
    return (
      <div 
        className={cn(
          "group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-300 border-b border-white/[0.02] last:border-none bg-white/[0.03] hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl hover:z-10 hover:scale-[1.01] select-none tracking-tight"
        )} 
        onClick={onClick}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-500 rounded-xl" />
        <div className="flex items-center gap-3 flex-1 min-w-0 z-10"><span className="text-xl group-hover:scale-110 transition-transform duration-300">{project.icon}</span><span className="font-semibold text-sm text-white/90 group-hover:text-white transition-colors truncate">{project.name}</span></div>
        <div className="w-32 z-10"><ProjectBar.HealthBadge health={project.health} /></div>
                <div className="w-32 flex items-center gap-2 z-10">{leadDisplayName ? (<><div className="h-6 w-6 rounded-full border border-white/10 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">{leadDisplayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</div><span className="text-xs text-white/40 truncate">{leadDisplayName}</span></>) : (<span className="text-xs text-white/20">Assign</span>)}</div>
                <div className="w-16 z-10 flex justify-center">
                  <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider border-white/5 bg-white/5 transition-colors hover:bg-white/10", project.priority === 'none' ? 'text-muted-foreground' : 'text-foreground')}>
                    {project.priority}
                  </Badge>
                </div>
                <div className="w-24 z-10 flex items-center gap-3">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary/60" style={{ width: `${progress}%` }} /></div><span className="text-[10px] font-bold text-white/40">{progress}%</span></div>
        <div className="w-8 flex justify-end z-20">
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <DotsThree className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                <DropdownMenuItem className="text-red-400" onClick={handleDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  },

  Create: ({ open, onOpenChange, teams, selectedTeamId, onAddProject, onPlanWithAI }: { open: boolean; onOpenChange: (open: boolean) => void; projects: any[]; teams: Team[]; orgMembers: any[]; selectedTeamId?: string | null; onAddProject: (project: any) => void; onPlanWithAI?: (name: string) => void; }) => {
    // We use the new ProjectDialog here
    return (
      <ProjectDialog 
        open={open} 
        onOpenChange={onOpenChange}
        onPlanWithAI={onPlanWithAI}
        onSave={(data) => {
          onAddProject({
            ...data,
            teamId: selectedTeamId || (teams.length > 0 ? teams[0].id : undefined),
            health: 'no_updates',
            members: [],
            teams: [],
            milestones: [],
            updates: [],
            resources: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }}
      />
    );
  },


  UpdateCard: ({ 
    update, 
    onDelete, 
    onUpdate, 
    currentUser,
    onAddComment,
    onDeleteComment,
    onToggleReaction,
    onToggleCommentReaction
  }: { 
    update: ProjectUpdate; 
    onDelete: () => void; 
    onUpdate: (updates: Partial<ProjectUpdate>) => void; 
    currentUser: string;
    onAddComment?: (content: string, parentId?: string) => void;
    onDeleteComment?: (commentId: string) => void;
    onToggleReaction?: (emoji: string) => void;
    onToggleCommentReaction?: (commentId: string, emoji: string) => void;
  }) => {
    const { toast } = useToast();
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const health = healthConfig[update.health] || healthConfig.no_updates;
    const authorDisplayName = update.authorName || update.author;

    const handleSubmitComment = async (parentId?: string) => {
      const content = parentId ? replyContent : newComment;
      if (!content.trim() || !onAddComment) return;
      setIsSubmitting(true);
      try {
        await onAddComment(content.trim(), parentId);
        if (parentId) {
          setReplyContent('');
          setReplyingTo(null);
        } else {
          setNewComment('');
        }
        toast({ title: parentId ? 'Reply added' : 'Comment added' });
      } catch (error: any) {
        toast({ 
          title: `Failed to add ${parentId ? 'reply' : 'comment'}`, 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDeleteComment = async (commentId: string) => {
      if (!onDeleteComment) return;
      try {
        await onDeleteComment(commentId);
        toast({ title: 'Comment deleted' });
      } catch (error: any) {
        toast({ 
          title: 'Failed to delete comment', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const handleToggleReaction = async (emoji: string) => {
      if (!onToggleReaction) return;
      try {
        await onToggleReaction(emoji);
      } catch (error: any) {
        toast({ 
          title: 'Failed to update reaction', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
      if (!onToggleCommentReaction) return;
      try {
        await onToggleCommentReaction(commentId, emoji);
      } catch (error: any) {
        toast({ 
          title: 'Failed to update reaction', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const commonEmojis = ['👍', '🚀', '👀', '🎉', '❤️', '🔥'];

    const topLevelComments = update.comments?.filter(c => !c.parentId) || [];
    const getReplies = (parentId: string) => update.comments?.filter(c => c.parentId === parentId) || [];

    const renderComment = (comment: UpdateComment, isReply = false) => (
      <div key={comment.id} className={cn("flex gap-3", isReply && "ml-9 mt-3")}>
        <div className={cn("rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 shrink-0", isReply ? "h-5 w-5 text-[7px]" : "h-7 w-7 text-[8px]")}>
          {(comment.authorName || comment.author).split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80">{comment.authorName || comment.author}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30">{format(new Date(comment.createdAt), 'MMM d')}</span>
              {comment.author === currentUser && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mt-0.5">{comment.content}</p>
          
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5">
              {comment.reactions?.map((reaction, ridx) => (
                <button
                  key={`${comment.id}-r-${ridx}`}
                  onClick={() => handleToggleCommentReaction(comment.id, reaction.emoji)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] border transition-colors",
                    reaction.users.includes(currentUser)
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                  )}
                >
                  {reaction.emoji} {reaction.users.length}
                </button>
              ))}
              
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[10px] text-white/30 hover:text-white flex items-center gap-1">
                    <Smiley className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-auto p-1 bg-zinc-900 border-white/10">
                  <div className="flex gap-0.5">
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleCommentReaction(comment.id, emoji)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/10 text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {!isReply && (
              <button 
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-wider"
              >
                Reply
              </button>
            )}
          </div>

          {!isReply && getReplies(comment.id).map(reply => renderComment(reply, true))}
          
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(comment.id)}
                className="h-7 text-[11px] bg-white/5 border-white/10"
                autoFocus
              />
              <Button 
                size="sm" 
                className="h-7 px-2" 
                onClick={() => handleSubmitComment(comment.id)}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? <CircleNotch className="h-3 w-3 animate-spin" /> : <PaperPlaneRight className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="bg-white/[0.02] backdrop-blur-md rounded-xl border border-white/5 p-5 group shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
        <div className="flex items-center gap-4 mb-4">
          <div className={cn('px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded border', health.className)}>
            {health.label}
          </div>
          <div className="flex items-center gap-3 text-sm flex-1">
            <div className="h-7 w-7 rounded-full border border-white/10 bg-gradient-to-br from-indigo-500/50 to-purple-500/50 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
              {(authorDisplayName || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="font-semibold text-white/90 tracking-tight">{authorDisplayName}</span>
            <span className="text-white/20">·</span>
            <span className="text-[11px] font-medium text-white/30">{format(new Date(update.createdAt), 'MMM d, yyyy')}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400" onClick={onDelete}>
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap mb-4 tracking-tight font-medium">
          {update.content}
        </p>

        {/* Reactions */}
        <div className="flex items-center gap-2 mb-4">
          {update.reactions?.map((reaction, idx) => (
            <button
              key={`${reaction.emoji}-${idx}`}
              onClick={() => handleToggleReaction(reaction.emoji)}
              className={cn(
                "px-2 py-1 rounded-md text-xs border transition-colors",
                reaction.users.includes(currentUser)
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
              )}
            >
              {reaction.emoji} {reaction.users.length}
            </button>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors">
                <Smiley className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-1 bg-zinc-900 border-white/10">
              <div className="flex gap-1">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleToggleReaction(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-white/5">
          <button 
            onClick={() => setShowComments(!showComments)} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-200 ml-auto uppercase tracking-wider bg-white/[0.03] border-white/5 text-white/30 hover:text-white"
          >
            <ChatTeardrop className="h-3.5 w-3.5" />
            {update.comments?.length || 0} Comments
          </button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-4">
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {topLevelComments.map(comment => renderComment(comment))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                className="h-8 text-xs bg-white/5 border-white/10"
              />
              <Button 
                size="sm" 
                className="h-8 px-3" 
                onClick={() => handleSubmitComment()}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? <CircleNotch className="h-3 w-3 animate-spin" /> : <PaperPlaneRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  },

  Properties: ({ project, projectIssues, onUpdate, currentUser, onAddMilestone }: { project: Project; projectIssues: Issue[]; onUpdate: (updates: Partial<Project>) => void; currentUser: string; onAddMilestone: () => void; }) => {
    const completedCount = projectIssues.filter(i => i.status === 'done').length;
    const progress = projectIssues.length > 0 ? Math.round((completedCount / projectIssues.length) * 100) : 0;
    const progressPercent = projectIssues.length > 0 ? Math.round((completedCount / projectIssues.length) * 100) : 0;
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant="outline">{project.status}</Badge></div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Priority</span>
          <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] font-bold uppercase border-white/5 bg-white/5", project.priority === 'none' ? 'text-muted-foreground' : 'text-foreground')}>
            {project.priority}
          </Badge>
        </div>
        <Separator className="bg-border" />
        <div>
          <div className="flex items-center justify-between mb-3"><span className="text-xs font-medium text-muted-foreground">Milestones</span><Plus className="h-3.5 w-3.5 cursor-pointer" onClick={onAddMilestone} /></div>
          <div className="space-y-1">{project.milestones.map(m => (<div key={m.id} className="flex items-center gap-2 text-xs">{m.completed ? <CheckSquare weight="fill" className="h-3 w-3 text-emerald-400" /> : <Square className="h-3 w-3 text-muted-foreground" />}<span className="flex-1 truncate">{m.name}</span></div>))}</div>
        </div>
        <Separator className="bg-border" />
        <div><div className="text-xs font-medium text-muted-foreground mb-2">Progress</div><div className="flex gap-8 text-xs"><div><div className="text-muted-foreground">Scope</div><div className="font-medium">{projectIssues.length}</div></div><div><div className="text-emerald-400">Done</div><div className="font-medium">{progress}%</div></div></div></div>
      </div>
    );
  }
};