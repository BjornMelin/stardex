import { describe, expect, it } from "vitest";
import {
  clampClusteringParams,
  DEFAULT_CLUSTERING_PARAMS,
  getClusteringParameterBounds,
} from "./clustering";

describe("clustering parameter bounds", () => {
  it.each([
    { repositoryCount: 1, kmeansMax: 1, pcaMax: 1 },
    { repositoryCount: 2, kmeansMax: 2, pcaMax: 2 },
    { repositoryCount: 9, kmeansMax: 9, pcaMax: 9 },
    { repositoryCount: 10, kmeansMax: 10, pcaMax: 10 },
    { repositoryCount: 20, kmeansMax: 20, pcaMax: 20 },
    { repositoryCount: 50, kmeansMax: 20, pcaMax: 50 },
    { repositoryCount: 250, kmeansMax: 20, pcaMax: 50 },
    { repositoryCount: 251, kmeansMax: 20, pcaMax: 50 },
  ])("caps maxima for $repositoryCount repositories", ({ repositoryCount, kmeansMax, pcaMax }) => {
    expect(getClusteringParameterBounds(repositoryCount)).toEqual({
      kmeans: { min: 1, max: kmeansMax },
      pca: { min: 1, max: pcaMax },
    });
  });

  it("clamps singleton requests without changing the threshold", () => {
    expect(clampClusteringParams(DEFAULT_CLUSTERING_PARAMS, 1)).toEqual({
      kmeans_clusters: 1,
      hierarchical_threshold: DEFAULT_CLUSTERING_PARAMS.hierarchical_threshold,
      pca_components: 1,
    });
  });

  it.each([
    {
      label: "K-means lower bound",
      input: { kmeans_clusters: 0, hierarchical_threshold: 1.5, pca_components: 5 },
      expected: { kmeans_clusters: 1, hierarchical_threshold: 1.5, pca_components: 5 },
    },
    {
      label: "K-means upper bound",
      input: { kmeans_clusters: 21, hierarchical_threshold: 1.5, pca_components: 5 },
      expected: { kmeans_clusters: 10, hierarchical_threshold: 1.5, pca_components: 5 },
    },
    {
      label: "threshold lower bound",
      input: { kmeans_clusters: 5, hierarchical_threshold: 0, pca_components: 5 },
      expected: { kmeans_clusters: 5, hierarchical_threshold: 0.5, pca_components: 5 },
    },
    {
      label: "threshold upper bound",
      input: { kmeans_clusters: 5, hierarchical_threshold: 4, pca_components: 5 },
      expected: { kmeans_clusters: 5, hierarchical_threshold: 3, pca_components: 5 },
    },
    {
      label: "PCA lower bound",
      input: { kmeans_clusters: 5, hierarchical_threshold: 1.5, pca_components: 0 },
      expected: { kmeans_clusters: 5, hierarchical_threshold: 1.5, pca_components: 1 },
    },
    {
      label: "PCA upper bound",
      input: { kmeans_clusters: 5, hierarchical_threshold: 1.5, pca_components: 51 },
      expected: { kmeans_clusters: 5, hierarchical_threshold: 1.5, pca_components: 10 },
    },
  ])("clamps the $label independently", ({ input, expected }) => {
    expect(clampClusteringParams(input, 10)).toEqual(expected);
  });
});
