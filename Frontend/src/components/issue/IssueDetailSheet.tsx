import { useState, useMemo } from 'react';
import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  IssueType,
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  ESTIMATE_OPTIONS,
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
  Sliders,
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
    cycles, 
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
          "p-0 flex flex-col bg-[#080809] transition-all duration-500 ease-in-out gap-0 border-white/10 overflow-hidden shadow-[0_0_100px_-12px_rgba(0,0,0,1)]",
          isMaximized 
            ? "fixed inset-0 w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none z-[100]" 
            : "w-full sm:max-w-6xl h-[92vh] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-white/10"
        )}
      >
        {/* Premium Window Title Bar */}
        <div className="relative shrink-0 select-none z-20">
          <div className="absolute inset-0 bg-[#0C0C0D]/80 backdrop-blur-xl pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <DialogHeader className="px-6 h-12 flex-row items-center justify-between space-y-0 relative">
            <div className="flex items-center gap-6">
              {/* Refined Window Controls */}
              <div className="flex gap-2 px-1">
                <button className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all border border-black/10" onClick={onClose} />
                <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all border border-black/10" onClick={() => setIsMaximized(!isMaximized)} />
                <button className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-110 transition-all border border-black/10" />
              </div>
              
              <div className="h-4 w-px bg-white/5" />
              
              {/* Breadcrumbs with Icons */}
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em]">
                {project && (
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <span className="text-white/20 group-hover:text-white/40 transition-colors">{project.icon}</span>
                    <span className="text-white/20 group-hover:text-white/40 transition-colors">{project.name}</span>
                    <CaretRight className="h-2.5 w-2.5 text-white/10" />
                  </div>
                )}
                {feature && (
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />
                    <span className="text-white/20 group-hover:text-white/40 transition-colors">{feature.name}</span>
                    <CaretRight className="h-2.5 w-2.5 text-white/10" />
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
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-7 w-7 rounded-md transition-all", isMaximized ? "text-primary bg-primary/10" : "text-white/20 hover:text-white hover:bg-white/5")} 
                  onClick={() => setIsMaximized(!isMaximized)}
                >
                  {isMaximized ? <CornersIn className="h-3.5 w-3.5" /> : <CornersOut className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-all" onClick={onClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content: The Document Page */}
          <ScrollArea className="flex-1 h-full bg-[#080809]">
            <div className="max-w-4xl mx-auto py-16 px-12 space-y-12">
              {/* Page Header Area */}
              <div className="space-y-8">
                {isEditingTitle ? (
                  <div className="space-y-4 bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <Input 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      className="text-5xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 shadow-none h-auto tracking-tighter text-white placeholder:text-white/10" 
                      autoFocus 
                      placeholder="Issue title"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()} 
                    />
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      <Button onClick={handleSaveTitle} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-10 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                        Confirm Update
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-10 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-white/40">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <h2 
                      className="text-5xl font-bold tracking-tighter text-white leading-[1.1] cursor-pointer hover:text-primary transition-all selection:bg-primary/30" 
                      onClick={() => { setEditTitle(issue.title || ''); setIsEditingTitle(true); }}
                    >
                      {issue.title}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -left-16 top-2 opacity-0 group-hover:opacity-100 h-10 w-10 rounded-full bg-white/5 hover:bg-primary/10 hover:text-primary transition-all border border-white/5"
                      onClick={() => { setEditTitle(issue.title || ''); setIsEditingTitle(true); }}
                    >
                      <NotePencil className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                {issue.parentId && (() => {
                  const parent = getIssueById(issue.parentId);
                  return (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Sub-Issue of</span>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all gap-2 py-1.5 px-4 h-auto border-white/5 text-white/60 font-black tracking-normal uppercase bg-white/[0.02] shadow-2xl rounded-xl"
                        onClick={() => setSelectedIssue(issue.parentId!)}
                      >
                        {parent && <IssueIdentifier identifier={parent.identifier} className="text-[9px] opacity-40" />}
                        <span className="max-w-[400px] truncate text-xs font-bold tracking-tight">
                          {parent?.title || 'Parent Issue'}
                        </span>
                      </Badge>
                    </div>
                  );
                })()}
              </div>

              {/* Enhanced Description Area */}
              <div className="space-y-6 relative group/desc">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 text-primary/40">
                    <div className="h-px w-6 bg-current opacity-20" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Documentation</h3>
                  </div>
                </div>
                
                {isEditingDescription ? (
                  <div className="bg-[#0C0C0D] p-8 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                    <Textarea 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)} 
                      className="min-h-[400px] bg-transparent border-none focus-visible:ring-0 p-0 shadow-none resize-none text-xl leading-relaxed text-white/80 selection:bg-primary/30 font-medium tracking-tight" 
                      autoFocus 
                      placeholder="Deep dive into the technical details, requirements, and edge cases..."
                    />
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                      <Button onClick={handleSaveDescription} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-11 px-10 text-[11px] font-black uppercase tracking-widest">
                        Publish Changes
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditingDescription(false)} className="h-11 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/20">Discard Changes</Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative text-xl text-white/60 leading-relaxed cursor-pointer hover:bg-white/[0.01] p-8 -m-8 rounded-[40px] transition-all border border-transparent hover:border-white/5" 
                    onClick={() => { setEditDescription(issue.description || ''); setIsEditingDescription(true); }}
                  >
                    <div className="absolute -right-2 top-8 flex flex-col gap-2 opacity-0 group-hover/desc:opacity-100 transition-all translate-x-4 group-hover/desc:translate-x-0">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-[#0C0C0D] border border-white/10 text-primary shadow-2xl">
                        <NotePencil className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {issue.description ? (
                      <div className="whitespace-pre-wrap font-medium tracking-tight pr-4">
                        {issue.description}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/10">
                          <ChatTeardropText className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-bold text-white/10 uppercase tracking-widest">No documentation provided. Click to initiate.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feed Divider */}
              <div className="relative py-8">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#080809] px-4 text-[9px] font-black uppercase tracking-[0.5em] text-white/10">Community Pulse</span>
                </div>
              </div>

              {/* Refined Discussion Feed */}
              <div className="space-y-12 pb-32">
                <Tabs defaultValue="comments" className="w-full">
                  <div className="flex items-center justify-between mb-12">
                    <TabsList className="bg-white/[0.03] border border-white/5 p-1 h-10 rounded-2xl">
                      <TabsTrigger value="comments" className="rounded-xl px-6 gap-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all">
                        Insights ({comments.length})
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="rounded-xl px-6 gap-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all">
                        Timeline
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="comments" className="mt-0 space-y-12">
                    {/* Integrated Comment Input */}
                    <div className="group bg-[#0C0C0D] rounded-[32px] border border-white/5 focus-within:border-primary/30 transition-all p-2 shadow-2xl overflow-hidden mb-16">
                      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.02]">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                          {currentUser ? getInitials(currentUser) : 'U'}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Contribute to the conversation</span>
                      </div>
                      <Textarea 
                        placeholder="Type a message or drop relevant assets..." 
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)} 
                        className="min-h-[140px] resize-none bg-transparent border-none focus-visible:ring-0 px-6 py-6 shadow-none text-base leading-relaxed text-white/80 placeholder:text-white/5" 
                      />
                      <div className="flex justify-end p-4 bg-white/[0.01]">
                        <Button 
                          onClick={handleAddComment} 
                          disabled={!newComment.trim()}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-10 px-10 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-20"
                        >
                          <PaperPlaneRight className="h-4 w-4 mr-2" />
                          Broadcast
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-10">
                      {comments.map((comment) => (
                        <div key={comment.id} className="relative pl-20 animate-in fade-in slide-in-from-left-4 duration-500">
                          <div className="absolute left-0 top-0 h-14 w-14 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center text-sm font-black text-white/40 shadow-2xl group hover:scale-105 transition-all">
                            {getInitials(comment.authorName || comment.author)}
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-black text-white/90 uppercase tracking-widest">{comment.authorName || comment.author}</span>
                              <div className="h-px w-4 bg-white/10" />
                              <span className="text-[10px] font-bold text-white/10 uppercase tracking-tighter">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-base text-white/60 leading-relaxed bg-[#0C0C0D] p-6 rounded-[28px] rounded-tl-none border border-white/5 hover:border-white/10 transition-colors shadow-inner">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 space-y-6">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-6 p-6 rounded-3xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all group">
                        <div className="h-10 w-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                          <Pulse className="h-5 w-5 text-white/20 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-black text-white/80 uppercase tracking-tight">{activity.actorName || activity.actor}</span>
                              <span className="text-white/30 font-medium"> {activity.type === 'created' ? 'initiated the development of this issue' : activity.type}</span>
                            </div>
                            <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="h-1 w-12 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>

          {/* Properties Sidebar: High-Fidelity Panel */}
          <aside className="w-[380px] h-full bg-[#0C0C0D] shrink-0 flex flex-col border-l border-white/5">
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-12">
                {/* Section: Development */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-white/10 ml-1">
                    <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                      <Gear className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Lifecycle</h3>
                  </div>

                  <div className="space-y-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">
                    {/* Status */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Current Phase</label>
                      <Select value={issue.status} onValueChange={(v) => handleUpdate({ status: v as IssueStatus }, 'Status')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-5 shadow-2xl">
                          <SelectValue>
                            <IssueStatusBadge status={issue.status} className="h-6 p-0 border-none bg-transparent" />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[24px] p-2">
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="rounded-xl focus:bg-primary/10 focus:text-primary m-1 px-4 py-3 cursor-pointer">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{config.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Development Owner</label>
                      <Select value={issue.assignee || 'none'} onValueChange={(v) => handleUpdate({ assignee: v === 'none' ? undefined : v }, 'Assignee')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all px-5 group">
                          <SelectValue placeholder="Unassigned">
                            {issue.assignee ? (
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-black text-primary">
                                  {getInitials(issue.assigneeName || issue.assignee)}
                                </div>
                                <span className="text-xs font-black text-white/80 uppercase tracking-wide truncate">{issue.assigneeName || issue.assignee}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 opacity-40">
                                <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                  <User className="h-3 w-3" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Owner</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[24px] p-2 max-h-[400px]">
                          <SelectItem value="none" className="rounded-xl m-1 text-[10px] font-black uppercase tracking-widest py-4 focus:bg-red-500/10 focus:text-red-500">Unassign Task</SelectItem>
                          <div className="h-px bg-white/5 my-2 mx-4" />
                          {orgMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id} className="rounded-xl m-1 px-4 py-3 focus:bg-primary/10 group cursor-pointer">
                              <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-2xl bg-white/5 group-focus:bg-primary/20 flex items-center justify-center text-[10px] font-black text-white/40 group-focus:text-primary transition-colors">
                                  {member.first_name[0]}{member.last_name[0]}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-white/80 group-focus:text-white uppercase tracking-tight">{member.full_name}</span>
                                  <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">{member.email}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section: Parameters */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-white/10 ml-1">
                    <div className="h-4 w-4 rounded bg-orange-500/20 flex items-center justify-center">
                      <Sliders className="h-2.5 w-2.5 text-orange-500" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Parameters</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Priority</label>
                      <Select value={issue.priority} onValueChange={(v) => handleUpdate({ priority: v as IssuePriority }, 'Priority')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-4">
                          <SelectValue>
                            <div className="flex items-center gap-3">
                              <IssuePriorityIcon priority={issue.priority} className="h-4 w-4" />
                              <span className={cn("text-[10px] font-black uppercase tracking-[0.15em]", PRIORITY_CONFIG[issue.priority].color)}>
                                {PRIORITY_CONFIG[issue.priority].label}
                              </span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="rounded-xl m-1 focus:bg-white/5 cursor-pointer py-3">
                              <div className="flex items-center gap-3 px-2">
                                <IssuePriorityIcon priority={key as any} />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>{config.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Intensity</label>
                      <Select value={String(issue.estimate || 0)} onValueChange={(v) => handleUpdate({ estimate: Number(v) || undefined }, 'Estimate')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-4">
                          <SelectValue>
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-white/20" />
                              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">
                                {ESTIMATE_OPTIONS.find(opt => opt.value === issue.estimate)?.label.split(' ')[0] || 'None'}
                              </span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                          {ESTIMATE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)} className="rounded-xl m-1 focus:bg-white/5 py-3 cursor-pointer">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2">{opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Deadline</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className={cn(
                            "w-full h-12 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/10 transition-all justify-start px-5 font-bold",
                            issue.dueDate ? "text-primary" : "text-white/20"
                          )}
                        >
                          <CalendarBlank className="h-4 w-4 mr-3" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {issue.dueDate ? format(new Date(issue.dueDate), 'MMM d, yyyy') : 'Set Due Date'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#0C0C0D] border-white/10" align="start">
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

                {/* Section: Strategic Context */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-white/10 ml-1">
                    <div className="h-4 w-4 rounded bg-purple-500/20 flex items-center justify-center">
                      <Target className="h-2.5 w-2.5 text-purple-500" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Strategy</h3>
                  </div>

                  <div className="space-y-6 bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Core Feature</label>
                      <Select value={issue.featureId || 'none'} onValueChange={(v) => handleUpdate({ featureId: v === 'none' ? undefined : v }, 'Feature')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all text-xs font-bold px-5">
                          <SelectValue placeholder="Backlog Item">
                            {feature ? (
                              <div className="flex items-center gap-3 truncate">
                                <div className="h-2 w-2 rounded-full bg-primary/40" />
                                <span className="text-[10px] font-black uppercase tracking-tight truncate text-white/80">{feature.name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Independent</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[24px] p-2 max-h-[300px]">
                          <SelectItem value="none" className="rounded-xl m-1 text-[10px] font-black uppercase tracking-widest py-4 text-red-500/40 focus:bg-red-500/10 focus:text-red-500">Remove Connection</SelectItem>
                          {features.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="rounded-xl m-1 px-4 py-3 focus:bg-primary/10 group cursor-pointer">
                              <span className="text-[10px] font-black uppercase tracking-wider text-white/60 group-focus:text-primary transition-colors">🔹 {f.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {feature && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Strategic Milestone</label>
                        <Select value={issue.milestoneId || 'none'} onValueChange={(v) => handleUpdate({ milestoneId: v === 'none' ? null : v } as any, 'Milestone')}>
                          <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all text-xs font-bold px-5">
                            <SelectValue placeholder="No Milestone">
                              {issue.milestoneId ? (
                                <div className="flex items-center gap-3 truncate">
                                  <Target className="h-3.5 w-3.5 text-emerald-400/60" />
                                  <span className="text-[10px] font-black uppercase tracking-tight truncate text-white/80">
                                    {feature.milestones?.find(m => m.id === issue.milestoneId)?.name || 'Milestone Linked'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 opacity-40">
                                  <Target className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Milestone</span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[24px] p-2 max-h-[300px]">
                            <SelectItem value="none" className="rounded-xl m-1 text-[10px] font-black uppercase tracking-widest py-4 text-white/20 focus:bg-white/5">Remove Milestone</SelectItem>
                            <div className="h-px bg-white/5 my-2 mx-4" />
                            {feature.milestones && feature.milestones.length > 0 ? (
                              feature.milestones.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="rounded-xl m-1 px-4 py-3 focus:bg-emerald-500/10 group cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <span className="text-emerald-500/60">{m.completed ? '✅' : '🎯'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-white/60 group-focus:text-emerald-500 transition-colors">
                                      {m.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center">
                                <p className="text-[9px] font-black text-white/10 uppercase tracking-widest leading-relaxed">
                                  No milestones defined<br/>for this feature yet.
                                </p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Active Cycle</label>
                      <Select value={issue.cycleId || 'none'} onValueChange={(v) => handleUpdate({ cycleId: v === 'none' ? undefined : v }, 'Cycle')}>
                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all text-xs font-bold px-5">
                          <SelectValue placeholder="Not In Cycle" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                          <SelectItem value="none" className="rounded-xl m-1 text-[10px] font-black uppercase tracking-widest py-4 text-white/20">Remove from Cycle</SelectItem>
                          {cycles.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="rounded-xl m-1 px-4 py-3 focus:bg-white/5 cursor-pointer">
                              <span className="text-[10px] font-black uppercase tracking-wider text-white/60">{c.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section: Resources */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 text-white/10 ml-1">
                    <div className="h-4 w-4 rounded bg-blue-500/20 flex items-center justify-center">
                      <LinkIcon className="h-2.5 w-2.5 text-blue-500" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Resources</h3>
                  </div>

                  <div className="space-y-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">
                    {issue.resources && issue.resources.length > 0 && (
                      <div className="space-y-2">
                        {issue.resources.map((res) => (
                          <div key={res.id} className="flex items-center justify-between group/res bg-white/[0.03] p-2 rounded-xl border border-white/5">
                            <a 
                              href={res.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <LinkIcon className="h-3 w-3 text-white/20 shrink-0" />
                              <span className="text-[10px] font-bold text-white/60 truncate group-hover/res:text-primary transition-colors">{res.name}</span>
                            </a>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover/res:opacity-100 text-white/20 hover:text-red-400 transition-all"
                              onClick={() => {
                                // In a real app, you'd call a deleteResource API
                                // For now, we update the whole list via onUpdateIssue if supported
                                toast({ title: "Delete resource not implemented" });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Add URL..." 
                        className="h-8 bg-white/[0.03] border-white/10 text-[10px] rounded-xl"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              // Similar to creation, in a real app you'd call an addResource API
                              toast({ title: "Add resource from sidebar not fully implemented" });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 px-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onCreateSubIssue?.(issue.id)}
                    className="w-full gap-4 text-[10px] font-black uppercase tracking-[0.3em] h-14 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all rounded-[24px] shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Forge Sub-Issue
                  </Button>
                </div>

                {/* Metadata & Actions */}
                <div className="pt-12 space-y-10 px-2">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between group cursor-default">
                      <div className="flex items-center gap-3 text-white/10">
                        <CalendarBlank className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Created</span>
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-tight transition-colors group-hover:text-white/50">{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between group cursor-default">
                      <div className="flex items-center gap-3 text-white/10">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Revised</span>
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-tight transition-colors group-hover:text-white/50">{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  <div className="pt-10 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-12 text-red-500/30 hover:text-red-500 hover:bg-red-500/5 text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all border border-transparent hover:border-red-500/10"
                      onClick={handleDelete}
                    >
                      <Trash className="h-4 w-4 mr-3" />
                      Archive Records
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}