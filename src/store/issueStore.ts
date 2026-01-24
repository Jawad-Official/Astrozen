import { create } from 'zustand';
import { Issue, IssueStatus, IssuePriority, Label, Project, Cycle, Comment, Activity, SavedFilter, FilterState, TriageStatus, CustomView } from '@/types/issue';
import { addDays, subDays, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

type ViewType = 'all' | 'my-issues' | 'inbox' | 'insights' | 'settings' | 'cycle' | 'projects' | 'project-detail' | 'views' | 'custom-view';

interface IssueStore {
  issues: Issue[];
  projects: Project[];
  cycles: Cycle[];
  labels: Label[];
  comments: Comment[];
  activities: Activity[];
  savedFilters: SavedFilter[];
  customViews: CustomView[];
  
  selectedProjectId: string | null;
  selectedCycleId: string | null;
  selectedIssueId: string | null;
  selectedCustomViewId: string | null;
  viewMode: 'list' | 'board';
  currentView: ViewType;
  searchQuery: string;
  activeFilters: FilterState;
  currentUser: string;
  
  // Issue Actions
  addIssue: (issue: Omit<Issue, 'id' | 'identifier' | 'createdAt' | 'updatedAt'>) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  
  // Cycle Actions
  addCycle: (cycle: Omit<Cycle, 'id'>) => void;
  updateCycle: (id: string, updates: Partial<Cycle>) => void;
  deleteCycle: (id: string) => void;
  
  // Label Actions
  addLabel: (label: Omit<Label, 'id'>) => void;
  updateLabel: (id: string, updates: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  
  // Project Actions
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Comment Actions
  addComment: (issueId: string, content: string) => void;
  
  // Filter Actions
  saveFilter: (name: string) => void;
  loadFilter: (filter: SavedFilter) => void;
  deleteFilter: (id: string) => void;
  setActiveFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  
  // Triage Actions
  triageIssue: (id: string, status: TriageStatus) => void;
  
  // Navigation
  setSelectedProject: (projectId: string | null) => void;
  setSelectedCycle: (cycleId: string | null) => void;
  setSelectedIssue: (issueId: string | null) => void;
  setSelectedCustomView: (viewId: string | null) => void;
  setViewMode: (mode: 'list' | 'board') => void;
  setCurrentView: (view: ViewType) => void;
  setSearchQuery: (query: string) => void;
  
  // Selectors
  getFilteredIssues: () => Issue[];
  getActiveCycle: () => Cycle | undefined;
  getCycleIssues: (cycleId: string) => Issue[];
  getMyIssues: () => Issue[];
  getTriageIssues: () => Issue[];
  getIssueById: (id: string) => Issue | undefined;
  getIssueComments: (issueId: string) => Comment[];
  getIssueActivities: (issueId: string) => Activity[];
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultLabels: Label[] = [
  { id: '1', name: 'Bug', color: 'red' },
  { id: '2', name: 'Feature', color: 'purple' },
  { id: '3', name: 'Improvement', color: 'blue' },
  { id: '4', name: 'Documentation', color: 'yellow' },
  { id: '5', name: 'Design', color: 'pink' },
  { id: '6', name: 'Performance', color: 'orange' },
];

const today = new Date();
const defaultProjects: Project[] = [
  { 
    id: '1', 
    name: 'Frontend', 
    icon: '🎨', 
    color: 'blue',
    status: 'in_progress',
    health: 'on_track',
    priority: 'high',
    lead: 'John Doe',
    members: ['John Doe', 'Jane Smith'],
    milestones: [],
    updates: [],
    resources: [],
    createdAt: subDays(today, 30),
    updatedAt: subDays(today, 1),
  },
  { 
    id: '2', 
    name: 'Backend', 
    icon: '⚡', 
    color: 'green',
    status: 'in_progress',
    health: 'no_updates',
    priority: 'medium',
    members: ['Jane Smith'],
    milestones: [],
    updates: [],
    resources: [],
    createdAt: subDays(today, 60),
    updatedAt: subDays(today, 10),
  },
  { 
    id: '3', 
    name: 'Mobile', 
    icon: '📱', 
    color: 'purple',
    status: 'planned',
    health: 'on_track',
    priority: 'low',
    lead: 'Jane Smith',
    members: ['Jane Smith'],
    targetDate: addDays(today, 30),
    milestones: [],
    updates: [],
    resources: [],
    createdAt: subDays(today, 14),
    updatedAt: today,
  },
];

const defaultCustomViews: CustomView[] = [
  {
    id: '1',
    name: 'My Active Work',
    icon: '🔥',
    type: 'issues',
    owner: 'jawadcoder0',
    visibility: 'personal',
    filters: {
      statuses: ['todo', 'in_progress'],
      priorities: [],
      labels: [],
      projects: [],
      cycles: [],
      assignees: ['John Doe'],
      hasNoCycle: false,
      hasNoAssignee: false,
    },
    layout: 'board',
    createdAt: subDays(today, 7),
  },
];

const defaultCycles: Cycle[] = [
  { 
    id: '1', 
    name: 'Sprint 1', 
    startDate: startOfWeek(subDays(today, 14)), 
    endDate: endOfWeek(subDays(today, 7)),
    status: 'completed'
  },
  { 
    id: '2', 
    name: 'Sprint 2', 
    startDate: startOfWeek(today), 
    endDate: endOfWeek(addDays(today, 6)),
    status: 'active'
  },
  { 
    id: '3', 
    name: 'Sprint 3', 
    startDate: startOfWeek(addWeeks(today, 1)), 
    endDate: endOfWeek(addWeeks(today, 2)),
    status: 'upcoming'
  },
];

const defaultIssues: Issue[] = [
  {
    id: '1',
    identifier: 'LIN-1',
    title: 'Implement dark mode toggle',
    description: 'Add ability to switch between light and dark themes. This should persist user preference in local storage and respect system preferences by default.',
    status: 'in_progress',
    priority: 'high',
    labels: [defaultLabels[1]],
    projectId: '1',
    cycleId: '2',
    assignee: 'John Doe',
    estimate: 3,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    identifier: 'LIN-2',
    title: 'Fix authentication bug on mobile',
    description: 'Users are getting logged out unexpectedly on mobile devices. This seems to be related to token refresh timing.',
    status: 'todo',
    priority: 'urgent',
    labels: [defaultLabels[0]],
    projectId: '3',
    cycleId: '2',
    assignee: 'Jane Smith',
    estimate: 5,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: '3',
    identifier: 'LIN-3',
    title: 'Add keyboard shortcuts documentation',
    description: 'Document all available keyboard shortcuts in the help section',
    status: 'backlog',
    priority: 'low',
    labels: [defaultLabels[3]],
    projectId: '1',
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
  },
  {
    id: '4',
    identifier: 'LIN-4',
    title: 'Optimize database queries',
    description: 'Improve performance of list view by optimizing database queries. Target: reduce load time from 2s to under 500ms.',
    status: 'done',
    priority: 'medium',
    labels: [defaultLabels[2], defaultLabels[5]],
    projectId: '2',
    cycleId: '1',
    assignee: 'John Doe',
    estimate: 8,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: '5',
    identifier: 'LIN-5',
    title: 'Add drag and drop for issues',
    description: 'Allow users to drag issues between columns in board view',
    status: 'todo',
    priority: 'medium',
    labels: [defaultLabels[1]],
    projectId: '1',
    cycleId: '2',
    assignee: 'John Doe',
    estimate: 5,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
  {
    id: '6',
    identifier: 'LIN-6',
    title: 'API rate limiting',
    description: 'Implement rate limiting for API endpoints to prevent abuse',
    status: 'in_progress',
    priority: 'high',
    labels: [defaultLabels[2]],
    projectId: '2',
    cycleId: '2',
    assignee: 'Jane Smith',
    estimate: 3,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '7',
    identifier: 'LIN-7',
    title: 'Customer feedback widget',
    description: 'Integrate feedback collection widget on the dashboard',
    status: 'backlog',
    priority: 'medium',
    labels: [defaultLabels[1]],
    projectId: '1',
    triageStatus: 'pending',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: '8',
    identifier: 'LIN-8',
    title: 'Fix memory leak in websocket handler',
    description: 'Memory usage grows over time when websocket connections are kept open',
    status: 'backlog',
    priority: 'high',
    labels: [defaultLabels[0], defaultLabels[5]],
    projectId: '2',
    triageStatus: 'pending',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
];

const defaultComments: Comment[] = [
  {
    id: '1',
    issueId: '1',
    author: 'Jane Smith',
    content: 'I started working on this. The system preferences detection is done, now working on the toggle UI.',
    createdAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    issueId: '1',
    author: 'John Doe',
    content: 'Great progress! Make sure to test on Safari as well.',
    createdAt: new Date('2024-01-15T11:00:00'),
  },
  {
    id: '3',
    issueId: '2',
    author: 'Jane Smith',
    content: 'Found the root cause - the token refresh is racing with the auth check. Working on a fix.',
    createdAt: new Date('2024-01-14T14:00:00'),
  },
];

const defaultActivities: Activity[] = [
  { id: '1', issueId: '1', type: 'created', actor: 'John Doe', createdAt: new Date('2024-01-15T09:00:00') },
  { id: '2', issueId: '1', type: 'assigned', actor: 'John Doe', newValue: 'John Doe', createdAt: new Date('2024-01-15T09:01:00') },
  { id: '3', issueId: '1', type: 'status_changed', actor: 'John Doe', oldValue: 'backlog', newValue: 'in_progress', createdAt: new Date('2024-01-15T09:30:00') },
  { id: '4', issueId: '2', type: 'created', actor: 'Jane Smith', createdAt: new Date('2024-01-14T08:00:00') },
  { id: '5', issueId: '2', type: 'priority_changed', actor: 'Jane Smith', oldValue: 'high', newValue: 'urgent', createdAt: new Date('2024-01-14T12:00:00') },
];

let issueCounter = 9;
let commentCounter = 4;
let activityCounter = 6;

const defaultFilters: FilterState = {
  statuses: [],
  priorities: [],
  labels: [],
  projects: [],
  cycles: [],
  assignees: [],
  hasNoCycle: false,
  hasNoAssignee: false,
};

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: defaultIssues,
  projects: defaultProjects,
  cycles: defaultCycles,
  labels: defaultLabels,
  comments: defaultComments,
  activities: defaultActivities,
  savedFilters: [],
  customViews: defaultCustomViews,
  
  selectedProjectId: null,
  selectedCycleId: null,
  selectedIssueId: null,
  selectedCustomViewId: null,
  viewMode: 'list',
  currentView: 'all',
  searchQuery: '',
  activeFilters: defaultFilters,
  currentUser: 'John Doe',

  // Issue Actions
  addIssue: (issue) => {
    const newIssue: Issue = {
      ...issue,
      id: generateId(),
      identifier: `LIN-${issueCounter++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const activity: Activity = {
      id: generateId(),
      issueId: newIssue.id,
      type: 'created',
      actor: get().currentUser,
      createdAt: new Date(),
    };
    set((state) => ({ 
      issues: [newIssue, ...state.issues],
      activities: [...state.activities, activity],
    }));
  },

  updateIssue: (id, updates) => {
    const state = get();
    const issue = state.issues.find(i => i.id === id);
    if (!issue) return;
    
    const newActivities: Activity[] = [];
    
    if (updates.status && updates.status !== issue.status) {
      newActivities.push({
        id: generateId(),
        issueId: id,
        type: 'status_changed',
        actor: state.currentUser,
        oldValue: issue.status,
        newValue: updates.status,
        createdAt: new Date(),
      });
    }
    
    if (updates.priority && updates.priority !== issue.priority) {
      newActivities.push({
        id: generateId(),
        issueId: id,
        type: 'priority_changed',
        actor: state.currentUser,
        oldValue: issue.priority,
        newValue: updates.priority,
        createdAt: new Date(),
      });
    }
    
    if (updates.assignee !== undefined && updates.assignee !== issue.assignee) {
      newActivities.push({
        id: generateId(),
        issueId: id,
        type: 'assigned',
        actor: state.currentUser,
        oldValue: issue.assignee,
        newValue: updates.assignee,
        createdAt: new Date(),
      });
    }
    
    if (updates.cycleId !== undefined && updates.cycleId !== issue.cycleId) {
      const cycle = state.cycles.find(c => c.id === updates.cycleId);
      newActivities.push({
        id: generateId(),
        issueId: id,
        type: 'cycle_changed',
        actor: state.currentUser,
        oldValue: issue.cycleId,
        newValue: cycle?.name || 'None',
        createdAt: new Date(),
      });
    }
    
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id ? { ...issue, ...updates, updatedAt: new Date() } : issue
      ),
      activities: [...state.activities, ...newActivities],
    }));
  },

  deleteIssue: (id) => {
    set((state) => ({
      issues: state.issues.filter((issue) => issue.id !== id),
      selectedIssueId: state.selectedIssueId === id ? null : state.selectedIssueId,
    }));
  },

  // Cycle Actions
  addCycle: (cycle) => {
    const newCycle: Cycle = {
      ...cycle,
      id: generateId(),
    };
    set((state) => ({ cycles: [...state.cycles, newCycle] }));
  },

  updateCycle: (id, updates) => {
    set((state) => ({
      cycles: state.cycles.map((cycle) =>
        cycle.id === id ? { ...cycle, ...updates } : cycle
      ),
    }));
  },

  deleteCycle: (id) => {
    set((state) => ({
      cycles: state.cycles.filter((cycle) => cycle.id !== id),
      issues: state.issues.map((issue) =>
        issue.cycleId === id ? { ...issue, cycleId: undefined } : issue
      ),
    }));
  },

  // Label Actions
  addLabel: (label) => {
    const newLabel: Label = {
      ...label,
      id: generateId(),
    };
    set((state) => ({ labels: [...state.labels, newLabel] }));
  },

  updateLabel: (id, updates) => {
    set((state) => ({
      labels: state.labels.map((label) =>
        label.id === id ? { ...label, ...updates } : label
      ),
    }));
  },

  deleteLabel: (id) => {
    set((state) => ({
      labels: state.labels.filter((label) => label.id !== id),
      issues: state.issues.map((issue) => ({
        ...issue,
        labels: issue.labels.filter((l) => l.id !== id),
      })),
    }));
  },

  // Project Actions
  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: generateId(),
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
  },

  updateProject: (id, updates) => {
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      ),
    }));
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      issues: state.issues.map((issue) =>
        issue.projectId === id ? { ...issue, projectId: undefined } : issue
      ),
    }));
  },

  // Comment Actions
  addComment: (issueId, content) => {
    const comment: Comment = {
      id: generateId(),
      issueId,
      author: get().currentUser,
      content,
      createdAt: new Date(),
    };
    const activity: Activity = {
      id: generateId(),
      issueId,
      type: 'comment',
      actor: get().currentUser,
      createdAt: new Date(),
    };
    set((state) => ({
      comments: [...state.comments, comment],
      activities: [...state.activities, activity],
    }));
  },

  // Filter Actions
  saveFilter: (name) => {
    const filter: SavedFilter = {
      id: generateId(),
      name,
      filters: { ...get().activeFilters },
    };
    set((state) => ({ savedFilters: [...state.savedFilters, filter] }));
  },

  loadFilter: (filter) => {
    set({ activeFilters: { ...filter.filters } });
  },

  deleteFilter: (id) => {
    set((state) => ({
      savedFilters: state.savedFilters.filter((f) => f.id !== id),
    }));
  },

  setActiveFilters: (filters) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ activeFilters: defaultFilters });
  },

  // Triage Actions
  triageIssue: (id, status) => {
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id 
          ? { 
              ...issue, 
              triageStatus: status,
              status: status === 'accepted' ? 'todo' : issue.status,
            } 
          : issue
      ),
    }));
  },

  // Navigation
  setSelectedProject: (projectId) => {
    set({ selectedProjectId: projectId });
  },

  setSelectedCycle: (cycleId) => {
    set({ selectedCycleId: cycleId });
  },

  setSelectedIssue: (issueId) => {
    set({ selectedIssueId: issueId });
  },

  setSelectedCustomView: (viewId) => {
    set({ selectedCustomViewId: viewId });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setCurrentView: (view) => {
    // Don't reset selectedProjectId when going to project-detail, or selectedCycleId when going to cycle
    const updates: Partial<IssueStore> = { currentView: view };
    if (view !== 'project-detail') {
      updates.selectedProjectId = null;
    }
    if (view !== 'cycle') {
      updates.selectedCycleId = null;
    }
    set(updates);
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Selectors
  getFilteredIssues: () => {
    const state = get();
    const { issues, selectedProjectId, selectedCycleId, searchQuery, activeFilters, currentView } = state;
    
    return issues.filter((issue) => {
      // View-based filtering
      if (currentView === 'my-issues' && issue.assignee !== state.currentUser) return false;
      if (currentView === 'inbox' && issue.triageStatus !== 'pending') return false;
      if (currentView === 'cycle' && selectedCycleId && issue.cycleId !== selectedCycleId) return false;
      
      // Project filter
      if (selectedProjectId && issue.projectId !== selectedProjectId) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!issue.title.toLowerCase().includes(query) && 
            !issue.identifier.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Active filters
      if (activeFilters.statuses.length > 0 && !activeFilters.statuses.includes(issue.status)) return false;
      if (activeFilters.priorities.length > 0 && !activeFilters.priorities.includes(issue.priority)) return false;
      if (activeFilters.projects.length > 0 && (!issue.projectId || !activeFilters.projects.includes(issue.projectId))) return false;
      if (activeFilters.cycles.length > 0 && (!issue.cycleId || !activeFilters.cycles.includes(issue.cycleId))) return false;
      if (activeFilters.labels.length > 0 && !issue.labels.some(l => activeFilters.labels.includes(l.id))) return false;
      if (activeFilters.hasNoCycle && issue.cycleId) return false;
      if (activeFilters.hasNoAssignee && issue.assignee) return false;
      
      return true;
    });
  },

  getActiveCycle: () => {
    return get().cycles.find((c) => c.status === 'active');
  },

  getCycleIssues: (cycleId) => {
    return get().issues.filter((issue) => issue.cycleId === cycleId);
  },

  getMyIssues: () => {
    const state = get();
    return state.issues.filter((issue) => issue.assignee === state.currentUser);
  },

  getTriageIssues: () => {
    return get().issues.filter((issue) => issue.triageStatus === 'pending');
  },

  getIssueById: (id) => {
    return get().issues.find((issue) => issue.id === id);
  },

  getIssueComments: (issueId) => {
    return get().comments.filter((c) => c.issueId === issueId);
  },

  getIssueActivities: (issueId) => {
    return get().activities.filter((a) => a.issueId === issueId);
  },
}));