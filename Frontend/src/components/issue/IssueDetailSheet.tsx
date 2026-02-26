import { useState, useMemo } from 'react';
import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  IssueType,
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  TYPE_CONFIG,
} from '@/types/issue';
import { useToast } from '@/hooks/use-toast';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  NotePencil, 
  Check, 
  ChatTeardropText, 
  PaperPlaneRight, 
  Pulse, 
  CalendarBlank, 
  Clock,
  User,
  Package,
  Target,
  Plus,
  Trash,
  CornersOut,
  CornersIn,
  CaretRight,
  Gear,
  Link as LinkIcon
} from '@phosphor-icons/react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  IssueStatusBadge, 
  IssueTypeIcon, 
  IssuePriorityIcon, 
  IssueIdentifier, 
} from './IssueAtomicComponents';

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
};

interface IssueDetailSheetProps {
  issueId: string | null;
  onClose: () => void;
  onUpdateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  onDeleteIssue: (id: string) => Promise<void>;
  onCreateSubIssue?: (parentId: string) => void;
}

export function IssueDetailSheet({ 
  issueId, 
  onClose, 
  onUpdateIssue, 
  onDeleteIssue, 
  onCreateSubIssue 
}: IssueDetailSheetProps) {
  const { 
    issues, 
    projects, 
    features, 
    orgMembers,
    getIssueById, 
    comments: allComments,
    activities: allActivities, 
    addComment,
    setSelectedIssue,
    currentUser
  } = useIssueStore();
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  
  const issue = issueId ? getIssueById(issueId) : null;
  
  const comments = useMemo(() => issue ? allComments.filter(c => c.issueId === issue.id) : [], [issue, allComments]);
  const activities = useMemo(() => issue ? allActivities.filter(a => a.issueId === issue.id) : [], [issue, allActivities]);
  const feature = useMemo(() => issue ? features.find(f => f.id === issue.featureId) : null, [features, issue?.featureId]);
  const project = useMemo(() => feature ? projects.find(p => p.id === feature.projectId) : null, [projects, feature?.projectId]);

  if (!issue) return null;
  
  const handleUpdate = async (updates: Partial<Issue>, label: string) => {
    try {
      await onUpdateIssue(issue.id, updates);
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
    if (!confirm('Are you sure you want to archive this issue?')) return;
    try {
      await onDeleteIssue(issue.id);
      toast({ title: 'Issue archived' });
      onClose();
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete issue', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle.trim() !== issue.title) {
      await handleUpdate({ title: editTitle.trim() }, 'Title');
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
      if (editDescription !== issue.description) {
          await handleUpdate({ description: editDescription }, 'Description');
      }
      setIsEditingDescription(false);
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(issue.id, newComment.trim());
      setNewComment('');
      toast({ title: 'Comment added' });
    } catch (error: any) {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!issueId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "p-0 flex flex-col bg-popover transition-all duration-500 ease-in-out gap-0 border-border overflow-hidden shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)]",
          isMaximized 
            ? "fixed inset-0 w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none z-[100]" 
            : "w-full sm:max-w-6xl h-[92vh] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border"
        )}
      >
        {/* Premium Window Title Bar */}
        <div className="relative shrink-0 select-none z-20">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-xl pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <DialogHeader className="px-6 h-12 flex-row items-center justify-between space-y-0 relative">
            <div className="flex items-center gap-6">
              {/* Refined Window Controls */}
              <div className="flex gap-2 px-1">
                <button className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all border border-black/10" onClick={onClose} />
                <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all border border-black/10" onClick={() => setIsMaximized(!isMaximized)} />
                <button className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-110 transition-all border border-black/10" />
              </div>
              
              <div className="h-4 w-px bg-border" />
              
              {/* Breadcrumbs with Icons */}
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em]">
                {project && (
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">{project.icon}</span>
                    <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">{project.name}</span>
                    <CaretRight className="h-2.5 w-2.5 text-muted-foreground/20" />
                  </div>
                )}
                {feature && (
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                    <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">{feature.name}</span>
                    <CaretRight className="h-2.5 w-2.5 text-muted-foreground/20" />
                  </div>
                )}
                <div className="flex items-center gap-2 text-primary/60 px-2 py-0.5 rounded bg-primary/5 border border-primary/10">
                  <span className="font-black tracking-widest">{issue.identifier}</span>
                </div>
              </div>
              
              <DialogTitle className="sr-only">{issue.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Comprehensive details and collaboration thread for issue {issue.identifier}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-7 w-7 rounded-md transition-all", isMaximized ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-foreground hover:bg-background/50")} 
                  onClick={() => setIsMaximized(!isMaximized)}
                >
                  {isMaximized ? <CornersIn className="h-3.5 w-3.5" /> : <CornersOut className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all" onClick={onClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <ScrollArea className="flex-1 h-full bg-popover">
            <div className="max-w-4xl mx-auto py-12 px-10 space-y-10">
              <div className="space-y-6">
                {isEditingTitle ? (
                  <div className="space-y-4 bg-muted/20 p-6 rounded-2xl border border-border">
                    <Input 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      className="text-3xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 shadow-none h-auto tracking-tight text-foreground placeholder:text-muted-foreground/20" 
                      autoFocus 
                      placeholder="Issue title"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} 
                    />
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button onClick={handleSaveTitle} className="h-8 px-5 text-[10px] font-bold rounded-lg">Save</Button>
                      <Button variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-8 px-4 text-[10px] text-muted-foreground/60 rounded-lg">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
                        <IssueTypeIcon type={issue.issueType || 'task'} className="h-5 w-5 text-primary" />
                      </div>
                      <h2 
                        className="text-3xl font-bold tracking-tight text-foreground leading-tight cursor-pointer hover:text-foreground/80 transition-colors selection:bg-primary/30 flex-1" 
                        onClick={() => { setEditTitle(issue.title || ''); setIsEditingTitle(true); }}
                      >
                        {issue.title}
                      </h2>
                    </div>
                    {issue.parentId && (() => {
                      const parent = getIssueById(issue.parentId);
                      return (
                        <div className="flex items-center gap-2 mt-3 ml-16">
                          <span className="text-[10px] text-muted-foreground/40">Sub-issue of</span>
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted transition-all gap-1.5 px-2 py-0.5 h-auto border-border text-muted-foreground/80 text-[10px] rounded-md"
                            onClick={() => setSelectedIssue(issue.parentId!)}
                          >
                            <IssueIdentifier identifier={parent?.identifier} className="text-[8px] opacity-50" />
                            <span className="font-medium">{parent?.title || 'Parent Issue'}</span>
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Description</h3>
                {isEditingDescription ? (
                  <div className="bg-muted/30 p-5 rounded-xl border border-border">
                    <Textarea 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)} 
                      className="min-h-[200px] bg-transparent border-none focus-visible:ring-0 p-0 shadow-none resize-none text-sm leading-relaxed text-foreground/80" 
                      autoFocus 
                      placeholder="Describe this issue..."
                    />
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                      <Button onClick={handleSaveDescription} className="h-8 px-5 text-[10px] font-bold rounded-lg">Save</Button>
                      <Button variant="ghost" onClick={() => setIsEditingDescription(false)} className="h-8 px-4 text-[10px] text-muted-foreground/60 rounded-lg">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-sm text-foreground/70 leading-relaxed p-4 rounded-xl bg-muted/20 border border-border cursor-pointer hover:border-muted-foreground/30 transition-colors min-h-[80px]"
                    onClick={() => { setEditDescription(issue.description || ''); setIsEditingDescription(true); }}
                  >
                    {issue.description || <span className="text-muted-foreground/30 italic">No description provided. Click to add.</span>}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="bg-muted/50 border border-border p-1 h-9 rounded-lg mb-6">
                    <TabsTrigger value="comments" className="rounded-md px-5 text-[10px] font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">
                      Comments ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-md px-5 text-[10px] font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="comments" className="mt-0 space-y-6">
                    <div className="bg-muted/30 rounded-xl border border-border p-3">
                      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 mb-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                          {currentUser ? getInitials(currentUser) : 'U'}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">Add a comment</span>
                      </div>
                      <Textarea 
                        placeholder="Write a comment..." 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        className="min-h-[80px] bg-transparent border-none focus-visible:ring-0 px-3 text-sm text-foreground/80 placeholder:text-muted-foreground/20" 
                      />
                      <div className="flex justify-end p-2 pt-0">
                        <Button 
                          onClick={handleAddComment} 
                          disabled={!newComment.trim()}
                          className="h-8 px-4 text-[10px] font-bold rounded-lg disabled:opacity-30"
                        >
                          <PaperPlaneRight className="h-3 w-3 mr-1.5" />
                          Post
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground/60 shrink-0">
                            {getInitials(comment.authorName || comment.author)}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground/80">{comment.authorName || comment.author}</span>
                              <span className="text-[10px] text-muted-foreground/40">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-sm text-foreground/70 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg group">
                        <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                          <Pulse className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-semibold text-foreground/80">{activity.actorName || activity.actor}</span>
                            <span className="text-muted-foreground/40"> {activity.type === 'created' ? 'created this issue' : activity.type}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/40 mt-0.5">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>

          {/* Properties Sidebar */}
          <aside className="w-[320px] h-full bg-muted/30 shrink-0 flex flex-col border-l border-border">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                {/* Section: Properties */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground/40">
                    <Gear className="h-3 w-3" />
                    <h3 className="text-[9px] font-bold uppercase tracking-widest">Properties</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Status</label>
                      <Select value={issue.status} onValueChange={(v) => handleUpdate({ status: v as IssueStatus }, 'Status')}>
                        <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                          <SelectValue>
                            <IssueStatusBadge status={issue.status} className="h-5 p-0 border-none bg-transparent" />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border rounded-xl">
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="rounded-lg">
                              <span>{config.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Owner</label>
                      <Select value={issue.assignee || 'none'} onValueChange={(v) => handleUpdate({ assignee: v === 'none' ? undefined : v }, 'Assignee')}>
                        <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                          <SelectValue>
                            {issue.assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                  {getInitials(issue.assigneeName || issue.assignee)}
                                </div>
                                <span className="text-foreground/70 truncate">{issue.assigneeName || issue.assignee}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground/40">
                                <User className="h-3.5 w-3.5" />
                                <span>Unassigned</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border rounded-xl max-h-[300px]">
                          <SelectItem value="none" className="rounded-lg text-muted-foreground/60">Unassigned</SelectItem>
                          {orgMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </div>
                                <span>{member.full_name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Type & Priority Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Type</label>
                        <Select value={issue.issueType || 'task'} onValueChange={(v) => handleUpdate({ issueType: v as IssueType }, 'Type')}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                <IssueTypeIcon type={issue.issueType || 'task'} className="h-3 w-3" />
                                <span className="text-[10px] text-foreground/70">{TYPE_CONFIG[issue.issueType || 'task']?.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="rounded-lg">
                                <div className="flex items-center gap-2">
                                  <IssueTypeIcon type={key as IssueType} className="h-3 w-3" />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Priority</label>
                        <Select value={issue.priority} onValueChange={(v) => handleUpdate({ priority: v as IssuePriority }, 'Priority')}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                <IssuePriorityIcon priority={issue.priority} className="h-3 w-3" />
                                <span className={cn("text-[10px]", PRIORITY_CONFIG[issue.priority].color)}>
                                  {PRIORITY_CONFIG[issue.priority].label}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="rounded-lg">
                                <div className="flex items-center gap-2">
                                  <IssuePriorityIcon priority={key as any} className="h-3 w-3" />
                                  <span className={cn(config.color)}>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Due Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className={cn(
                              "w-full h-9 bg-muted/50 border border-border rounded-lg hover:bg-muted justify-start px-3 text-xs",
                              issue.dueDate ? "text-primary" : "text-muted-foreground/40"
                            )}
                          >
                            <CalendarBlank className="h-3 w-3 mr-2" />
                            <span className="text-[10px]">
                              {issue.dueDate ? format(new Date(issue.dueDate), 'MMM d, yyyy') : 'Set due date'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                          <Calendar
                            mode="single"
                            selected={issue.dueDate ? new Date(issue.dueDate) : undefined}
                            onSelect={(date) => handleUpdate({ dueDate: date ? format(date, 'yyyy-MM-dd') : undefined as any }, 'Due Date')}
                            initialFocus
                            className="bg-transparent"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Section: Context */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground/40">
                    <Target className="h-3 w-3" />
                    <h3 className="text-[9px] font-bold uppercase tracking-widest">Context</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Feature */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Feature</label>
                      <Select value={issue.featureId || 'none'} onValueChange={(v) => handleUpdate({ featureId: v === 'none' ? undefined : v }, 'Feature')}>
                        <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                          <SelectValue placeholder="Backlog Item">
                            {feature ? (
                              <div className="flex items-center gap-2 truncate">
                                <div className="h-2 w-2 rounded-full bg-primary/40" />
                                <span className="text-foreground/70 truncate">{feature.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">No feature</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border rounded-xl max-h-[300px]">
                          <SelectItem value="none" className="rounded-lg text-muted-foreground/60">No feature</SelectItem>
                          {features.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="rounded-lg">
                              <span>{f.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Milestone - only show if feature is selected */}
                    {feature && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-wide">Milestone</label>
                        <Select value={issue.milestoneId || 'none'} onValueChange={(v) => handleUpdate({ milestoneId: v === 'none' ? null : v } as any, 'Milestone')}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue placeholder="No Milestone">
                              {issue.milestoneId ? (
                                <div className="flex items-center gap-2 truncate">
                                  <Target className="h-3 w-3 text-emerald-600 dark:text-emerald-400/60" />
                                  <span className="text-foreground/70 truncate">
                                    {feature.milestones?.find(m => m.id === issue.milestoneId)?.name || 'Milestone'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground/40">
                                  <Target className="h-3 w-3" />
                                  <span>No milestone</span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl max-h-[300px]">
                            <SelectItem value="none" className="rounded-lg text-muted-foreground/60">No milestone</SelectItem>
                            {feature.milestones && feature.milestones.length > 0 ? (
                              feature.milestones.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(m.completed ? "text-emerald-600 dark:text-emerald-400/60" : "text-muted-foreground/40")}>{m.completed ? '✓' : '○'}</span>
                                    <span>{m.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-4 text-center">
                                <p className="text-[9px] text-muted-foreground/20">No milestones defined</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* End of fields */}
                  </div>
                </div>

                {/* Section: Resources */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground/40">
                    <LinkIcon className="h-3 w-3" />
                    <h3 className="text-[9px] font-bold uppercase tracking-widest">Resources</h3>
                  </div>

                  <div className="space-y-2">
                    {issue.resources && issue.resources.length > 0 && (
                      <div className="space-y-1">
                        {issue.resources.map((res) => (
                          <div key={res.id} className="flex items-center justify-between group/res bg-muted/30 p-2 rounded-lg border border-border">
                            <a 
                              href={res.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <LinkIcon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                              <span className="text-[10px] text-foreground/70 truncate group-hover/res:text-primary transition-colors">{res.name}</span>
                            </a>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 opacity-0 group-hover/res:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                              onClick={() => {
                                toast({ title: "Delete resource not implemented" });
                              }}
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Input 
                      placeholder="Add URL..." 
                      className="h-8 bg-muted/30 border-border text-[10px] rounded-lg"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val) {
                            toast({ title: "Add resource from sidebar not fully implemented" });
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Create Sub-Issue Button */}
                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onCreateSubIssue?.(issue.id)}
                    className="w-full h-9 gap-2 text-[10px] font-bold border-dashed border-border hover:border-primary/30 hover:text-primary rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Sub-issue
                  </Button>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-muted-foreground/40">
                    <div className="flex items-center gap-2">
                      <CalendarBlank className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wide">Created</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground/40">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span className="text-[9px] font-bold uppercase tracking-wide">Updated</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="pt-4 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-9 text-destructive/60 hover:text-destructive hover:bg-destructive/5 text-[10px] font-bold rounded-lg"
                    onClick={handleDelete}
                  >
                    <Trash className="h-3.5 w-3.5 mr-1.5" />
                    Delete Issue
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
