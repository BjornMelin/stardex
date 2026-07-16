import type { ClusteringRequest, ClusterResult } from "@/lib/clustering-api";
import type { ClusteringAlgorithm } from "@/lib/constants/clustering";
import type { GitHubRepo } from "@/lib/github";

/** Properties required to render an interactive clustering result. */
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

/** Repository group and display metadata derived from a clustering result. */
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

/** Optional display filters applied to derived cluster groups. */
export interface ClusterFilters {
  minStars?: number;
  maxStars?: number;
  languages?: string[];
  topics?: string[];
  minClusterSize?: number;
}

/** Adjustable clustering request parameters without repository payloads. */
export type ClusterParameterSettings = Omit<ClusteringRequest, "repositories">;

/** Properties required by the clustering settings sidebar. */
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
