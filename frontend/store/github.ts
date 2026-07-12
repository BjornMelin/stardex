import { create } from "zustand";
import type { GitHubRepo } from "../lib/github";
import type { FilterCriteria } from "../lib/types/repository-filters";

interface GitHubStore {
  selectedUsers: string[];
  addUser: (username: string) => void;
  removeUser: (username: string) => void;
  clearUsers: () => void;
  repos: Record<string, GitHubRepo[]>;
  setRepos: (repos: Record<string, GitHubRepo[]>) => void;
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

function selectRepositories(
  selectedUsers: string[],
  repos: Record<string, GitHubRepo[]>
): GitHubRepo[] {
  const repositoriesById = new Map<number, GitHubRepo>();

  for (const username of selectedUsers) {
    for (const repository of repos[username] ?? []) {
      if (!repositoriesById.has(repository.id)) {
        repositoriesById.set(repository.id, repository);
      }
    }
  }

  return Array.from(repositoriesById.values());
}

function reconcileFilters(filters: FilterCriteria, repositories: GitHubRepo[]): FilterCriteria {
  const languages = new Set(
    repositories
      .map((repository) => repository.language)
      .filter((language): language is string => language !== null)
  );
  const topics = new Set(repositories.flatMap((repository) => repository.topics));
  const maxStars = repositories.reduce(
    (highest, repository) => Math.max(highest, repository.stargazers_count),
    0
  );

  return {
    ...filters,
    language: filters.language && languages.has(filters.language) ? filters.language : null,
    minStars: Math.min(filters.minStars, maxStars),
    topics: filters.topics.filter((topic) => topics.has(topic)),
  };
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
    set((state) => {
      const selectedUsers = state.selectedUsers.filter((user) => user !== username);
      return {
        selectedUsers,
        filters: reconcileFilters(state.filters, selectRepositories(selectedUsers, state.repos)),
        pagination: { ...state.pagination, currentPage: 1 },
      };
    }),
  clearUsers: () =>
    set((state) => ({
      selectedUsers: [],
      filters: reconcileFilters(state.filters, []),
      pagination: { ...state.pagination, currentPage: 1 },
    })),
  repos: {},
  setRepos: (repos) =>
    set((state) => {
      return {
        repos,
        filters: reconcileFilters(state.filters, selectRepositories(state.selectedUsers, repos)),
        pagination: { ...state.pagination, currentPage: 1 },
      };
    }),
  clearRepos: () =>
    set((state) => ({
      repos: {},
      filters: reconcileFilters(state.filters, []),
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
    return selectRepositories(state.selectedUsers, state.repos);
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
