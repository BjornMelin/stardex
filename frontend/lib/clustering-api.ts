import { GitHubRepo } from "./github";

export interface ClusterResult {
  algorithm: string;
  clusters: { [key: number]: number[] };
  parameters: { [key: string]: number };
  processing_time_ms: number;
}

export interface ClusteringResponse {
  status: string;
  kmeans_clusters?: ClusterResult;
  hierarchical_clusters?: ClusterResult;
  pca_hierarchical_clusters?: ClusterResult;
  error_message?: string;
  total_processing_time_ms: number;
}

export interface ClusteringRequest {
  repositories: GitHubRepo[];
  kmeans_clusters: number;
  hierarchical_threshold: number;
  pca_components: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function clusterRepositories(
  request: ClusteringRequest
): Promise<ClusteringResponse> {
  try {
    const response = await fetch(`${API_BASE}/clustering`, {
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
      error_message: error instanceof Error ? error.message : "Failed to cluster repositories",
      total_processing_time_ms: 0
    };
  }
}

// Default clustering configuration
export const defaultClusteringConfig: ClusteringRequest = {
  repositories: [],
  kmeans_clusters: 5,
  hierarchical_threshold: 1.5,
  pca_components: 10
};

// Algorithm descriptions
export const algorithmDescriptions = {
  kmeans: {
    name: "K-Means Clustering",
    description: "Groups repositories into distinct clusters based on similarity"
  },
  hierarchical: {
    name: "Hierarchical Clustering",
    description: "Creates a tree-like structure of repository relationships"
  },
  pca_hierarchical: {
    name: "PCA + Hierarchical",
    description: "Reduces complexity before clustering for better results"
  }
};

// Health check function
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
