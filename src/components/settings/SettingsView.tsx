import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/types/issue';
import { 
  Settings, 
  Tag, 
  Folder, 
  Plus, 
  Pencil, 
  Trash2, 
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const labelColorOptions: Label['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: Label;
  onSave: (name: string, color: Label['color']) => void;
}

function LabelDialog({ open, onOpenChange, label, onSave }: LabelDialogProps) {
  const [name, setName] = useState(label?.name || '');
  const [color, setColor] = useState<Label['color']>(label?.color || 'blue');
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color);
      setName('');
      setColor('blue');
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label ? 'Edit Label' : 'Create Label'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel>Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <FormLabel>Color</FormLabel>
            <div className="flex items-center gap-2">
              {labelColorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 transition-transform',
                    labelColors[c],
                    color === c && 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110'
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {label ? 'Save Changes' : 'Create Label'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: { id: string; name: string; icon: string; color: string };
  onSave: (name: string, icon: string) => void;
}

function ProjectDialog({ open, onOpenChange, project, onSave }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name || '');
  const [icon, setIcon] = useState(project?.icon || '📁');
  
  const icons = ['📁', '🎨', '⚡', '📱', '🚀', '🔧', '💡', '🎯', '📊', '🔒'];
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), icon);
      setName('');
      setIcon('📁');
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create Project'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <FormLabel>Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <FormLabel>Icon</FormLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {icons.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={cn(
                    'h-10 w-10 text-xl flex items-center justify-center border border-border transition-colors',
                    icon === i && 'bg-accent border-foreground'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {project ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsView() {
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
      members: [],
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
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
        <Settings className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      
      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        
        {/* Workspace Tab */}
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
        
        {/* Labels Tab */}
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
                    <span className={cn('px-2 py-1 text-sm font-medium', labelColors[label.color])}>
                      {label.name}
                    </span>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditingLabel(label); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteLabel(label.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
        
        {/* Projects Tab */}
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
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
          />
          
          <ProjectDialog
            open={!!editingProject}
            onOpenChange={(open) => !open && setEditingProject(undefined)}
            project={editingProject}
            onSave={handleUpdateProject}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}