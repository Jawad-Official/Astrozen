import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { STATUS_CONFIG, PRIORITY_CONFIG, IssueStatus, IssuePriority } from '@/types/issue';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { 
  Filter, 
  X, 
  Save, 
  ChevronDown,
  CircleDot,
  Signal,
  Tag,
  Folder,
  Target,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FilterBar() {
  const { 
    activeFilters, 
    setActiveFilters, 
    clearFilters,
    saveFilter,
    savedFilters,
    loadFilter,
    deleteFilter,
    projects,
    cycles,
    labels,
  } = useIssueStore();
  
  const [filterName, setFilterName] = useState('');
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  
  const hasActiveFilters = 
    activeFilters.statuses.length > 0 ||
    activeFilters.priorities.length > 0 ||
    activeFilters.labels.length > 0 ||
    activeFilters.projects.length > 0 ||
    activeFilters.cycles.length > 0 ||
    activeFilters.hasNoCycle ||
    activeFilters.hasNoAssignee;
  
  const activeFilterCount = [
    activeFilters.statuses.length,
    activeFilters.priorities.length,
    activeFilters.labels.length,
    activeFilters.projects.length,
    activeFilters.cycles.length,
    activeFilters.hasNoCycle ? 1 : 0,
    activeFilters.hasNoAssignee ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  
  const handleSaveFilter = () => {
    if (filterName.trim()) {
      saveFilter(filterName.trim());
      setFilterName('');
      setSavePopoverOpen(false);
    }
  };
  
  const toggleStatus = (status: IssueStatus) => {
    const current = activeFilters.statuses;
    const updated = current.includes(status) 
      ? current.filter(s => s !== status)
      : [...current, status];
    setActiveFilters({ statuses: updated });
  };
  
  const togglePriority = (priority: IssuePriority) => {
    const current = activeFilters.priorities;
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    setActiveFilters({ priorities: updated });
  };
  
  const toggleLabel = (labelId: string) => {
    const current = activeFilters.labels;
    const updated = current.includes(labelId)
      ? current.filter(l => l !== labelId)
      : [...current, labelId];
    setActiveFilters({ labels: updated });
  };
  
  const toggleProject = (projectId: string) => {
    const current = activeFilters.projects;
    const updated = current.includes(projectId)
      ? current.filter(p => p !== projectId)
      : [...current, projectId];
    setActiveFilters({ projects: updated });
  };
  
  const toggleCycle = (cycleId: string) => {
    const current = activeFilters.cycles;
    const updated = current.includes(cycleId)
      ? current.filter(c => c !== cycleId)
      : [...current, cycleId];
    setActiveFilters({ cycles: updated });
  };
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto scrollbar-thin">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <CircleDot className="h-3.5 w-3.5" />
            Status
            {activeFilters.statuses.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.statuses.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={activeFilters.statuses.includes(key as IssueStatus)}
              onCheckedChange={() => toggleStatus(key as IssueStatus)}
            >
              <StatusIcon status={key as IssueStatus} className="mr-2" />
              {config.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Signal className="h-3.5 w-3.5" />
            Priority
            {activeFilters.priorities.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.priorities.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={activeFilters.priorities.includes(key as IssuePriority)}
              onCheckedChange={() => togglePriority(key as IssuePriority)}
            >
              <PriorityIcon priority={key as IssuePriority} className="mr-2" />
              {config.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Label Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Label
            {activeFilters.labels.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.labels.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={activeFilters.labels.includes(label.id)}
              onCheckedChange={() => toggleLabel(label.id)}
            >
              {label.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Project Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Folder className="h-3.5 w-3.5" />
            Project
            {activeFilters.projects.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.projects.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {projects.map((project) => (
            <DropdownMenuCheckboxItem
              key={project.id}
              checked={activeFilters.projects.includes(project.id)}
              onCheckedChange={() => toggleProject(project.id)}
            >
              {project.icon} {project.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Cycle Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Cycle
            {activeFilters.cycles.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.cycles.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={activeFilters.hasNoCycle}
            onCheckedChange={(checked) => setActiveFilters({ hasNoCycle: checked })}
          >
            No cycle
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {cycles.map((cycle) => (
            <DropdownMenuCheckboxItem
              key={cycle.id}
              checked={activeFilters.cycles.includes(cycle.id)}
              onCheckedChange={() => toggleCycle(cycle.id)}
            >
              {cycle.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Assignee quick filter */}
      <Button 
        variant={activeFilters.hasNoAssignee ? 'secondary' : 'ghost'} 
        size="sm" 
        className="h-7 gap-1.5"
        onClick={() => setActiveFilters({ hasNoAssignee: !activeFilters.hasNoAssignee })}
      >
        <User className="h-3.5 w-3.5" />
        Unassigned
      </Button>
      
      <div className="flex-1" />
      
      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7">
              Saved Filters
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {savedFilters.map((filter) => (
              <DropdownMenuItem key={filter.id} className="justify-between">
                <span onClick={() => loadFilter(filter)}>{filter.name}</span>
                <X 
                  className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer ml-2"
                  onClick={(e) => { e.stopPropagation(); deleteFilter(filter.id); }}
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {/* Save current filter */}
      {hasActiveFilters && (
        <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-2">
              <Input
                placeholder="Filter name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
              />
              <Button size="sm" onClick={handleSaveFilter} className="w-full">
                Save Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}