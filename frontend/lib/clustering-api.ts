import { z } from "zod";
import { GitHubRepo } from "./github";

const ClusterResultSchema = z.strictObject({
  algorithm: z.string(),
  clusters: z.record(z.string(), z.array(z.number().int().nonnegative())),
  parameters: z.record(z.string(), z.number()),
  processing_time_ms: z.number().nonnegative(),
});

const ClusteringResponseSchema = z.strictObject({
  status: z.enum(["success", "error"]),
  kmeans_clusters: ClusterResultSchema.optional(),
  hierarchical_clusters: ClusterResultSchema.optional(),
  pca_hierarchical_clusters: ClusterResultSchema.optional(),
  error_message: z.string().optional().nullable(),
  total_processing_time_ms: z.number().nonnegative(),
});

export type ClusterResult = z.infer<typeof ClusterResultSchema>;
export type ClusteringResponse = z.infer<typeof ClusteringResponseSchema>;

export interface ClusteringRequest {
  repositories: GitHubRepo[];
  kmeans_clusters: number;
  hierarchical_threshold: number;
  pca_components: number;
}

export class ClusteringApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = "ClusteringApiError";
  }
}

function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:8000";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "http://localhost:8000";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "http://localhost:8000";
  }
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (typeof obj.error_message === "string") {
      return obj.error_message;
    }

    if ("detail" in obj) {
      const detail = obj.detail;
      if (typeof detail === "string") return detail;
      try {
        return JSON.stringify(detail);
      } catch {
        return fallback;
      }
    }
  }

  if (typeof payload === "string" && payload.trim()) return payload;

  return fallback;
}

export async function clusterRepositories(request: ClusteringRequest): Promise<ClusteringResponse> {
  const sanitizedRepos = request.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    size: repo.size,
    watchers_count: repo.watchers_count,
    language: repo.language,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
    },
    updated_at: repo.updated_at,
  }));

  const response = await fetch(`${API_BASE}/clustering`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, repositories: sanitizedRepos }),
  });

  const payload = await readJsonOrText(response);

  if (!response.ok) {
    const message = extractErrorMessage(payload, `Clustering API error (${response.status})`);
    throw new ClusteringApiError(message, response.status, payload);
  }

  const parsed = ClusteringResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ClusteringApiError(
      `Invalid clustering response: ${z.prettifyError(parsed.error)}`,
      response.status,
      payload
    );
  }

  if (parsed.data.status === "error") {
    throw new ClusteringApiError(
      parsed.data.error_message ?? "Unknown clustering error",
      response.status,
      payload
    );
  }

  return parsed.data;
}

// Default clustering configuration
export const defaultClusteringConfig: ClusteringRequest = {
  repositories: [],
  kmeans_clusters: 5,
  hierarchical_threshold: 1.5,
  pca_components: 10,
};

// Algorithm descriptions
export const algorithmDescriptions = {
  kmeans: {
    name: "K-Means Clustering",
    description:
      "Groups repositories into distinct clusters based on feature similarity. Each repository belongs to the cluster with the nearest mean, resulting in partitions that minimize within-cluster distances.",
  },
  hierarchical: {
    name: "Hierarchical Clustering",
    description:
      "Creates a tree-like structure of repository relationships where larger clusters contain smaller, more tightly related groups. The threshold controls how closely related repositories must be to form a cluster.",
  },
  pca_hierarchical: {
    name: "PCA + Hierarchical",
    description:
      "First reduces repository features to principal components that capture the most important patterns, then performs hierarchical clustering. This can reveal underlying structures that might be hidden in the raw features.",
  },
};

// Health check function
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) return false;
    const data = await readJsonOrText(response);
    return Boolean(
      data && typeof data === "object" && "status" in data && data.status === "healthy"
    );
  } catch {
    return false;
  }
}
