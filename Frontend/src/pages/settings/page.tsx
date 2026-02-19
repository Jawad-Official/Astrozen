import { useState, useEffect } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label as LabelType, Project } from '@/types/issue';
import { Label } from '@/components/ui/label';
import { organizationService } from '@/services/organization';
import { 
  Gear as SettingsIcon, 
  Plus, 
  PencilSimple, 
  Trash, 
  User,
  Buildings,
  Copy,
  ArrowClockwise
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { LABEL_COLORS } from '@/lib/constants';
import { LabelDialog } from '@/components/dialogs/LabelDialog';
import { ProjectDialog } from '@/components/dialogs/ProjectDialog';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { onOpenAIPlanner } = useOutletContext<any>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    labels, 
    projects,
    addLabel, 
    updateLabel, 
    deleteLabel,
    addProject,
    updateProject,
    deleteProject,
  } = useIssueStore();
  
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelType | undefined>();
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  
  // Organization state
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState(false);
  
  const handleGenerateCode = async () => {
    setLoadingCode(true);
    try {
      const code = await organizationService.generateInviteCode();
      setInviteCode(code.code);
      toast({
        title: "Invite code generated",
        description: "Share this code with others to let them join.",
      });
    } catch (error) {
      toast({
        title: "Failed to generate code",
        description: "You might not have permission or there was an error.",
        variant: "destructive",
      });
    } finally {
      setLoadingCode(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Invite code copied to clipboard.",
    });
  };
  
  const handleCreateLabel = (name: string, color: LabelType['color']) => {
    addLabel({ name, color });
  };
  
  const handleUpdateLabel = (name: string, color: LabelType['color']) => {
    if (editingLabel) {
      updateLabel(editingLabel.id, { name, color });
    }
    setEditingLabel(undefined);
  };
  
  const handleCreateProject = (name: string, icon: string) => {
    addProject({ 
      name, 
      icon, 
      color: 'blue',
      status: 'backlog',
      health: 'no_updates',
      priority: 'none',
      members: [],
      teams: [],
      milestones: [],
      updates: [],
      resources: [],
    });
  };
  
  const handleUpdateProject = (name: string, icon: string) => {
    if (editingProject) {
      updateProject(editingProject.id, { name, icon });
    }
    setEditingProject(undefined);
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      
      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workspace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current User
              </CardTitle>
              <CardDescription>
                Your identity for issue assignments and activity tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/20 text-primary font-medium flex items-center justify-center rounded-lg">
                  {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : '??'}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.fullName || 'Not Logged In'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Buildings className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Manage your organization and invite new members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Join Organization Code</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-center border tracking-widest text-lg min-h-[50px] flex items-center justify-center">
                    {inviteCode || 'No code generated yet'}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => copyToClipboard(inviteCode)}
                    disabled={!inviteCode}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={handleGenerateCode}
                      disabled={loadingCode}
                    >
                      <ArrowClockwise className={cn("h-5 w-5", loadingCode && "animate-spin")} />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with others to let them join your organization. 
                  {user?.role === 'admin' ? " Click the refresh icon to generate a new code." : " Only admins can generate new codes."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labels" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Labels</h2>
              <p className="text-sm text-muted-foreground">
                Manage labels used to categorize issues
              </p>
            </div>
            <Button onClick={() => setLabelDialogOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Label
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {labels?.map((label) => (
                  <div key={label.id} className="flex items-center gap-3 p-3">
                    <span className={cn('px-2 py-1 text-sm font-medium', LABEL_COLORS[label.color])}>
                      {label.name}
                    </span>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditingLabel(label); }}
                    >
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteLabel(label.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <LabelDialog
            open={labelDialogOpen}
            onOpenChange={setLabelDialogOpen}
            onSave={handleCreateLabel}
          />
          
          <LabelDialog
            key={editingLabel?.id || 'new'}
            open={!!editingLabel}
            onOpenChange={(open) => !open && setEditingLabel(undefined)}
            label={editingLabel}
            onSave={handleUpdateLabel}
          />
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Projects</h2>
              <p className="text-sm text-muted-foreground">
                Manage projects to organize your issues
              </p>
            </div>
            <Button onClick={() => setProjectDialogOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {projects?.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 p-3">
                    <span className="text-xl">{project.icon}</span>
                    <span className="font-medium">{project.name}</span>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingProject(project)}
                    >
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <ProjectDialog
            open={projectDialogOpen}
            onOpenChange={setProjectDialogOpen}
            onSave={handleCreateProject}
            onPlanWithAI={onOpenAIPlanner}
          />
          
          <ProjectDialog
            key={editingProject?.id || 'new-project'}
            open={!!editingProject}
            onOpenChange={(open) => !open && setEditingProject(undefined)}
            project={editingProject}
            onSave={handleUpdateProject}
            onPlanWithAI={onOpenAIPlanner}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
