import { create } from 'zustand';
import { Issue, Label, Project, Comment, Activity, SavedFilter, FilterState, TriageStatus, Cycle, CustomView } from '@/types/issue';
import { Feature, FeatureMilestone } from '@/types/feature';
import { Team } from '@/types/auth';
import { issueService } from '@/services/issues';
import { projectService } from '@/services/projects';
import { featureService } from '@/services/features';
import { teamService } from '@/services/teams';
import { userService } from '@/services/users';
import { mapFeature, mapFeatureMilestone } from '@/services/mapper';

type ViewType = 'all' | 'my-issues' | 'inbox' | 'triage' | 'insights' | 'settings' | 'project-detail' | 'projects' | 'strategy';

export interface Notification {
  id: string;
  type: 'comment' | 'assignment' | 'status_change' | 'mention';
  issueId?: string;
  issueTitle?: string;
  actorName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface IssueStore {
  issues: Issue[];
  projects: Project[];
  features: Feature[];
  teams: Team[];
  cycles: Cycle[];
  comments: Comment[];
  activities: Activity[];
  savedFilters: SavedFilter[];
  customViews: CustomView[];
  orgMembers: any[];
  notifications: Notification[];
  
  isLoading: boolean;
  error: string | null;
  
  selectedProjectId: string | null;
  selectedCycleId: string | null;
  selectedIssueId: string | null;
  viewMode: 'list' | 'board';
  currentView: ViewType;
  searchQuery: string;
  activeFilters: FilterState;
  currentUser: string | null;
  
  // Async Actions
  fetchData: () => Promise<void>;
  fetchIssues: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  fetchFeatures: () => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchOrgMembers: () => Promise<void>;
  
  // Issue Actions
  addIssue: (issue: Partial<Issue>) => Promise<void>;
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;
  
  // Project Actions
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProjectUpdate: (projectId: string, data: { content: string, health: string }) => Promise<void>;
  deleteProjectUpdate: (projectId: string, updateId: string) => Promise<void>;
  addProjectResource: (projectId: string, data: { name: string, url: string, type: string }) => Promise<void>;
  deleteProjectResource: (projectId: string, resourceId: string) => Promise<void>;
  toggleProjectFavorite: (projectId: string) => Promise<void>;
  addUpdateComment: (projectId: string, updateId: string, content: string, parentId?: string) => Promise<void>;
  deleteUpdateComment: (projectId: string, updateId: string, commentId: string) => Promise<void>;
  toggleUpdateReaction: (projectId: string, updateId: string, emoji: string) => Promise<void>;
  toggleUpdateCommentReaction: (projectId: string, updateId: string, commentId: string, emoji: string) => Promise<void>;

  // Team Actions
  addTeam: (teamData: any) => Promise<void>;
  updateTeam: (id: string, data: any) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  // Feature Actions
  addFeature: (featureData: any) => Promise<void>;
  updateFeature: (id: string, updates: any) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;
  addFeatureMilestone: (featureId: string, data: any) => Promise<void>;
  updateFeatureMilestone: (featureId: string, milestoneId: string, updates: any) => Promise<void>;
  deleteFeatureMilestone: (featureId: string, milestoneId: string) => Promise<void>;
  toggleFeatureMilestone: (featureId: string, milestoneId: string) => Promise<void>;

  // Sync Actions
  setCurrentUser: (userId: string) => void;
  setSelectedIssue: (issueId: string | null) => void;
  setCurrentView: (view: ViewType) => void;
  setViewMode: (mode: 'list' | 'board') => void;
  setSearchQuery: (query: string) => void;
  setSelectedProject: (projectId: string | null) => void;
  
  // Triage
  triageIssue: (id: string, status: TriageStatus) => void;
  
  // Comments
  addComment: (issueId: string, content: string) => Promise<void>;
  
  // Filters
  saveFilter: (name: string) => void;
  loadFilter: (filter: SavedFilter) => void;
  deleteFilter: (id: string) => void;
  setActiveFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  
  // Selectors
  getFilteredIssues: () => Issue[];
  getMyIssues: () => Issue[];
  getTriageIssues: () => Issue[];
  getIssueById: (id: string) => Issue | undefined;
  getIssueComments: (issueId: string) => Comment[];
  getIssueActivities: (issueId: string) => Activity[];
  getActiveCycle: () => Cycle | undefined;
  getCycleIssues: (cycleId: string) => Issue[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const defaultFilters: FilterState = {
  statuses: [],
  priorities: [],
  types: [],
  projects: [],
  cycles: [],
  assignees: [],
  hasNoCycle: false,
  hasNoAssignee: false,
};

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: [],
  projects: [],
  features: [],
  teams: [],
  cycles: [],
  comments: [],
  activities: [],
  savedFilters: [],
  customViews: [],
  orgMembers: [],
  notifications: [
    {
      id: '1',
      type: 'assignment',
      issueId: 'issue-1',
      issueTitle: 'Implement real-time collaboration',
      actorName: 'Sarah Chen',
      content: 'assigned you to this issue',
      createdAt: new Date().toISOString(),
      isRead: false,
    },
    {
      id: '2',
      type: 'comment',
      issueId: 'issue-2',
      issueTitle: 'Fix mobile navigation overflow',
      actorName: 'Alex Rivera',
      content: 'left a comment: "I think we should use a drawer here."',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
    }
  ],
  
  isLoading: false,
  error: null,
  
  selectedProjectId: null,
  selectedCycleId: null,
  selectedIssueId: null,
  viewMode: 'list',
  currentView: 'all',
  searchQuery: '',
  activeFilters: defaultFilters,
  currentUser: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [issuesRes, projects, featuresData, teams, members] = await Promise.all([
        issueService.getAll().catch(err => ({ issues: [], total: 0 })),
        projectService.getAll().catch(err => []),
        featureService.getAll().catch(err => []),
        teamService.getAll().catch(err => []),
        userService.getOrganizationMembers().catch(err => [])
      ]);
      
      set({ 
        issues: Array.isArray(issuesRes?.issues) ? issuesRes.issues : [], 
        projects: Array.isArray(projects) ? projects : [],
        features: Array.isArray(featuresData) ? featuresData.map(mapFeature) : [],
        teams: Array.isArray(teams) ? teams : [],
        orgMembers: Array.isArray(members) ? members : [],
        isLoading: false 
      });
    } catch (error) {
      console.error('fetchData error:', error);
      set({ error: 'Failed to fetch some data', isLoading: false });
    }
  },

  fetchIssues: async () => {
    try {
      const response = await issueService.getAll();
      set({ issues: response.issues });
    } catch (error) {
      console.error(error);
    }
  },

  fetchProjects: async () => {
    try {
      const projects = await projectService.getAll();
      set({ projects });
    } catch (error) {
      console.error(error);
    }
  },

  fetchProject: async (projectId) => {
    try {
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to fetch project detail', error);
    }
  },

  fetchFeatures: async () => {
    try {
      const featuresData = await featureService.getAll();
      set({ features: featuresData.map(mapFeature) });
    } catch (error) {
      console.error(error);
    }
  },

  fetchTeams: async () => {
    try {
      const teams = await teamService.getAll();
      set({ teams });
    } catch (error) {
      console.error(error);
    }
  },

  fetchOrgMembers: async () => {
    try {
      const members = await userService.getOrganizationMembers();
      set({ orgMembers: members });
    } catch (error) {
      console.error(error);
    }
  },

  addIssue: async (issueData) => {
    try {
      const newIssue = await issueService.create(issueData);
      set((state) => ({ issues: [newIssue, ...state.issues] }));
    } catch (error) {
      console.error('Failed to create issue', error);
    }
  },

  updateIssue: async (id, updates) => {
    try {
      const updated = await issueService.update(id, updates);
      set((state) => ({
        issues: state.issues.map((i) => i.id === id ? updated : i)
      }));
    } catch (error) {
      console.error('Failed to update issue', error);
    }
  },

  deleteIssue: async (id) => {
    try {
      await issueService.delete(id);
      set((state) => ({
        issues: state.issues.filter((i) => i.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete issue', error);
    }
  },

  addProject: async (projectData) => {
    try {
      const newProject = await projectService.create(projectData as any);
      set((state) => ({ projects: [...state.projects, newProject] }));
    } catch (error) {
      console.error('Failed to create project', error);
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updated = await projectService.update(id, updates as any);
      set((state) => ({
        projects: state.projects.map((p) => p.id === id ? updated : p)
      }));
    } catch (error) {
      console.error('Failed to update project', error);
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      await projectService.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete project', error);
    }
  },

  addProjectUpdate: async (projectId, data) => {
    try {
      await projectService.addUpdate(projectId, data);
      // Re-fetch project to get full update object with author name
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to add project update', error);
      throw error;
    }
  },

  deleteProjectUpdate: async (projectId, updateId) => {
    try {
      await projectService.deleteUpdate(projectId, updateId);
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { ...p, updates: p.updates.filter(u => u.id !== updateId) } 
            : p
        )
      }));
    } catch (error) {
      console.error('Failed to delete project update', error);
    }
  },

  addUpdateComment: async (projectId, updateId, content, parentId) => {
    try {
      await projectService.addUpdateComment(projectId, updateId, content, parentId);
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to add update comment', error);
      throw error;
    }
  },

  deleteUpdateComment: async (projectId, updateId, commentId) => {
    try {
      await projectService.deleteUpdateComment(projectId, updateId, commentId);
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to delete update comment', error);
    }
  },

  toggleUpdateReaction: async (projectId, updateId, emoji) => {
    try {
      await projectService.toggleUpdateReaction(projectId, updateId, emoji);
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to toggle update reaction', error);
    }
  },

  toggleUpdateCommentReaction: async (projectId, updateId, commentId, emoji) => {
    try {
      await projectService.toggleUpdateCommentReaction(projectId, updateId, commentId, emoji);
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to toggle update comment reaction', error);
    }
  },

  addProjectResource: async (projectId, data) => {
    try {
      await projectService.addResource(projectId, data);
      const updatedProject = await projectService.getById(projectId);
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p)
      }));
    } catch (error) {
      console.error('Failed to add project resource', error);
      throw error;
    }
  },

  deleteProjectResource: async (projectId, resourceId) => {
    try {
      await projectService.deleteResource(projectId, resourceId);
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId 
            ? { ...p, resources: p.resources.filter(r => r.id !== resourceId) } 
            : p
        )
      }));
    } catch (error) {
      console.error('Failed to delete project resource', error);
    }
  },


  addTeam: async (teamData) => {
    try {
      const newTeam = await teamService.create(teamData);
      set((state) => ({ teams: [...state.teams, newTeam] }));
    } catch (error) {
      console.error('Failed to create team', error);
      throw error;
    }
  },

  updateTeam: async (id, data) => {
    try {
      const updatedTeam = await teamService.update(id, data);
      set((state) => ({
        teams: state.teams.map(t => t.id === id ? updatedTeam : t)
      }));
    } catch (error) {
      console.error('Failed to update team', error);
      throw error;
    }
  },

  deleteTeam: async (id) => {
    try {
      await teamService.delete(id);
      set((state) => ({
        teams: state.teams.filter(t => t.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete team', error);
      throw error;
    }
  },

  addFeature: async (featureData) => {
    try {
      const newFeature = await featureService.create(featureData);
      set((state) => ({ features: [...state.features, mapFeature(newFeature)] }));
    } catch (error) {
      console.error('Failed to create feature', error);
      throw error;
    }
  },

  updateFeature: async (id, updates) => {
    try {
      const updated = await featureService.update(id, updates);
      set((state) => ({
        features: state.features.map((f) => f.id === id ? mapFeature(updated) : f)
      }));
    } catch (error) {
      console.error('Failed to update feature', error);
    }
  },

  deleteFeature: async (id) => {
    try {
      await featureService.delete(id);
      set((state) => ({
        features: state.features.filter((f) => f.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete feature', error);
    }
  },

  addFeatureMilestone: async (featureId, data) => {
    try {
      const newMilestone = await featureService.createMilestone(featureId, data);
      
      set((state) => ({
        features: state.features.map(f => {
          if (f.id !== featureId) return f;
          return { ...f, milestones: [...(f.milestones || []), newMilestone] };
        })
      }));
    } catch (error) {
      console.error('Failed to add milestone', error);
    }
  },

  updateFeatureMilestone: async (featureId, milestoneId, updates) => {
    try {
      const updated = await featureService.updateMilestone(featureId, milestoneId, updates);
      
      set((state) => ({
        features: state.features.map(f => f.id === featureId 
          ? { ...f, milestones: f.milestones?.map(m => m.id === milestoneId ? mapFeatureMilestone(updated) : m) || [] } 
          : f
        )
      }));
    } catch (error) {
      console.error('Failed to update milestone', error);
    }
  },

  deleteFeatureMilestone: async (featureId, milestoneId) => {
    try {
      await featureService.deleteMilestone(featureId, milestoneId);
      
      set((state) => ({
        features: state.features.map(f => f.id === featureId 
          ? { ...f, milestones: f.milestones?.filter(m => m.id !== milestoneId) || [] } 
          : f
        )
      }));
    } catch (error) {
      console.error('Failed to delete milestone', error);
    }
  },

  toggleFeatureMilestone: async (featureId, milestoneId) => {
    try {
      const feature = get().features.find(f => f.id === featureId);
      if (!feature) return;

      const milestone = feature.milestones?.find(m => m.id === milestoneId);
      if (!milestone) return;

      const updated = await featureService.updateMilestone(featureId, milestoneId, {
        completed: !milestone.completed
      });

      set((state) => ({
        features: state.features.map(f => f.id === featureId 
          ? { 
              ...f, 
              milestones: f.milestones?.map(m => m.id === milestoneId ? updated : m) || [] 
            } 
          : f
        )
      }));
    } catch (error) {
      console.error('Failed to toggle milestone', error);
    }
  },

  toggleProjectFavorite: async (projectId) => {
    try {
      const project = get().projects.find(p => p.id === projectId);
      if (!project) return;
      
      const newFavoriteStatus = !project.isFavorite;
      await projectService.update(projectId, { isFavorite: newFavoriteStatus });
      
      set((state) => ({
        projects: state.projects.map((p) => 
          p.id === projectId ? { ...p, isFavorite: newFavoriteStatus } : p
        )
      }));
    } catch (error) {
      console.error('Failed to toggle project favorite', error);
    }
  },

  setCurrentUser: (userId) => set({ currentUser: userId }),
  setSelectedIssue: async (issueId) => {
    set({ selectedIssueId: issueId });
    if (issueId) {
      try {
        const [comments, activities] = await Promise.all([
          issueService.getComments(issueId),
          issueService.getActivities(issueId)
        ]);
        set({ comments, activities });
      } catch (error) {
        console.error('Failed to fetch issue details', error);
      }
    } else {
      set({ comments: [], activities: [] });
    }
  },
  
  setCurrentView: (view) => {
    const updates: Partial<IssueStore> = { currentView: view };
    if (view !== 'project-detail') {
      updates.selectedProjectId = null;
    }
    set(updates);
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

  // Triage
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

  // Filters
  saveFilter: (name) => {
    // Mock implementation for now as backend doesn't support saving filters yet
    console.log('Save filter not implemented');
  },
  loadFilter: (filter) => set({ activeFilters: { ...filter.filters } }),
  deleteFilter: (id) => {},
  setActiveFilters: (filters) => set((state) => ({ activeFilters: { ...state.activeFilters, ...filters } })),
  clearFilters: () => set({ activeFilters: defaultFilters }),

  // Comments (temporary local state until real API hook is used in components)
  addComment: async (issueId, content) => {
    try {
      const newComment = await issueService.addComment(issueId, content);
      const [comments, activities] = await Promise.all([
        issueService.getComments(issueId),
        issueService.getActivities(issueId)
      ]);
      set({ comments, activities });
    } catch (error) {
      console.error('Failed to add comment', error);
      throw error;
    }
  },

  getFilteredIssues: () => {
    const state = get();
    const { issues, currentUser, activeFilters, searchQuery } = state;
    
    let filtered = issues;

    // View filter
    if (state.currentView === 'my-issues' && currentUser) {
      filtered = filtered.filter(i => i.assignee === currentUser);
    } else if (state.currentView === 'triage') {
      filtered = filtered.filter(i => i.status === 'backlog');
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.identifier.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }

    // Active filters
    if (activeFilters.statuses.length > 0) {
      filtered = filtered.filter(i => activeFilters.statuses.includes(i.status));
    }
    if (activeFilters.priorities.length > 0) {
      filtered = filtered.filter(i => activeFilters.priorities.includes(i.priority));
    }
    if (activeFilters.types.length > 0) {
      filtered = filtered.filter(i => activeFilters.types.includes(i.issueType));
    }
    if (activeFilters.projects.length > 0) {
      // Need to find which issues belong to these projects via features
      const projectFeatures = state.features.filter(f => activeFilters.projects.includes(f.projectId));
      const featureIds = projectFeatures.map(f => f.id);
      filtered = filtered.filter(i => featureIds.includes(i.featureId));
    }
    if (activeFilters.cycles.length > 0) {
      filtered = filtered.filter(i => i.cycleId && activeFilters.cycles.includes(i.cycleId));
    }
    if (activeFilters.hasNoCycle) {
      filtered = filtered.filter(i => !i.cycleId);
    }
    if (activeFilters.hasNoAssignee) {
      filtered = filtered.filter(i => !i.assignee);
    }

    return filtered;
  },

  getMyIssues: () => {
    const state = get();
    return state.issues.filter(i => i.assignee === state.currentUser);
  },

  getTriageIssues: () => get().issues.filter(i => i.status === 'backlog'), // Simplified logic
  getIssueById: (id) => get().issues.find(i => i.id === id),
  
  getIssueComments: (issueId) => {
    return get().comments.filter((c) => c.issueId === issueId);
  },

  getIssueActivities: (issueId) => {
    return get().activities.filter((a) => a.issueId === issueId);
  },

  getActiveCycle: () => {
    return get().cycles.find((c) => c.status === 'active');
  },

  getCycleIssues: (cycleId) => {
    return get().issues.filter((issue) => issue.cycleId === cycleId);
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));