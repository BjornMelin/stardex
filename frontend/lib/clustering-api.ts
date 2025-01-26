import { GitHubRepo } from "./github";

export interface ClusteredRepo {
  repo: GitHubRepo;
  cluster_id: number;
  coordinates: [number, number];
}

export interface Cluster {
  id: number;
  label?: string;
  repositories: GitHubRepo[];
  coordinates?: [number, number];
}

export interface ClusteringRequest {
  repositories: GitHubRepo[];
  clustering_algorithm?: "kmeans" | "dbscan" | "hierarchical";
  algorithm_parameters?: {
    [key: string]: number | string;
  };
  features_to_use?: Array<"description" | "topics" | "language" | "metrics">;
}

export interface ClusteringResponse {
  status: "success" | "error";
  clusters?: Cluster[];
  processing_time_ms?: number;
  error_message?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function clusterRepositories(
  request: ClusteringRequest
): Promise<ClusteringResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/clusters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Clustering API error: ${response.statusText}`);
    }

    const result: ClusteringResponse = await response.json();
    
    if (result.status === "error") {
      throw new Error(result.error_message || "Unknown clustering error");
    }
    
    return result;
  } catch (error) {
    console.error("Error clustering repositories:", error);
    return {
      status: "error",
      error_message: error instanceof Error ? error.message : "Failed to cluster repositories"
    };
  }
}

// Default clustering configuration
export const defaultClusteringConfig: Partial<ClusteringRequest> = {
  clustering_algorithm: "kmeans",
  algorithm_parameters: {
    n_clusters: 5
  },
  features_to_use: ["description", "topics", "language", "metrics"]
};

// Algorithm parameter configurations
export const algorithmConfigs = {
  kmeans: {
    name: "K-Means Clustering",
    parameters: {
      n_clusters: {
        type: "number",
        default: 5,
        min: 2,
        max: 20,
        label: "Number of Clusters"
      }
    }
  },
  dbscan: {
    name: "DBSCAN Clustering",
    parameters: {
      eps: {
        type: "number",
        default: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        label: "Maximum Distance Between Samples"
      },
      min_samples: {
        type: "number",
        default: 5,
        min: 2,
        max: 20,
        label: "Minimum Samples per Cluster"
      }
    }
  },
  hierarchical: {
    name: "Hierarchical Clustering",
    parameters: {
      n_clusters: {
        type: "number",
        default: 5,
        min: 2,
        max: 20,
        label: "Number of Clusters"
      }
    }
  }
};

// Available features for clustering
export const availableFeatures = [
  { id: "description", label: "Repository Description" },
  { id: "topics", label: "Repository Topics" },
  { id: "language", label: "Programming Language" },
  { id: "metrics", label: "Repository Metrics" }
] as const;

// Health check function for the backend service
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    return data.status === "healthy";
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
}
