import { z } from "zod";
import { CLUSTERING_ALGORITHM_IDS } from "./constants/clustering";
import type { GitHubRepo } from "./github";

const ClusterResultSchema = z.strictObject({
  algorithm: z.enum(CLUSTERING_ALGORITHM_IDS),
  clusters: z.record(z.string(), z.array(z.number().int().nonnegative())),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
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
