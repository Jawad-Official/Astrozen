import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectStatus } from '@/types/issue';

const projectIcons = ['🎨', '⚡', '📱', '🚀', '💎', '🔥', '📊', '🎯', '⭐', '🛠️'];

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject, setCurrentView, setSelectedProject, projects } = useIssueStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎨');
  const [status, setStatus] = useState<ProjectStatus>('backlog');
  const [lead, setLead] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color: 'blue',
      status,
      health: 'no_updates',
      lead: lead.trim() || undefined,
      members: lead.trim() ? [lead.trim()] : [],
      milestones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the newly created project (last one added)
    const newProjects = useIssueStore.getState().projects;
    const newProject = newProjects[newProjects.length - 1];
    
    // Navigate to the new project
    if (newProject) {
      setSelectedProject(newProject.id);
      setCurrentView('project-detail');
    }

    // Reset form
    setName('');
    setDescription('');
    setIcon('🎨');
    setStatus('backlog');
    setLead('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {projectIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    icon === emoji
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">
              Project name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              className="bg-white/5 border-white/10"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short summary..."
              className="bg-white/5 border-white/10 resize-none"
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead */}
          <div className="space-y-2">
            <Label htmlFor="lead" className="text-sm text-muted-foreground">
              Lead
            </Label>
            <Input
              id="lead"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              placeholder="Add a project lead..."
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
