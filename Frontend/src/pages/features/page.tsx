import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useIssueStore } from '@/store/issueStore';
import { useAuth } from '@/context/AuthContext';
import { hasTeamAccess } from '@/lib/permissions';
import { FeatureWindow } from '@/components/FeatureWindow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { MilestoneDialog } from '@/components/dialogs/MilestoneDialog';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { FeatureKanban } from '@/components/FeatureKanban';
import { List, Kanban, Plus, MagnifyingGlass, Funnel, Lock } from '@phosphor-icons/react';
import { CreateSubFeatureDialog } from '@/components/feature/CreateSubFeatureDialog';
import { CreateFeatureDialog } from '@/components/feature/CreateFeatureDialog';
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
  const { teams: allTeams, addIssue } = useIssueStore();

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

  const handleAddFeature = async (data: any) => {
    try {
      await addFeature(data);
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

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Features</h1>
            {selectedTeam && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-[10px] uppercase font-bold text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {selectedTeam.name}
              </div>
            )}
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="relative group">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features..." 
              className="h-8 w-64 bg-muted border-none pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex bg-muted p-1 rounded-lg gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md", view === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              onClick={() => setView('list')}
            >
              <List size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md", view === 'kanban' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
              onClick={() => setView('kanban')}
            >
              <Kanban size={16} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted">
            <Funnel className="h-4 w-4" />
            Filter
          </Button>
<Button 
            variant="ghost"
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
        <EmptyState
          icon={<Lock weight="duotone" className="h-8 w-8 text-muted-foreground/40" />}
          title="Restricted Access"
          description={`You don't have permission to view features for the ${selectedTeam?.name || 'requested'} team. Only admins and team leaders can access this information.`}
        />
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
            orgMembers={orgMembers}
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
      <CreateFeatureDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projects={projects}
        teams={teams}
        orgMembers={orgMembers}
        selectedProjectId={null}
        selectedTeamId={teamId}
        onAddFeature={handleAddFeature}
      />

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
