import { GitHubRepo } from "@/lib/github";
import { ClusterResult } from "@/lib/clustering-api";

export interface ClusterViewProps {
  result: ClusterResult;
  repositories: GitHubRepo[];
  algorithm: string;
  currentSettings: ClusterParameterSettings;
  currentFilters: ClusterFilters;
  onSettingsChange?: (settings: ClusterParameterSettings) => void;
  onFiltersChange?: (filters: ClusterFilters) => void;
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

export interface ClusterParameterSettings {
  kmeans_clusters: number;
  hierarchical_threshold: number;
  pca_components: number;
}

export interface ClusterSettingsProps {
  settings: ClusterParameterSettings;
  onSettingsChange: (settings: ClusterParameterSettings) => void;
  filters?: ClusterFilters;
  onFiltersChange?: (filters: ClusterFilters) => void;
  availableLanguages?: string[];
  availableTopics?: string[];
}
