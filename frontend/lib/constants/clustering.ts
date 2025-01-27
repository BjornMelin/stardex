export const CLUSTERING_HELP_TEXT = {
  settings: {
    title: "Clustering Settings",
    description: "Configure how repositories are grouped into clusters.",
    kmeans: {
      title: "K-Means Clusters",
      description:
        "Number of distinct groups to create. More clusters means smaller, more specific groups.",
    },
    hierarchical: {
      title: "Hierarchical Threshold",
      description:
        "How similar repositories must be to form a cluster. Higher values create fewer, broader clusters.",
    },
    pca: {
      title: "PCA Components",
      description:
        "Number of features to use for clustering. More components capture more details but may introduce noise.",
    },
  },
  filters: {
    title: "Filter Settings",
    description:
      "Control which clusters are displayed based on their properties.",
    stars: {
      title: "Star Count Range",
      description:
        "Filter clusters based on the average number of stars their repositories have.",
    },
    languages: {
      title: "Languages & Topics",
      description:
        "Show only clusters containing repositories with specific languages or topics.",
    },
  },
};

export const CLUSTERING_CONFIG = {
  kmeans: {
    min: 2,
    max: 10,
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
    min: 2,
    max: 20,
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

// Default clustering parameters that match backend defaults
export const DEFAULT_CLUSTERING_PARAMS = {
  kmeans_clusters: CLUSTERING_CONFIG.kmeans.default,
  hierarchical_threshold: CLUSTERING_CONFIG.hierarchical.default,
  pca_components: CLUSTERING_CONFIG.pca.default,
};

export const CLUSTERING_ALGORITHMS = {
  kmeans: {
    id: "kmeans",
    name: "K-Means",
    description:
      "Groups repositories into distinct clusters based on feature similarity",
  },
  hierarchical: {
    id: "hierarchical",
    name: "Hierarchical",
    description: "Creates a tree-like structure of repository relationships",
  },
  pca_hierarchical: {
    id: "pca_hierarchical",
    name: "PCA + Hierarchical",
    description: "Reduces features before hierarchical clustering",
  },
} as const;
