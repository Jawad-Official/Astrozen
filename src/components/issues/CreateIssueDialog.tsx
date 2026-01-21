import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIssueStore } from '@/store/issueStore';
import { IssueStatus, IssuePriority } from '@/types/issue';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types/issue';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIssueDialog({ open, onOpenChange }: CreateIssueDialogProps) {
  const { addIssue, projects, selectedProjectId } = useIssueStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [projectId, setProjectId] = useState<string | undefined>(selectedProjectId || undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addIssue({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      labels: [],
      projectId,
    });

    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('none');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium"
            autoFocus
          />
          
          <Textarea
            placeholder="Add description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] resize-none"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    <span>{STATUS_CONFIG[status].label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={key as IssueStatus} />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <PriorityIcon priority={priority} />
                    <span>{PRIORITY_CONFIG[priority].label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={key as IssuePriority} />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? undefined : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <span>{project.icon}</span>
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
