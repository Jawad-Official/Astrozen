import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/types/issue';
import { 
  Gear as SettingsIcon, 
  Plus, 
  PencilSimple, 
  Trash, 
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { LABEL_COLORS } from '@/lib/constants';
import { LabelDialog } from '@/components/dialogs/LabelDialog';
import { ProjectDialog } from '@/components/dialogs/ProjectDialog';
import { useOutletContext } from 'react-router-dom';

const SettingsPage = () => {
  const { onOpenAIPlanner } = useOutletContext<any>();
  const { 
    labels, 
    projects,
    addLabel, 
    updateLabel, 
    deleteLabel,
    addProject,
    updateProject,
    deleteProject,
    currentUser,
  } = useIssueStore();
  
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>();
  const [editingProject, setEditingProject] = useState<typeof projects[0] | undefined>();
  
  const handleCreateLabel = (name: string, color: Label['color']) => {
    addLabel({ name, color });
  };
  
  const handleUpdateLabel = (name: string, color: Label['color']) => {
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
                <div className="h-10 w-10 bg-primary/20 text-primary font-medium flex items-center justify-center">
                  {currentUser.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="font-medium">{currentUser}</span>
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
                {labels.map((label) => (
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
                {projects.map((project) => (
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
