import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useIssueStore } from '@/store/issueStore';
import { IssueBar } from './IssueBar';
import { Plus, List, Columns, FolderSimple } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG } from '@/types/issue';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateIssue: () => void;
}

export function CommandPalette({ open, onOpenChange, onCreateIssue }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { 
    issues, 
    projects, 
    setViewMode, 
  } = useIssueStore();
  
  const [search, setSearch] = useState('');

  const filteredIssues = issues.filter((issue) =>
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.identifier.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
    setSearch('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search issues, commands..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => handleSelect(onCreateIssue)}>
            <Plus className="mr-2 h-4 w-4" />
            Create new issue
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setViewMode('list'))}>
            <List className="mr-2 h-4 w-4" />
            Switch to list view
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setViewMode('board'))}>
            <Columns className="mr-2 h-4 w-4" />
            Switch to board view
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Projects">
          <CommandItem onSelect={() => handleSelect(() => navigate('/all-issues'))}>
            <FolderSimple className="mr-2 h-4 w-4" />
            All issues
          </CommandItem>
          {projects.map((project) => (
            <CommandItem 
              key={project.id}
              onSelect={() => handleSelect(() => navigate(`/projects/${project.id}`))}
            >
              <span className="mr-2">{project.icon}</span>
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>

        {filteredIssues.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Issues">
              {filteredIssues.map((issue) => (
                <CommandItem key={issue.id}>
                  <Badge variant="outline" className="h-4 px-1 text-[8px] font-bold uppercase border-white/5 bg-white/5 text-white/60 mr-2">
                    {STATUS_CONFIG[issue.status].label}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {issue.identifier}
                  </span>
                  <span className="truncate">{issue.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
