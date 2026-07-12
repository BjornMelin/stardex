import type { ClusteringRequest, ClusterResult } from "@/lib/clustering-api";
import type { ClusteringAlgorithm } from "@/lib/constants/clustering";
import type { GitHubRepo } from "@/lib/github";

export interface ClusterViewProps {
  result: ClusterResult;
  repositories: GitHubRepo[];
  algorithm: ClusteringAlgorithm;
  availableAlgorithms: readonly ClusteringAlgorithm[];
  currentSettings: ClusterParameterSettings;
  currentFilters: ClusterFilters;
  onSettingsChange: (settings: ClusterParameterSettings) => void;
  onFiltersChange: (filters: ClusterFilters) => void;
}

export interface ClusterData {
  id: number;
  repositories: GitHubRepo[];
  metadata: {
    avgStars: number;
    languages: string[];
    size: number;
    name: string;
  };
}

export interface ClusterFilters {
  minStars?: number;
  maxStars?: number;
  languages?: string[];
  topics?: string[];
  minClusterSize?: number;
}

export type ClusterParameterSettings = Omit<ClusteringRequest, "repositories">;

export interface ClusterSettingsProps {
  settings: ClusterParameterSettings;
  onSettingsChange: (settings: ClusterParameterSettings) => void;
  repositoryCount: number;
  availableAlgorithms: readonly ClusteringAlgorithm[];
  filters?: ClusterFilters;
  onFiltersChange: (filters: ClusterFilters) => void;
  availableLanguages?: string[];
  availableTopics?: string[];
}
