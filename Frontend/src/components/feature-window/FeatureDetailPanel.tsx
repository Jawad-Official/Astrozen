import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureStatus, FeatureHealth, FeatureType } from '@/types/feature';
import { Project, IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { Team } from '@/types/auth';
import {
  WarningCircle,
  Gear,
  Square,
  CheckSquare,
  Plus,
  Trash,
  Package,
  Target,
  CornersIn,
  CornersOut,
  CaretRight,
  X,
  User,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CreateSubFeatureDialog } from '../feature/CreateSubFeatureDialog';
import { FEATURE_STATUS_CONFIG, FEATURE_HEALTH_CONFIG, FEATURE_TYPE_CONFIG } from './constants';
import { PriorityIcon } from './PriorityIcon';
import { StatusIcon } from './StatusIcon';
import { HealthIcon } from './HealthIcon';

export const FeatureDetailPanel = ({
  featureId,
  features,
  projects,
  orgMembers,
  onClose,
  onUpdateFeature,
  onDeleteFeature,
  onAddMilestone,
  onCreateIssueForMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  onAddFeature,
  onAddSubFeature,
}: {
  featureId: string | null;
  features: Feature[];
  projects: Project[];
  teams?: Team[];
  orgMembers?: any[];
  onClose: () => void;
  onUpdateFeature: (id: string, updates: Partial<Feature>) => Promise<void>;
  onDeleteFeature: (id: string) => Promise<void>;
  onAddMilestone: (featureId: string, parentId?: string) => void;
  onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
  onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
  onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
  onUpdateMilestone?: (featureId: string, milestoneId: string, updates: any) => Promise<void>;
  onAddFeature: (data: any) => Promise<void>;
  onAddSubFeature?: (parentFeature: Feature) => void;
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMaximized, setIsMaximized] = useState(false);
  const [createSubFeatureOpen, setCreateSubFeatureOpen] = useState(false);
  const feature = useMemo(() => featureId ? features.find(f => f.id === featureId) : null, [features, featureId]);
  const project = useMemo(() => feature ? projects.find(p => p.id === feature.projectId) : null, [projects, feature]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
  };

  const handleUpdateStatus = async (status: FeatureStatus) => {
    if (!feature) return;
    try {
      await onUpdateFeature(feature.id, { status });
      toast({ title: 'Status updated' });
    } catch (error: any) {
      toast({
        title: 'Failed to update status',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateType = async (type: FeatureType) => {
    if (!feature) return;
    try {
      await onUpdateFeature(feature.id, { type });
      toast({ title: 'Type updated' });
    } catch (error: any) {
      toast({
        title: 'Failed to update type',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateHealth = async (health: FeatureHealth) => {
    if (!feature) return;
    try {
      await onUpdateFeature(feature.id, { health });
      toast({ title: 'Health updated' });
    } catch (error: any) {
      toast({
        title: 'Failed to update health',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePriority = async (priority: IssuePriority) => {
    if (!feature) return;
    try {
      await onUpdateFeature(feature.id, { priority });
      toast({ title: 'Priority updated' });
    } catch (error: any) {
      toast({
        title: 'Failed to update priority',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateOwner = async (ownerId: string | undefined) => {
    if (!feature) return;
    try {
      await onUpdateFeature(feature.id, { ownerId });
      toast({ title: 'Owner updated' });
    } catch (error: any) {
      toast({
        title: 'Failed to update owner',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleToggleMilestoneStatus = async (milestoneId: string) => {
    if (!feature) return;
    try {
      await onToggleMilestone(feature.id, milestoneId);
    } catch (error: any) {
      toast({
        title: 'Failed to update milestone',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  if (!featureId) return null;

  return (
    <Dialog open={!!featureId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "p-0 flex flex-col bg-popover transition-all duration-500 ease-in-out gap-0 border-border overflow-hidden shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)]",
          "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.05),transparent_40%)] before:pointer-events-none",
          isMaximized
            ? "fixed inset-0 w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none z-[100]"
            : "w-full sm:max-w-6xl h-[92vh] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-[32px] border border-border"
        )}
      >
        {/* Premium Window Title Bar */}
        <div className="relative shrink-0 select-none z-20">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-2xl pointer-events-none" />
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

              {/* Breadcrumbs */}
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
                {project && (
                  <div
                    className="flex items-center gap-2.5 group cursor-pointer hover:bg-muted px-2 py-1 rounded-lg transition-all"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <span className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors drop-shadow-sm">{project.icon}</span>
                    <span className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors">{project.name}</span>
                    <CaretRight className="h-2.5 w-2.5 text-muted-foreground/10 group-hover:text-muted-foreground/20" />
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-primary/80 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
                  <span className="tracking-[0.25em]">{feature?.identifier || 'FEATURE'}</span>
                </div>
              </div>

              <DialogTitle className="sr-only">Feature Details</DialogTitle>
              <DialogDescription className="sr-only">
                Strategic overview and roadmap for the {feature?.name} initiative.
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

        {feature ? (
          <div className="flex-1 flex overflow-hidden">
            <ScrollArea className="flex-1 h-full bg-popover">
              <div className="max-w-4xl mx-auto py-12 px-10 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("h-5 px-2.5 text-[9px] font-black uppercase tracking-widest border-border bg-muted/50", FEATURE_STATUS_CONFIG[feature.status].color)}>
                      {FEATURE_STATUS_CONFIG[feature.status].label}
                    </Badge>
                    <HealthIcon health={feature.health} className="h-2 w-2" />
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                      {FEATURE_HEALTH_CONFIG[feature.health].label}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
                      {FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight selection:bg-primary/30">
                        {feature.name}
                      </h2>
                      {feature.parentId && (
                        <div className="flex items-center gap-2 mt-2">
                          <Package className="h-3 w-3 text-muted-foreground/40" />
                          <span className="text-[10px] text-muted-foreground/60">
                            Sub-feature of <span className="text-foreground/80 font-medium">{features.find(f => f.id === feature.parentId)?.name || '...'}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {project && (
                    <div
                      className="flex items-center gap-3 bg-muted/30 border border-border p-3 rounded-xl w-fit group hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
                        {project.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Project</span>
                        <span className="text-sm font-semibold text-foreground/80">{project.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Description</h3>
                  <div className="text-sm text-foreground/70 leading-relaxed p-4 rounded-xl bg-muted/20 border border-border">
                    {feature.problemStatement || <span className="text-muted-foreground/30 italic">No description provided.</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sub-Features</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-[9px] font-bold text-muted-foreground/60 hover:text-primary"
                      onClick={() => onAddSubFeature?.(feature)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>

                  {features.filter(f => f.parentId === feature.id).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {features.filter(f => f.parentId === feature.id).map(subF => (
                        <div
                          key={subF.id}
                          className="group bg-muted/20 hover:bg-muted/40 border border-border hover:border-primary/20 p-3 rounded-lg transition-all cursor-pointer"
                          onClick={() => { onClose(); navigate(`/features/${subF.id}`); }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-muted-foreground/40">{subF.identifier}</span>
                            <HealthIcon health={subF.health} />
                          </div>
                          <h4 className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">{subF.name}</h4>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 border border-dashed border-border rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/30">No sub-features</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Roadmap</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-[9px] font-bold text-muted-foreground/60 hover:text-primary"
                      onClick={() => onAddMilestone(feature.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Milestone
                    </Button>
                  </div>

                  {feature.milestones && feature.milestones.length > 0 ? (
                    <div className="space-y-2">
                      {feature.milestones.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg group">
                          <button
                            onClick={() => handleToggleMilestoneStatus(m.id)}
                            className="flex-shrink-0"
                          >
                            {m.completed ? (
                              <CheckSquare weight="fill" className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={cn("text-xs font-medium", m.completed ? "text-muted-foreground/60 line-through" : "text-foreground/80")}>
                              {m.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground/40 hover:text-primary"
                              onClick={() => onCreateIssueForMilestone?.(feature.id, m.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground/40 hover:text-destructive"
                              onClick={() => onDeleteMilestone(feature.id, m.id)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3">
                      <Target className="h-8 w-8 text-muted-foreground/20" />
                      <span className="text-[10px] text-muted-foreground/30">No milestones yet</span>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <aside className="w-[320px] h-full bg-muted/30 shrink-0 flex flex-col border-l border-border">
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground/40">
                      <Gear className="h-3 w-3" />
                      <h3 className="text-[9px] font-bold uppercase tracking-widest">Properties</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Type</label>
                        <Select value={feature.type || 'new_capability'} onValueChange={(v) => handleUpdateType(v as FeatureType)}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <span>{FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.icon}</span>
                                <span className="text-foreground/70">{FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {Object.entries(FEATURE_TYPE_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span>{config.icon}</span>
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Status</label>
                        <Select value={feature.status} onValueChange={(v) => handleUpdateStatus(v as FeatureStatus)}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <StatusIcon status={feature.status} className="h-3.5 w-3.5" />
                                <span className={cn(FEATURE_STATUS_CONFIG[feature.status].color)}>{FEATURE_STATUS_CONFIG[feature.status].label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {Object.entries(FEATURE_STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="rounded-lg">
                                <div className="flex items-center gap-2">
                                  <StatusIcon status={key as FeatureStatus} className="h-3.5 w-3.5" />
                                  <span className={cn(config.color)}>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Owner</label>
                        <Select value={feature.ownerId || 'none'} onValueChange={(v) => handleUpdateOwner(v === 'none' ? undefined : v)}>
                          <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                            <SelectValue>
                              {feature.ownerId && orgMembers ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                    {getInitials(orgMembers.find(m => m.id === feature.ownerId)?.full_name)}
                                  </div>
                                  <span className="text-foreground/70 truncate">{orgMembers.find(m => m.id === feature.ownerId)?.full_name}</span>
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
                            {orgMembers?.map((member) => (
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

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Priority</label>
                          <Select value={feature.priority || 'none'} onValueChange={(v) => handleUpdatePriority(v as IssuePriority)}>
                            <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                              <SelectValue>
                                <div className="flex items-center gap-1.5">
                                  <PriorityIcon priority={feature.priority || 'none'} className="h-3 w-3" />
                                  <span className={cn("text-[10px]", PRIORITY_CONFIG[feature.priority || 'none'].color)}>
                                    {PRIORITY_CONFIG[feature.priority || 'none'].label}
                                  </span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border rounded-xl">
                              {Object.entries(PRIORITY_CONFIG).map(([p, config]) => (
                                <SelectItem key={p} value={p} className="rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <PriorityIcon priority={p as any} className="h-3 w-3" />
                                    <span className={cn(config.color)}>{config.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Health</label>
                          <Select value={feature.health} onValueChange={(v) => handleUpdateHealth(v as FeatureHealth)}>
                            <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                              <SelectValue>
                                <div className="flex items-center gap-1.5">
                                  <HealthIcon health={feature.health} className="h-2 w-2" />
                                  <span className={cn("text-[10px]", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                                    {FEATURE_HEALTH_CONFIG[feature.health].label}
                                  </span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border rounded-xl">
                              {Object.entries(FEATURE_HEALTH_CONFIG).map(([h, config]) => (
                                <SelectItem key={h} value={h} className="rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <HealthIcon health={h as FeatureHealth} className="h-2 w-2" />
                                    <span className={cn(config.color)}>{config.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddSubFeature?.(feature)}
                      className="w-full h-9 gap-2 text-[10px] font-bold border-dashed border-border hover:border-primary/30 hover:text-primary rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Sub-feature
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-9 text-destructive/70 hover:text-destructive hover:bg-destructive/5 text-[10px] font-bold rounded-lg"
                      onClick={async () => {
                        if (confirm('Delete this feature? This action cannot be undone.')) {
                          try {
                            await onDeleteFeature(feature.id);
                            toast({ title: 'Feature Deleted' });
                            onClose();
                          } catch (error: any) {
                            toast({
                              title: 'Delete Failed',
                              description: error.response?.data?.detail || 'System error',
                              variant: 'destructive'
                            });
                          }
                        }
                      }}
                    >
                      <Trash className="h-3.5 w-3.5 mr-1.5" />
                      Delete Feature
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </aside>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-6 animate-pulse">
             <div className="h-20 w-20 rounded-[32px] bg-muted border border-border flex items-center justify-center">
               <WarningCircle className="h-10 w-10 text-muted-foreground/20" />
             </div>
             <span className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground/20">Synchronizing Initiative Data...</span>
           </div>
        )}
      </DialogContent>
      {feature && (
        <CreateSubFeatureDialog
          open={createSubFeatureOpen}
          onOpenChange={setCreateSubFeatureOpen}
          parentFeature={feature}
          onAddFeature={async (data) => {
            await onAddFeature(data);
            setCreateSubFeatureOpen(false);
            toast({ title: 'Sub-feature created' });
          }}
        />
      )}
    </Dialog>
  );
};
