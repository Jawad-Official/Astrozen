import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { strategyService } from '@/services/strategy';
import { Feature, FeatureMilestone, Task } from '@/types/feature';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Check, 
  ShieldWarning as ShieldAlert, 
  Pulse,
  Plus,
  Package,
  CalendarBlank
} from '@phosphor-icons/react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import AgentPlan from '@/components/ui/agent-plan';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { MilestoneDialog } from '@/components/dialogs/MilestoneDialog';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { useIssueStore } from '@/store/issueStore';

export default function FeatureDetailPage() {
  const { featureId } = useParams<{ featureId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Feature>>({});
  
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();
  const { 
    projects, features, teams, orgMembers, 
    addIssue, fetchProjects, fetchFeatures, fetchTeams, fetchOrgMembers,
    deleteFeatureMilestone, toggleFeatureMilestone 
  } = useIssueStore();

  const [newMilestone, setNewMilestone] = useState({
    name: '',
    description: '',
    targetDate: '',
    parentId: undefined as string | undefined
  });

  useEffect(() => {
    if (featureId) loadFeature();
    if (projects.length === 0) fetchProjects();
    if (features.length === 0) fetchFeatures();
    if (teams.length === 0) fetchTeams();
    if (orgMembers.length === 0) fetchOrgMembers();
  }, [featureId]);

  async function loadFeature() {
    try {
      if (!featureId) return;
      const data = await strategyService.getFeature(featureId);
      setFeature(data);
      setFormData(data);
    } catch (error) {
      toast({ title: "Feature not found", variant: "destructive" });
      navigate('/features');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (!featureId) return;
      await strategyService.updateFeatureDetails(featureId, formData);
      toast({ title: "Feature updated" });
      setIsEditing(false);
      loadFeature();
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  }
  
  async function handleStatusChange(newStatus: string) {
    try {
      if (!featureId) return;
      await strategyService.updateFeatureStatus(featureId, newStatus);
      toast({ title: "Status updated" });
      loadFeature();
    } catch (error: any) {
      toast({ 
        title: "Status update failed", 
        description: error.response?.data?.detail || "Validation gates not met",
        variant: "destructive" 
      });
    }
  }

  const handleAddMilestone = async (data: { name: string; description: string; targetDate?: string; parentId?: string }) => {
    if (!featureId) return;
    try {
      await strategyService.createMilestone(featureId, {
        name: data.name,
        description: data.description,
        targetDate: data.targetDate || undefined,
        parentId: data.parentId
      });
      setMilestoneDialogOpen(false);
      setNewMilestone({ name: '', description: '', targetDate: '', parentId: undefined });
      toast({ title: 'Milestone added' });
      loadFeature();
    } catch (error) {
      toast({ title: 'Failed to add milestone', variant: 'destructive' });
    }
  };

  if (isLoading || !feature) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-4 px-6 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/features')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{feature.name}</h1>
            <Badge variant="outline">{feature.type}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
             <div className="flex items-center gap-1">
               <Badge variant="outline" className={cn(
                 "h-5 px-1.5 text-[10px] font-bold uppercase border-white/5 bg-white/5",
                 feature.health === 'on_track' ? 'text-emerald-500' : 
                 feature.health === 'at_risk' ? 'text-amber-500' : 'text-red-500'
               )}>
                 {feature.health.replace('_', ' ')}
               </Badge>
             </div>
             <div className="flex items-center gap-1">
               <Pulse className="w-3 h-3" />
               <span>{feature.deliveryConfidence ? `${Math.round(feature.deliveryConfidence * 100)}% Confidence` : 'No confidence score'}</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
             <>
               <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
               <Button onClick={handleSave}>Save Changes</Button>
             </>
          ) : (
             <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Definition</Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="definition" className="max-w-4xl mx-auto">
          <TabsList>
            <TabsTrigger value="definition">Core Definition</TabsTrigger>
            <TabsTrigger value="plan">Plan & Execution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="definition" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Problem & Target</CardTitle>
                <CardDescription>Hard required for Validation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Problem Statement</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.problemStatement || ''} 
                      onChange={e => setFormData({...formData, problemStatement: e.target.value})}
                    />
                  ) : <p className="text-sm text-muted-foreground">{feature.problemStatement || "Not defined"}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Target User</Label>
                   {isEditing ? (
                    <Input 
                      value={formData.targetUser || ''} 
                      onChange={e => setFormData({...formData, targetUser: e.target.value})}
                    />
                  ) : <p className="text-sm text-muted-foreground">{feature.targetUser || "Not defined"}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome & Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Expected Outcome</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.expectedOutcome || ''} 
                      onChange={e => setFormData({...formData, expectedOutcome: e.target.value})}
                    />
                  ) : <p className="text-sm text-muted-foreground">{feature.expectedOutcome || "Not defined"}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Success Metric</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.successMetric || ''} 
                      onChange={e => setFormData({...formData, successMetric: e.target.value})}
                    />
                  ) : <p className="text-sm text-muted-foreground">{feature.successMetric || "Not defined"}</p>}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Validation Evidence</CardTitle>
                <CardDescription>Required before building.</CardDescription>
              </CardHeader>
               <CardContent className="space-y-4">
                {isEditing ? (
                  <Textarea 
                    value={formData.validationEvidence || ''} 
                    onChange={e => setFormData({...formData, validationEvidence: e.target.value})}
                    placeholder="Links to research, data points, assumptions checked..."
                  />
                ) : <p className="text-sm text-muted-foreground">{feature.validationEvidence || "No evidence provided."}</p>}
              </CardContent>
            </Card>

            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 border-dashed">
               <h3 className="font-medium mb-3">Lifecycle Control</h3>
               <div className="flex flex-wrap gap-2">
                  {['discovery', 'validated', 'in_build', 'in_review', 'shipped', 'adopted'].map(status => (
                    <Button 
                      key={status}
                      variant={feature.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      className="capitalize"
                    >
                      {status === feature.status && <Check className="w-3 h-3 mr-1" />}
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
               </div>
            </div>
          </TabsContent>
          
          <TabsContent value="plan" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Strategic Roadmap</CardTitle>
                  <CardDescription>Plan and track delivery milestones.</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setNewMilestone({ name: '', description: '', targetDate: '', parentId: undefined });
                    setMilestoneDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Milestone
                </Button>
              </CardHeader>
              <CardContent>
                {feature.milestones && feature.milestones.length > 0 ? (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    {(() => {
                      const mapMilestonesToTasks = (ms: FeatureMilestone[]): Task[] => {
                        return ms.map(m => ({
                          id: m.id,
                          title: m.name,
                          description: m.description || '',
                          status: m.completed ? 'completed' : 'pending',
                          priority: 'medium',
                          level: 0,
                          dependencies: [],
                          subtasks: [] as any[]
                        }));
                      };
                      return (
                        <AgentPlan 
                          tasks={mapMilestonesToTasks(feature.milestones)}
                          onToggleStatus={(milestoneId) => toggleFeatureMilestone(feature.id, milestoneId)}
                          onCreateIssue={(milestoneId) => {
                            setMilestoneDialogOpen(false); // Explicitly close milestone dialog
                            setSelectedMilestoneId(milestoneId);
                            setCreateIssueOpen(true);
                          }}
                          onDeleteTask={(milestoneId) => deleteFeatureMilestone(feature.id, milestoneId)}
                        />
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                    <p>No milestones defined. Start planning the delivery roadmap.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MilestoneDialog 
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        title="Feature Milestone"
        subtitle="Strategic pillar for this capability."
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
        selectedProjectId={feature.projectId}
        defaultMilestoneId={selectedMilestoneId}
        onAddIssue={async (data) => {
            await addIssue(data);
            setCreateIssueOpen(false);
            setSelectedMilestoneId(undefined);
            toast({ title: 'Issue created' });
        }}
      />
    </div>
  );
}
