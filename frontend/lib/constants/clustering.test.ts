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
});
