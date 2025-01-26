import { create } from 'zustand';
import { GitHubRepo } from '../lib/github';
import type { FilterCriteria } from '../components/repository/repository-filters';

interface GitHubStore {
  selectedUsers: string[];
  addUser: (username: string) => void;
  removeUser: (username: string) => void;
  clearUsers: () => void;
  repos: Record<string, GitHubRepo[]>;
  setRepos: (username: string, repos: GitHubRepo[]) => void;
  clearRepos: () => void;
  filters: FilterCriteria;
  setFilters: (filters: FilterCriteria) => void;
}

export const useGitHubStore = create<GitHubStore>((set) => ({
  selectedUsers: [],
  addUser: (username) =>
    set((state) => ({
      selectedUsers: state.selectedUsers.includes(username) 
        ? state.selectedUsers 
        : [...state.selectedUsers, username],
    })),
  removeUser: (username) =>
    set((state) => ({
      selectedUsers: state.selectedUsers.filter((u) => u !== username),
    })),
  clearUsers: () => set({ selectedUsers: [] }),
  repos: {},
  setRepos: (username, repos) =>
    set((state) => ({
      repos: { ...state.repos, [username]: repos },
    })),
  clearRepos: () => set({ repos: {} }),
  filters: {
    search: '',
    language: '',
    minStars: 0,
    topics: [],
    sortBy: 'stars',
  },
  setFilters: (filters) => set({ filters }),
}));