import { useState } from 'react';
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
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Funnel, 
  X, 
  FloppyDisk, 
  CaretDown,
  CircleHalf,
  ChartBar,
  FolderSimple,
  Target,
  User,
  Tag,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_CONFIG, IssueStatus, IssuePriority, IssueType } from '@/types/issue';
import { IssueBar } from '@/components/IssueBar';
import { useIssueStore } from '@/store/issueStore';

export function IssueFilterBar() {
  const { 
    activeFilters, 
    setActiveFilters, 
    clearFilters,
    saveFilter,
    savedFilters,
    loadFilter,
    deleteFilter,
    projects,
  } = useIssueStore();
  
  const [filterName, setFilterName] = useState('');
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  
  const hasActiveFilters = 
    activeFilters.statuses.length > 0 ||
    activeFilters.priorities.length > 0 ||
    activeFilters.types.length > 0 ||
    activeFilters.projects.length > 0 ||
    activeFilters.hasNoAssignee;
  
  const activeFilterCount = [
    activeFilters.statuses.length,
    activeFilters.priorities.length,
    activeFilters.types.length,
    activeFilters.projects.length,
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

  const toggleType = (type: IssueType) => {
    const current = activeFilters.types;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setActiveFilters({ types: updated });
  };

  const toggleProject = (projectId: string) => {
    const current = activeFilters.projects;
    const updated = current.includes(projectId)
      ? current.filter(p => p !== projectId)
      : [...current, projectId];
    setActiveFilters({ projects: updated });
  };
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto scrollbar-thin shrink-0">
      <Funnel className="h-4 w-4 text-muted-foreground shrink-0" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <CircleHalf className="h-3.5 w-3.5" />
            Status
            {activeFilters.statuses.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.statuses.length}
              </Badge>
            )}
            <CaretDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={activeFilters.statuses.includes(key as IssueStatus)}
              onCheckedChange={() => toggleStatus(key as IssueStatus)}
            >
              <Badge variant="outline" className="h-4 px-1 text-[8px] font-bold uppercase border-white/5 bg-white/5 text-white/60 mr-2">
                {config.label}
              </Badge>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Type
            {activeFilters.types.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.types.length}
              </Badge>
            )}
            <CaretDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={activeFilters.types.includes(key as IssueType)}
              onCheckedChange={() => toggleType(key as IssueType)}
            >
              <IssueBar.TypeIcon type={key as IssueType} className="mr-2" />
              {config.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <ChartBar className="h-3.5 w-3.5" />
            Priority
            {activeFilters.priorities.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.priorities.length}
              </Badge>
            )}
            <CaretDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <DropdownMenuCheckboxItem
              key={key}
              checked={activeFilters.priorities.includes(key as IssuePriority)}
              onCheckedChange={() => togglePriority(key as IssuePriority)}
            >
              <div className="flex items-center gap-2">
                <IssueBar.PriorityIcon priority={key} />
                <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Label filter removed */}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5">
            <FolderSimple className="h-3.5 w-3.5" />
            Project
            {activeFilters.projects.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilters.projects.length}
              </Badge>
            )}
            <CaretDown className="h-3 w-3" />
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
      
      {savedFilters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7">
              Saved Filters
              <CaretDown className="h-3 w-3 ml-1" />
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
      
      {hasActiveFilters && (
        <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5">
              <FloppyDisk className="h-3.5 w-3.5" />
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
      
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
