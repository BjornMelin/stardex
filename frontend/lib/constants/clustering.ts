/** Algorithm identifiers accepted by the clustering API. */
export const CLUSTERING_ALGORITHM_IDS = ["kmeans", "hierarchical", "pca_hierarchical"] as const;

/** Maximum repository count accepted by the clustering API. */
export const MAX_CLUSTERING_REPOSITORIES = 1_000;

/** Supported clustering algorithm identifier. */
export type ClusteringAlgorithm = (typeof CLUSTERING_ALGORITHM_IDS)[number];

/** User-facing guidance for clustering controls and filters. */
export const CLUSTERING_HELP_TEXT = {
  settings: {
    title: "Clustering Settings",
    description: "Configure how repositories are grouped into clusters.",
    kmeans: {
      title: "K-Means Clusters",
      description:
        "Maximum number of groups to create. The backend uses fewer when the repository set is smaller.",
    },
    hierarchical: {
      title: "Hierarchical Threshold",
      description:
        "How similar repositories must be to form a cluster. Higher values create fewer, broader clusters.",
    },
    pca: {
      title: "PCA Components",
      description:
        "Maximum number of features to use. The backend also limits this to the available repositories and text features.",
    },
  },
  filters: {
    title: "Filter Settings",
    description: "Control which clusters are displayed based on their properties.",
    stars: {
      title: "Star Count Range",
      description: "Filter clusters based on the average number of stars their repositories have.",
    },
    languages: {
      title: "Languages & Topics",
      description: "Show only clusters containing repositories with specific languages or topics.",
    },
  },
};

/** Numeric bounds and defaults shared by clustering controls. */
export const CLUSTERING_CONFIG = {
  kmeans: {
    min: 1,
    max: 20,
    step: 1,
    default: 5,
  },
  hierarchical: {
    min: 0.5,
    max: 3.0,
    step: 0.1,
    default: 1.5,
  },
  pca: {
    min: 1,
    max: 50,
    step: 1,
    default: 10,
  },
  filters: {
    minStars: 0,
    maxStars: 1000000,
    minClusterSize: 1,
    maxLanguages: 10,
    maxTopics: 10,
  },
};

/** Default clustering parameters aligned with backend defaults. */
export const DEFAULT_CLUSTERING_PARAMS = {
  kmeans_clusters: CLUSTERING_CONFIG.kmeans.default,
  hierarchical_threshold: CLUSTERING_CONFIG.hierarchical.default,
  pca_components: CLUSTERING_CONFIG.pca.default,
};

/** Labels and descriptions for every supported clustering algorithm. */
export const CLUSTERING_ALGORITHMS = {
  kmeans: {
    name: "K-Means",
    title: "K-Means Clustering",
    description:
      "Groups repositories into distinct clusters based on feature similarity. Each repository belongs to the cluster with the nearest mean, resulting in partitions that minimize within-cluster distances.",
  },
  hierarchical: {
    name: "Hierarchical",
    title: "Hierarchical Clustering",
    description:
      "Groups repositories with Ward linkage. The distance threshold controls how closely related repositories must be to remain in the same flat result group.",
  },
  pca_hierarchical: {
    name: "PCA + Hierarchical",
    title: "PCA + Hierarchical",
    description:
      "First reduces repository features to principal components that capture the most important patterns, then performs hierarchical clustering. This can reveal underlying structures that might be hidden in the raw features.",
  },
} as const satisfies Record<
  ClusteringAlgorithm,
  { name: string; title: string; description: string }
>;

/**
 * Derives repository-aware upper bounds for clustering parameters.
 *
 * @param repositoryCount - Number of repositories in the request.
 * @returns Minimum and effective maximum values for K-means and PCA controls.
 */
export function getClusteringParameterBounds(repositoryCount: number) {
  const count = Math.max(repositoryCount, 1);

  return {
    kmeans: {
      min: CLUSTERING_CONFIG.kmeans.min,
      max: Math.min(count, CLUSTERING_CONFIG.kmeans.max),
    },
    pca: {
      min: CLUSTERING_CONFIG.pca.min,
      max: Math.min(count, CLUSTERING_CONFIG.pca.max),
    },
  };
}

/**
 * Clamps clustering settings to API and repository-count bounds.
 *
 * @param settings - Candidate clustering settings.
 * @param repositoryCount - Number of repositories in the request.
 * @returns The settings with every numeric value inside its effective bounds.
 */
export function clampClusteringParams<
  T extends {
    kmeans_clusters: number;
    hierarchical_threshold: number;
    pca_components: number;
  },
>(settings: T, repositoryCount: number) {
  const bounds = getClusteringParameterBounds(repositoryCount);

  return {
    ...settings,
    kmeans_clusters: Math.min(
      Math.max(settings.kmeans_clusters, bounds.kmeans.min),
      bounds.kmeans.max
    ),
    hierarchical_threshold: Math.min(
      Math.max(settings.hierarchical_threshold, CLUSTERING_CONFIG.hierarchical.min),
      CLUSTERING_CONFIG.hierarchical.max
    ),
    pca_components: Math.min(Math.max(settings.pca_components, bounds.pca.min), bounds.pca.max),
  };
}
