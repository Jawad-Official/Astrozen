import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIssueStore } from '@/store/issueStore';
import { useAuth } from '@/context/AuthContext';
import { hasTeamAccess } from '@/lib/permissions';
import { FeatureWindow } from '@/components/FeatureWindow';
import { Button } from '@/components/ui/button';
import { Plus, MagnifyingGlass, Funnel, Diamond, CalendarBlank, Package, FolderSimple, Lock, ChatTeardropText } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FeatureStatus, FeatureType } from '@/types/feature';
import { IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { cn } from '@/lib/utils';
import { MilestoneDialog } from '@/components/dialogs/MilestoneDialog';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { FeatureKanban } from '@/components/FeatureKanban';
import { List, Kanban } from '@phosphor-icons/react';
import { CreateSubFeatureDialog } from '@/components/feature/CreateSubFeatureDialog';
import { Feature } from '@/types/feature';

export default function FeaturesPage() {
  const { featureId } = useParams();
  const { user, teams } = useAuth();
  const { 
    features, 
    projects, 
    isLoading, 
    fetchData, 
    updateFeature, 
    deleteFeature, 
    addFeature,
    addFeatureMilestone,
    updateFeatureMilestone,
    deleteFeatureMilestone,
    toggleFeatureMilestone,
    orgMembers,
  } = useIssueStore();
  
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
  
  const hasAccess = useMemo(() => {
    if (!teamId) return true;
    return hasTeamAccess(user, selectedTeam);
  }, [user, selectedTeam, teamId]);

  const { toast } = useToast();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(featureId || null);
  const [view, setView] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    if (featureId) {
      setSelectedFeatureId(featureId);
    }
  }, [featureId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneFeatureId, setMilestoneFeatureId] = useState<string | null>(null);
  
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createSubFeatureOpen, setCreateSubFeatureOpen] = useState(false);
  const [parentFeatureForSub, setParentFeatureForSub] = useState<Feature | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();
  const { teams: allTeams, addIssue } = useIssueStore(); // addIssue is already in store
  
  // Create Feature Form State
  const [newFeature, setNewFeature] = useState({
    name: '',
    project_id: '',
    type: 'new_capability' as FeatureType,
    priority: 'none' as any
  });

  // Create Milestone Form State
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    targetDate: '',
    parentId: '' as string | undefined
  });

  const filteredFeatures = useMemo(() => {
    if (!hasAccess) return [];
    
    let result = features;
    
    // Filter by team if teamId is present
    if (teamId) {
      const teamProjectIds = projects.filter(p => p.teamId === teamId || p.teams?.includes(teamId)).map(p => p.id);
      result = result.filter(f => teamProjectIds.includes(f.projectId));
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.problemStatement?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [features, projects, searchQuery, teamId, hasAccess]);

  const handleCreateFeature = async () => {
    if (!newFeature.name || !newFeature.project_id) return;
    try {
      await addFeature(newFeature);
      setCreateDialogOpen(false);
      setNewFeature({ name: '', project_id: '', type: 'new_capability', priority: 'none' });
      toast({ title: 'Feature created successfully' });
    } catch (error) {
      toast({ title: 'Failed to create feature', variant: 'destructive' });
    }
  };

  const handleAddMilestone = async (data: { name: string; description: string; targetDate?: string; parentId?: string }) => {
    if (!milestoneFeatureId) return;
    try {
      await addFeatureMilestone(milestoneFeatureId, {
        name: data.name,
        description: data.description,
        targetDate: data.targetDate || undefined,
        parentId: data.parentId || undefined
      });
      setMilestoneDialogOpen(false);
      setNewMilestone({ name: '', targetDate: '', parentId: '' });
      toast({ title: 'Milestone added' });
    } catch (error) {
      toast({ title: 'Failed to add milestone', variant: 'destructive' });
    }
  };

  const getFlatMilestones = (featureId: string | null) => {
    if (!featureId) return [];
    const feature = features.find(f => f.id === featureId);
    if (!feature || !feature.milestones) return [];
    
    const flat: { id: string, name: string }[] = [];
    const recurse = (list: any[]) => {
      list.forEach(m => {
        flat.push({ id: m.id, name: m.name });
      });
    };
    recurse(feature.milestones);
    return flat;
  };

  const currentProjectForNewFeature = projects.find(p => p.id === newFeature.project_id);

  return (
    <div className="flex flex-col h-full bg-[#090909] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/5 bg-[#090909] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Features</h1>
            {selectedTeam && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {selectedTeam.name}
              </div>
            )}
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="relative group">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features..." 
              className="h-8 w-64 bg-white/5 border-none pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex bg-white/5 p-1 rounded-lg gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md", view === 'list' ? "bg-white/10 text-white" : "text-white/40")}
              onClick={() => setView('list')}
            >
              <List size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md", view === 'kanban' ? "bg-white/10 text-white" : "text-white/40")}
              onClick={() => setView('kanban')}
            >
              <Kanban size={16} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-white/40 hover:text-white hover:bg-white/5">
            <Funnel className="h-4 w-4" />
            Filter
          </Button>
          <Button 
            size="sm" 
            className="h-9 gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-lg px-4 border border-primary/20"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold">New Feature</span>
          </Button>
        </div>
      </div>

      {teamId && !hasAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#090909] text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
            <Lock weight="bold" className="h-8 w-8 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white/90 mb-2">Restricted Access</h3>
          <p className="text-sm text-white/40 max-w-[320px]">
            You don't have permission to view features for the <span className="text-white/60 font-medium">{selectedTeam?.name || 'requested'}</span> team.
            Only admins and team leaders can access this information.
          </p>
        </div>
      ) : (
        <>
          {/* Main Content */}
          {view === 'list' ? (
            <FeatureWindow.List 
              features={filteredFeatures}
              projects={projects}
              teams={teams}
              loading={isLoading}
              onUpdateFeature={updateFeature}
              onDeleteFeature={deleteFeature}
              onSelectFeature={setSelectedFeatureId}
              onAddMilestone={(id, parentId) => {
                setMilestoneFeatureId(id);
                setNewMilestone({ name: '', targetDate: '', parentId: parentId || undefined });
                setMilestoneDialogOpen(true);
              }}
              onCreateIssueForMilestone={(featureId, milestoneId) => {
                setSelectedMilestoneId(milestoneId || undefined);
                setCreateIssueOpen(true);
              }}
              onToggleMilestone={toggleFeatureMilestone}
              onUpdateMilestone={updateFeatureMilestone}
              onDeleteMilestone={deleteFeatureMilestone}
              onCreateFeature={() => setCreateDialogOpen(true)}
              onAddSubFeature={(parent) => {
                setParentFeatureForSub(parent);
                setCreateSubFeatureOpen(true);
              }}
            />
          ) : (
            <FeatureKanban 
              features={filteredFeatures}
              projects={projects}
              teams={teams}
              onSelectFeature={setSelectedFeatureId}
              onUpdateFeature={updateFeature}
            />
          )}

          {/* Feature Detail Sidebar */}
          <FeatureWindow.Detail 
            featureId={selectedFeatureId}
            features={features}
            projects={projects}
            teams={teams}
            onClose={() => setSelectedFeatureId(null)}
            onUpdateFeature={updateFeature}
            onDeleteFeature={deleteFeature}
            onAddMilestone={(id, parentId) => {
              setMilestoneFeatureId(id);
              setNewMilestone({ name: '', targetDate: '', parentId: parentId || undefined });
              setMilestoneDialogOpen(true);
            }}
            onCreateIssueForMilestone={(featureId, milestoneId) => {
              setSelectedMilestoneId(milestoneId || undefined);
              setCreateIssueOpen(true);
            }}
            onToggleMilestone={toggleFeatureMilestone}
            onUpdateMilestone={updateFeatureMilestone}
            onDeleteMilestone={deleteFeatureMilestone}
            onAddFeature={addFeature}
            onAddSubFeature={(parent) => {
              setParentFeatureForSub(parent);
              setCreateSubFeatureOpen(true);
            }}
          />
        </>
      )}

      {/* Create Feature Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
          <DialogTitle className="sr-only">Create New Feature</DialogTitle>
          <DialogDescription className="sr-only">Fill in the details to create a new product feature.</DialogDescription>
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col"
          >
            <div className="px-6 py-4 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
              <span className="hover:text-white/40 cursor-default transition-colors">{selectedTeam?.name || 'Workspace'}</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">New Feature</span>
            </div>

            <div className="flex flex-col md:flex-row h-full min-h-[400px]">
              {/* Left Column: Visuals */}
              <div className="w-full md:w-1/3 border-r border-white/[0.03] p-8 flex flex-col items-center justify-center space-y-6 bg-white/[0.01]">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-6xl shadow-2xl transition-all duration-500 group-hover:scale-105">
                    🔹
                  </div>
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-widest">Feature</h4>
                  <p className="text-[10px] text-white/20 font-medium leading-relaxed max-w-[120px] mx-auto">Build and track key product capabilities</p>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="flex-1 p-8 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <input 
                      placeholder="Feature name" 
                      value={newFeature.name}
                      onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                      className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-white/90 selection:bg-primary/30 tracking-tight" 
                      autoFocus 
                    />
                    <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <FolderSimple className="h-3 w-3 text-white/20" />
                        <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Associated Project</h3>
                      </div>
                      <Select 
                        value={newFeature.project_id} 
                        onValueChange={(v) => setNewFeature({ ...newFeature, project_id: v })}
                      >
                        <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] rounded-xl px-4 transition-all focus:ring-1 focus:ring-primary/20 text-xs">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0C] border-white/10 max-h-[250px]">
                          {projects
                            .filter(p => !teamId || p.teamId === teamId || p.teams?.includes(teamId))
                            .map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs focus:bg-white/5 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{p.icon}</span>
                                  <span className="font-semibold text-white/80">{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Diamond className="h-3 w-3 text-white/20" />
                        <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Feature Type</h3>
                      </div>
                      <Select 
                        value={newFeature.type} 
                        onValueChange={(v) => setNewFeature({ ...newFeature, type: v as FeatureType })}
                      >
                        <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] rounded-xl px-4 transition-all focus:ring-1 focus:ring-primary/20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0C] border-white/10">
                          <SelectItem value="new_capability" className="text-xs focus:bg-white/5 py-2.5">New Capability</SelectItem>
                          <SelectItem value="enhancement" className="text-xs focus:bg-white/5 py-2.5">Enhancement</SelectItem>
                          <SelectItem value="experiment" className="text-xs focus:bg-white/5 py-2.5">Experiment</SelectItem>
                          <SelectItem value="infrastructure" className="text-xs focus:bg-white/5 py-2.5">Infrastructure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Funnel className="h-3 w-3 text-white/20" />
                        <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Priority</h3>
                      </div>
                      <Select 
                        value={newFeature.priority} 
                        onValueChange={(v) => setNewFeature({ ...newFeature, priority: v as IssuePriority })}
                      >
                        <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05] rounded-xl px-4 transition-all focus:ring-1 focus:ring-primary/20 text-xs">
                          <SelectValue>
                            <div className="flex items-center gap-2 text-left">
                              <FeatureWindow.PriorityIcon priority={newFeature.priority} />
                              <span className={cn("font-bold uppercase", PRIORITY_CONFIG[newFeature.priority].color)}>
                                {PRIORITY_CONFIG[newFeature.priority].label}
                              </span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C0C0C] border-white/10">
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="text-xs focus:bg-white/5 py-2.5">
                              <div className="flex items-center gap-2">
                                <FeatureWindow.PriorityIcon priority={key as IssuePriority} />
                                <span className={cn("font-bold uppercase", config.color)}>{config.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-4 text-white/10 select-none">
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-black">⌘</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-black">ENTER</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Feature</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setCreateDialogOpen(false)}
                  className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button 
                  variant="glass-primary"
                  onClick={handleCreateFeature}
                  disabled={!newFeature.name || !newFeature.project_id}
                  className="h-9 px-8 text-[11px] font-bold transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
                >
                  Create Feature
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <MilestoneDialog 
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        title="Feature Milestone"
        subtitle="Define a key phase for this product capability."
        onSave={handleAddMilestone}
        initialData={newMilestone}
      />

      <CreateIssueDialog 
        open={createIssueOpen} 
        onOpenChange={(open) => {
            setCreateIssueOpen(open);
            if (!open) setSelectedMilestoneId(undefined);
        }}
        projects={projects}
        features={features}
        teams={teams}
        orgMembers={orgMembers}
        selectedProjectId={null}
        defaultMilestoneId={selectedMilestoneId}
        onAddIssue={async (data) => {
            await addIssue(data);
            setCreateIssueOpen(false);
            setSelectedMilestoneId(undefined);
            toast({ title: 'Issue created' });
        }}
      />

      {parentFeatureForSub && (
        <CreateSubFeatureDialog 
          open={createSubFeatureOpen}
          onOpenChange={setCreateSubFeatureOpen}
          parentFeature={parentFeatureForSub}
          onAddFeature={async (data) => {
            await addFeature(data);
            setCreateSubFeatureOpen(false);
            toast({ title: 'Sub-feature created' });
          }}
        />
      )}
    </div>
  );
}
