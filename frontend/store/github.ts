import { create } from 'zustand';
import { GitHubRepo } from '../lib/github';

interface GitHubStore {
  repositories: GitHubRepo[];
  setRepositories: (repos: GitHubRepo[]) => void;
}

export const useGitHubStore = create<GitHubStore>((set) => ({
  repositories: [],
  setRepositories: (repos) => set({ repositories: repos }),
}));