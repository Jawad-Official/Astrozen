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
import { StatusIcon } from './issues/StatusIcon';
import { PriorityIcon } from './issues/PriorityIcon';
import { Plus, LayoutList, LayoutGrid, Folder, Search } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateIssue: () => void;
}

export function CommandPalette({ open, onOpenChange, onCreateIssue }: CommandPaletteProps) {
  const { 
    issues, 
    projects, 
    viewMode, 
    setViewMode, 
    setSelectedProject,
    setSearchQuery 
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
            <LayoutList className="mr-2 h-4 w-4" />
            Switch to list view
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(() => setViewMode('board'))}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Switch to board view
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Projects">
          <CommandItem onSelect={() => handleSelect(() => setSelectedProject(null))}>
            <Folder className="mr-2 h-4 w-4" />
            All issues
          </CommandItem>
          {projects.map((project) => (
            <CommandItem 
              key={project.id}
              onSelect={() => handleSelect(() => setSelectedProject(project.id))}
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
                  <StatusIcon status={issue.status} className="mr-2" />
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
