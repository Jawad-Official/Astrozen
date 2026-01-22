import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIssueStore } from '@/store/issueStore';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';
import { STATUS_CONFIG, PRIORITY_CONFIG, ESTIMATE_OPTIONS, IssueStatus, IssuePriority } from '@/types/issue';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Send,
  Calendar,
  User,
  Tag,
  Folder,
  Clock,
  Activity,
  MessageSquare,
  Target,
} from 'lucide-react';

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

export function IssueDetailPanel() {
  const { 
    selectedIssueId, 
    setSelectedIssue, 
    getIssueById, 
    updateIssue,
    getIssueComments,
    getIssueActivities,
    addComment,
    projects,
    cycles,
    labels,
  } = useIssueStore();
  
  const [newComment, setNewComment] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  const issue = selectedIssueId ? getIssueById(selectedIssueId) : null;
  const comments = issue ? getIssueComments(issue.id) : [];
  const activities = issue ? getIssueActivities(issue.id) : [];
  const project = projects.find(p => p.id === issue?.projectId);
  const cycle = cycles.find(c => c.id === issue?.cycleId);
  
  if (!issue) return null;
  
  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      updateIssue(issue.id, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };
  
  const handleSaveDescription = () => {
    updateIssue(issue.id, { description: editDescription });
    setIsEditingDescription(false);
  };
  
  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(issue.id, newComment.trim());
      setNewComment('');
    }
  };
  
  const handleLabelToggle = (labelId: string) => {
    const hasLabel = issue.labels.some(l => l.id === labelId);
    const label = labels.find(l => l.id === labelId);
    if (!label) return;
    
    if (hasLabel) {
      updateIssue(issue.id, { labels: issue.labels.filter(l => l.id !== labelId) });
    } else {
      updateIssue(issue.id, { labels: [...issue.labels, label] });
    }
  };
  
  return (
    <Sheet open={!!selectedIssueId} onOpenChange={(open) => !open && setSelectedIssue(null)}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{issue.identifier}</span>
            <SheetTitle className="sr-only">{issue.title}</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedIssue(null)}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Title */}
            {isEditingTitle ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTitle}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <h2 
                className="text-lg font-semibold cursor-pointer hover:bg-accent/50 p-1 -m-1"
                onClick={() => { setEditTitle(issue.title); setIsEditingTitle(true); }}
              >
                {issue.title}
              </h2>
            )}
            
            {/* Quick actions row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select 
                value={issue.status} 
                onValueChange={(v) => updateIssue(issue.id, { status: v as IssueStatus })}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={issue.status} />
                      <span className="text-sm">{STATUS_CONFIG[issue.status].label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={key as IssueStatus} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={issue.priority} 
                onValueChange={(v) => updateIssue(issue.id, { priority: v as IssuePriority })}
              >
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={issue.priority} />
                      <span className="text-sm">{PRIORITY_CONFIG[issue.priority].label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={key as IssuePriority} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Description */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[120px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-sm text-muted-foreground cursor-pointer hover:bg-accent/50 p-2 -m-2 min-h-[60px]"
                  onClick={() => { setEditDescription(issue.description || ''); setIsEditingDescription(true); }}
                >
                  {issue.description || 'Click to add description...'}
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Properties */}
            <div className="grid gap-3">
              {/* Assignee */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-20">Assignee</span>
                <Select 
                  value={issue.assignee || 'none'} 
                  onValueChange={(v) => updateIssue(issue.id, { assignee: v === 'none' ? undefined : v })}
                >
                  <SelectTrigger className="flex-1 h-8">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    <SelectItem value="John Doe">John Doe</SelectItem>
                    <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Project */}
              <div className="flex items-center gap-3">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-20">Project</span>
                <Select 
                  value={issue.projectId || 'none'} 
                  onValueChange={(v) => updateIssue(issue.id, { projectId: v === 'none' ? undefined : v })}
                >
                  <SelectTrigger className="flex-1 h-8">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cycle */}
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-20">Cycle</span>
                <Select 
                  value={issue.cycleId || 'none'} 
                  onValueChange={(v) => updateIssue(issue.id, { cycleId: v === 'none' ? undefined : v })}
                >
                  <SelectTrigger className="flex-1 h-8">
                    <SelectValue placeholder="No cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No cycle</SelectItem>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Estimate */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-20">Estimate</span>
                <Select 
                  value={String(issue.estimate || 0)} 
                  onValueChange={(v) => updateIssue(issue.id, { estimate: Number(v) || undefined })}
                >
                  <SelectTrigger className="flex-1 h-8">
                    <SelectValue placeholder="No estimate" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTIMATE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Labels */}
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                <span className="text-sm text-muted-foreground w-20">Labels</span>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {labels.map((label) => {
                    const isActive = issue.labels.some(l => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => handleLabelToggle(label.id)}
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium transition-opacity',
                          labelColors[label.color],
                          isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                        )}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Tabs for Comments and Activity */}
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="comments" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Activity ({activities.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="mt-4 space-y-4">
                {/* Comment input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleAddComment()}
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim()}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Comment
                </Button>
                
                {/* Comments list */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center">
                          {comment.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-8">{comment.content}</p>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4 space-y-3">
                {activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-2 text-sm">
                    <div className="h-5 w-5 bg-muted flex items-center justify-center mt-0.5">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{activity.actor}</span>
                      <span className="text-muted-foreground">
                        {activity.type === 'created' && ' created this issue'}
                        {activity.type === 'status_changed' && ` changed status from ${activity.oldValue} to ${activity.newValue}`}
                        {activity.type === 'priority_changed' && ` changed priority from ${activity.oldValue} to ${activity.newValue}`}
                        {activity.type === 'assigned' && ` assigned to ${activity.newValue || 'unassigned'}`}
                        {activity.type === 'cycle_changed' && ` moved to ${activity.newValue}`}
                        {activity.type === 'comment' && ' added a comment'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        {/* Footer with metadata */}
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex justify-between">
          <span>Created {format(issue.createdAt, 'MMM d, yyyy')}</span>
          <span>Updated {formatDistanceToNow(issue.updatedAt, { addSuffix: true })}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}