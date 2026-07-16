import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClusteringResponse } from "@/lib/clustering-api";
import { MAX_CLUSTERING_REPOSITORIES } from "@/lib/constants/clustering";
import type { GitHubRepo } from "@/lib/github";
import { RepositoryClusters } from "./repository-clusters";

const { queryOptions, queryState } = vi.hoisted(() => ({
  queryOptions: {
    current: null as { enabled?: boolean; queryKey?: readonly unknown[] } | null,
  },
  queryState: {
    data: undefined as unknown,
    isLoading: false,
    error: null as Error | null,
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: { enabled?: boolean; queryKey?: readonly unknown[] }) => {
      queryOptions.current = options;
      return queryState;
    },
  };
});

vi.mock("../cluster-view/cluster-view", () => ({
  ClusterView: ({ algorithm }: { algorithm: string }) => <div>{algorithm} view</div>,
}));

const repositories: GitHubRepo[] = [1, 2].map((id) => ({
  id,
  name: `repo-${id}`,
  full_name: `example/repo-${id}`,
  description: `Repository ${id}`,
  html_url: `https://github.com/example/repo-${id}`,
  stargazers_count: id,
  forks_count: 0,
  open_issues_count: 0,
  size: 1,
  watchers_count: id,
  language: "TypeScript",
  topics: [],
  owner: { login: "example", avatar_url: "https://example.com/avatar.png" },
  updated_at: "2026-07-12T00:00:00Z",
}));

const clusterResult = (algorithm: "kmeans" | "hierarchical" | "pca_hierarchical") => ({
  algorithm,
  clusters: { 0: [0, 1] },
  parameters: {},
  processing_time_ms: 1,
});

const allResults: ClusteringResponse = {
  status: "success",
  kmeans_clusters: clusterResult("kmeans"),
  hierarchical_clusters: clusterResult("hierarchical"),
  pca_hierarchical_clusters: clusterResult("pca_hierarchical"),
  total_processing_time_ms: 3,
};

const kmeansOnly: ClusteringResponse = {
  status: "success",
  kmeans_clusters: clusterResult("kmeans"),
  total_processing_time_ms: 1,
};

beforeEach(() => {
  queryOptions.current = null;
  queryState.data = allResults;
  queryState.isLoading = false;
  queryState.error = null;
});

afterEach(cleanup);

describe("RepositoryClusters", () => {
  it("falls back to an available tab without an effect or remount", () => {
    const { rerender } = render(<RepositoryClusters repositories={repositories} />);
    const kmeansTab = screen.getByRole("tab", { name: "K-Means" });

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Hierarchical" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("tab", { name: "Hierarchical" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    queryState.data = kmeansOnly;
    rerender(<RepositoryClusters repositories={repositories} />);

    expect(screen.queryByRole("tab", { name: "Hierarchical" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "K-Means" })).toBe(kmeansTab);
    expect(kmeansTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("kmeans view")).toBeInTheDocument();

    queryState.data = allResults;
    rerender(<RepositoryClusters repositories={repositories} />);

    expect(screen.getByRole("tab", { name: "Hierarchical" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("does not query an empty repository set", () => {
    queryState.data = undefined;

    render(<RepositoryClusters repositories={[]} />);

    expect(queryOptions.current?.enabled).toBe(false);
    expect(screen.getByText(/No clustering results available/)).toBeInTheDocument();
  });

  it("does not query repository sets above the API limit", () => {
    const oversizedRepositories = Array.from(
      { length: MAX_CLUSTERING_REPOSITORIES + 1 },
      (_, index) => ({
        ...repositories[0],
        id: index + 1,
        name: `repo-${index + 1}`,
        full_name: `example/repo-${index + 1}`,
      })
    );

    render(<RepositoryClusters repositories={oversizedRepositories} />);

    expect(queryOptions.current?.enabled).toBe(false);
    expect(screen.getByText(/Clustering supports up to 1,000 repositories/)).toBeInTheDocument();
    expect(screen.getByText(/Narrow the active filters/)).toBeInTheDocument();
  });

  it("invalidates clustering when repository request input changes", () => {
    const { rerender } = render(<RepositoryClusters repositories={repositories} />);
    const initialKey = queryOptions.current?.queryKey;
    const updatedRepositories = repositories.map((repository, index) =>
      index === 0 ? { ...repository, topics: ["updated-topic"] } : repository
    );

    rerender(<RepositoryClusters repositories={updatedRepositories} />);

    expect(updatedRepositories.map(({ id }) => id)).toEqual(repositories.map(({ id }) => id));
    expect(queryOptions.current?.queryKey).not.toEqual(initialKey);
  });
});
