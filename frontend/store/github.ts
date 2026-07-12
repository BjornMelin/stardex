import { create } from "zustand";
import type { GitHubRepo } from "../lib/github";
import type { FilterCriteria } from "../lib/types/repository-filters";

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
  shouldFetchRepos: boolean;
  setShouldFetchRepos: (value: boolean) => void;
  pagination: {
    currentPage: number;
    itemsPerPage: number;
  };
  setCurrentPage: (page: number) => void;
  getSelectedRepos: () => GitHubRepo[];
  getFilteredAndSortedRepos: () => GitHubRepo[];
  getCurrentPageRepos: () => GitHubRepo[];
}

/** Stores selected repositories and resets pagination when source or filter state changes. */
export const useGitHubStore = create<GitHubStore>((set, get) => ({
  selectedUsers: [],
  addUser: (username) =>
    set((state) =>
      state.selectedUsers.includes(username)
        ? state
        : {
            selectedUsers: [...state.selectedUsers, username],
            pagination: { ...state.pagination, currentPage: 1 },
          }
    ),
  removeUser: (username) =>
    set((state) => ({
      selectedUsers: state.selectedUsers.filter((u) => u !== username),
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  clearUsers: () =>
    set((state) => ({
      selectedUsers: [],
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  repos: {},
  setRepos: (username, repos) =>
    set((state) => ({
      repos: {
        ...state.repos,
        [username]: repos,
      },
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  clearRepos: () =>
    set((state) => ({
      repos: {},
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  filters: {
    search: "",
    language: null,
    minStars: 0,
    topics: [],
    sortBy: "stars",
  },
  setFilters: (filters) =>
    set((state) => ({
      filters,
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  shouldFetchRepos: false,
  setShouldFetchRepos: (value) => set({ shouldFetchRepos: value }),
  pagination: {
    currentPage: 1,
    itemsPerPage: 30,
  },
  setCurrentPage: (page) =>
    set((state) => ({
      pagination: { ...state.pagination, currentPage: Math.max(1, page) },
    })),
  getSelectedRepos: () => {
    const state = get();
    const repositoriesById = new Map<number, GitHubRepo>();

    for (const username of state.selectedUsers) {
      for (const repository of state.repos[username] ?? []) {
        if (!repositoriesById.has(repository.id)) {
          repositoriesById.set(repository.id, repository);
        }
      }
    }

    return Array.from(repositoriesById.values());
  },
  getFilteredAndSortedRepos: () => {
    const state = get();
    let allRepos = state.getSelectedRepos();

    // Apply filters
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      allRepos = allRepos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchLower) ||
          repo.description?.toLowerCase().includes(searchLower) ||
          repo.topics.some((topic) => topic.toLowerCase().includes(searchLower))
      );
    }

    if (state.filters.language) {
      allRepos = allRepos.filter((repo) => repo.language === state.filters.language);
    }

    if (state.filters.minStars > 0) {
      allRepos = allRepos.filter((repo) => repo.stargazers_count >= state.filters.minStars);
    }

    if (state.filters.topics.length > 0) {
      allRepos = allRepos.filter((repo) =>
        state.filters.topics.every((topic) => repo.topics.includes(topic))
      );
    }

    // Apply sorting
    switch (state.filters.sortBy) {
      case "stars":
        allRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
        break;
      case "updated":
        allRepos.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        break;
      case "name":
        allRepos.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return allRepos;
  },
  getCurrentPageRepos: () => {
    const state = get();
    const { currentPage, itemsPerPage } = state.pagination;
    const allRepos = get().getFilteredAndSortedRepos();

    const startIndex = (currentPage - 1) * itemsPerPage;
    return allRepos.slice(startIndex, startIndex + itemsPerPage);
  },
}));
