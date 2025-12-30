import { ClusterResult } from "../clustering-api";
import { GitHubRepo } from "../github";
import { ClusterData, ClusterFilters } from "../types/clustering";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
  const parsedId = Number.parseInt(id, 10);
  return `Mixed Projects ${Number.isFinite(parsedId) ? parsedId + 1 : id}`;
}

export function computeClusterData(
  result: ClusterResult,
  repositories: GitHubRepo[]
): ClusterData[] {
  return Object.entries(result.clusters).map(([id, indices]) => {
    const parsedId = Number.parseInt(id, 10);
    const numericId = Number.isFinite(parsedId) ? parsedId : 0;

    const repos = indices
      .map((idx) => repositories[idx])
      .filter((repo): repo is GitHubRepo => Boolean(repo));

    const languages = new Set(repos.map((r) => r.language).filter(isNonEmptyString));
    const topics = new Set(repos.flatMap((r) => r.topics));
    const topLanguages = Array.from(languages).slice(0, 2);
    const topTopics = Array.from(topics).slice(0, 2);

    return {
      id: numericId,
      repositories: repos,
      metadata: {
        avgStars: repos.length
          ? repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / repos.length
          : 0,
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
  const search = searchQuery.trim().toLowerCase();
  return clusters.filter((cluster) => {
    // Text search filter
    const matchesSearch =
      search.length === 0 ||
      cluster.metadata.name.toLowerCase().includes(search) ||
      cluster.metadata.languages.some((lang) => lang.toLowerCase().includes(search));

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
      if (!cluster.metadata.languages.some((lang) => filters.languages?.includes(lang)))
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

export function getClusterSimilarity(cluster1: ClusterData, cluster2: ClusterData): number {
  const langs1 = new Set(cluster1.repositories.map((r) => r.language).filter(isNonEmptyString));
  const langs2 = new Set(cluster2.repositories.map((r) => r.language).filter(isNonEmptyString));
  const langs1Array = Array.from(langs1);
  const commonLangs = new Set(langs1Array.filter((x) => langs2.has(x)));
  return commonLangs.size / Math.max(langs1.size, langs2.size, 1);
}

export function extractUniqueMeta(repositories: GitHubRepo[]): {
  languages: string[];
  topics: string[];
} {
  const languages = Array.from(
    new Set(repositories.map((repo) => repo.language).filter(isNonEmptyString))
  );

  const topics = Array.from(new Set(repositories.flatMap((repo) => repo.topics)));

  return { languages, topics };
}
