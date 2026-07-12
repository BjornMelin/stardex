import { afterEach, describe, expect, it, vi } from "vitest";
import { clusterRepositories } from "./clustering-api";
import type { GitHubRepo } from "./github";

const repository: GitHubRepo = {
  id: 1,
  name: "stardex",
  full_name: "example/stardex",
  description: "Repository discovery",
  html_url: "https://github.com/example/stardex",
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 0,
  size: 1,
  watchers_count: 1,
  language: "TypeScript",
  topics: [],
  owner: {
    login: "example",
    avatar_url: "https://example.com/avatar.png",
  },
  updated_at: "2026-07-12T00:00:00Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("clusterRepositories", () => {
  it("parses a successful K-means-only response with unavailable results omitted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: "success",
              kmeans_clusters: {
                algorithm: "kmeans",
                clusters: { 0: [0] },
                parameters: { num_clusters: 1 },
                processing_time_ms: 1,
              },
              total_processing_time_ms: 1,
            }),
            { status: 200 }
          )
      )
    );

    const result = await clusterRepositories({
      repositories: [repository],
      kmeans_clusters: 1,
      hierarchical_threshold: 1.5,
      pca_components: 1,
    });

    expect(result.kmeans_clusters?.parameters.num_clusters).toBe(1);
    expect(result.hierarchical_clusters).toBeUndefined();
    expect(result.pca_hierarchical_clusters).toBeUndefined();
  });
});
