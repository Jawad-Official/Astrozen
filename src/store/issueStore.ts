import { create } from 'zustand';
import { Issue, IssueStatus, IssuePriority, Label, Project } from '@/types/issue';

interface IssueStore {
  issues: Issue[];
  projects: Project[];
  selectedProjectId: string | null;
  viewMode: 'list' | 'board';
  searchQuery: string;
  
  // Actions
  addIssue: (issue: Omit<Issue, 'id' | 'identifier' | 'createdAt' | 'updatedAt'>) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;
  setSelectedProject: (projectId: string | null) => void;
  setViewMode: (mode: 'list' | 'board') => void;
  setSearchQuery: (query: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultLabels: Label[] = [
  { id: '1', name: 'Bug', color: 'red' },
  { id: '2', name: 'Feature', color: 'purple' },
  { id: '3', name: 'Improvement', color: 'blue' },
  { id: '4', name: 'Documentation', color: 'yellow' },
];

const defaultProjects: Project[] = [
  { id: '1', name: 'Frontend', icon: '🎨', color: 'blue' },
  { id: '2', name: 'Backend', icon: '⚡', color: 'green' },
  { id: '3', name: 'Mobile', icon: '📱', color: 'purple' },
];

const defaultIssues: Issue[] = [
  {
    id: '1',
    identifier: 'LIN-1',
    title: 'Implement dark mode toggle',
    description: 'Add ability to switch between light and dark themes',
    status: 'in_progress',
    priority: 'high',
    labels: [defaultLabels[1]],
    projectId: '1',
    assignee: 'John Doe',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    identifier: 'LIN-2',
    title: 'Fix authentication bug on mobile',
    description: 'Users are getting logged out unexpectedly on mobile devices',
    status: 'todo',
    priority: 'urgent',
    labels: [defaultLabels[0]],
    projectId: '3',
    assignee: 'Jane Smith',
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
    description: 'Improve performance of list view by optimizing database queries',
    status: 'done',
    priority: 'medium',
    labels: [defaultLabels[2]],
    projectId: '2',
    assignee: 'John Doe',
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
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
  {
    id: '6',
    identifier: 'LIN-6',
    title: 'API rate limiting',
    description: 'Implement rate limiting for API endpoints',
    status: 'in_progress',
    priority: 'high',
    labels: [defaultLabels[2]],
    projectId: '2',
    assignee: 'Jane Smith',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
];

let issueCounter = 7;

export const useIssueStore = create<IssueStore>((set) => ({
  issues: defaultIssues,
  projects: defaultProjects,
  selectedProjectId: null,
  viewMode: 'list',
  searchQuery: '',

  addIssue: (issue) => {
    const newIssue: Issue = {
      ...issue,
      id: generateId(),
      identifier: `LIN-${issueCounter++}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ issues: [newIssue, ...state.issues] }));
  },

  updateIssue: (id, updates) => {
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id ? { ...issue, ...updates, updatedAt: new Date() } : issue
      ),
    }));
  },

  deleteIssue: (id) => {
    set((state) => ({
      issues: state.issues.filter((issue) => issue.id !== id),
    }));
  },

  setSelectedProject: (projectId) => {
    set({ selectedProjectId: projectId });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
}));
