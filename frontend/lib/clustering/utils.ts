import { ClusterResult } from "../clustering-api";
import { GitHubRepo } from "../github";
import { ClusterData, ClusterFilters } from "../types/clustering";

/**
 * Generates a descriptive name for a cluster based on its top languages and topics
 */
export function generateClusterName(
  topLanguages: string[],
  topTopics: string[],
  id: string
): string {
  if (topLanguages.length > 0 && topTopics.length > 0) {
    return `${topLanguages.join("/")} ${topTopics.join("/")}`;
  } else if (topLanguages.length > 0) {
    return `${topLanguages.join("/")} Projects`;
  } else if (topTopics.length > 0) {
    return `${topTopics.join("/")} Group`;
  }
  return `Mixed Projects ${parseInt(id) + 1}`;
}

export function computeClusterData(
  result: ClusterResult,
  repositories: GitHubRepo[]
): ClusterData[] {
  return Object.entries(result.clusters).map(([id, indices]) => {
    const repos = indices.map((idx) => repositories[idx]);
    const languages = new Set(
      repos.filter((r) => r.language).map((r) => r.language as string)
    );
    const topics = new Set(repos.flatMap((r) => r.topics));
    const topLanguages = Array.from(languages).slice(0, 2);
    const topTopics = Array.from(topics).slice(0, 2);

    return {
      id: parseInt(id),
      repositories: repos,
      metadata: {
        avgStars:
          repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) /
          repos.length,
        languages: Array.from(languages),
        size: repos.length,
        name: generateClusterName(topLanguages, topTopics, id),
      },
    };
  });
}

export function filterClusters(
  clusters: ClusterData[],
  searchQuery: string,
  filters: ClusterFilters
): ClusterData[] {
  return clusters.filter((cluster) => {
    // Text search filter
    const matchesSearch =
      cluster.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cluster.metadata.languages.some((lang) =>
        lang?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!matchesSearch) return false;

    // Star count filter
    if (filters.minStars !== undefined) {
      if (cluster.metadata.avgStars < filters.minStars) return false;
    }
    if (filters.maxStars !== undefined) {
      if (cluster.metadata.avgStars > filters.maxStars) return false;
    }

    // Cluster size filter
    if (filters.minClusterSize !== undefined) {
      if (cluster.metadata.size < filters.minClusterSize) return false;
    }

    // Language filter
    if (filters.languages?.length) {
      if (
        !cluster.metadata.languages.some((lang) =>
          filters.languages?.includes(lang)
        )
      )
        return false;
    }

    // Topics filter
    if (filters.topics?.length) {
      if (
        !cluster.repositories.some((repo) =>
          repo.topics.some((topic) => filters.topics?.includes(topic))
        )
      )
        return false;
    }

    return true;
  });
}

export function getClusterSimilarity(
  cluster1: ClusterData,
  cluster2: ClusterData
): number {
  const langs1 = new Set(
    cluster1.repositories.map((r) => r.language).filter(Boolean)
  );
  const langs2 = new Set(
    cluster2.repositories.map((r) => r.language).filter(Boolean)
  );
  const langs1Array = Array.from(langs1);
  const commonLangs = new Set(langs1Array.filter((x) => langs2.has(x)));
  return commonLangs.size / Math.max(langs1.size, langs2.size);
}

export function extractUniqueMeta(repositories: GitHubRepo[]) {
  const languages = Array.from(
    new Set(repositories.map((repo) => repo.language).filter(Boolean))
  ) as string[];

  const topics = Array.from(
    new Set(repositories.flatMap((repo) => repo.topics))
  );

  return { languages, topics };
}
