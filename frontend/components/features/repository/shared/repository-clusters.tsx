"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clusterRepositories } from "@/lib/clustering-api";
import type { ClusteringAlgorithm } from "@/lib/constants/clustering";
import {
  CLUSTERING_ALGORITHMS,
  clampClusteringParams,
  DEFAULT_CLUSTERING_PARAMS,
  MAX_CLUSTERING_REPOSITORIES,
} from "@/lib/constants/clustering";
import type { GitHubRepo } from "@/lib/github";
import type { ClusterFilters, ClusterParameterSettings } from "@/lib/types/clustering";
import { ClusterView } from "../cluster-view/cluster-view";
import { RepositoryLoading } from "../list-view/repository-loading";

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

export function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const [clusterParams, setClusterParams] =
    useState<ClusterParameterSettings>(DEFAULT_CLUSTERING_PARAMS);

  const [filters, setFilters] = useState<ClusterFilters>({});
  const [preferredAlgorithm, setPreferredAlgorithm] = useState<ClusteringAlgorithm>("kmeans");

  const clusteringInputKey = useMemo(
    () =>
      repositories.map(({ id, name, description }) => ({
        id,
        name,
        description,
      })),
    [repositories]
  );
  const requestParams = useMemo(
    () => clampClusteringParams(clusterParams, repositories.length),
    [clusterParams, repositories.length]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["clusterResults", clusteringInputKey, requestParams],
    queryFn: () =>
      clusterRepositories({
        repositories,
        ...requestParams,
      }),
    enabled: repositories.length > 0 && repositories.length <= MAX_CLUSTERING_REPOSITORIES,
  });

  const algorithmResults = [
    ["kmeans", data?.kmeans_clusters],
    ["hierarchical", data?.hierarchical_clusters],
    ["pca_hierarchical", data?.pca_hierarchical_clusters],
  ] as const;
  const availableAlgorithms = algorithmResults
    .filter(([, result]) => result !== undefined)
    .map(([algorithm]) => algorithm);
  const activeAlgorithm = availableAlgorithms.includes(preferredAlgorithm)
    ? preferredAlgorithm
    : availableAlgorithms[0];

  const handleTabChange = (value: string) => {
    const algorithm = availableAlgorithms.find((candidate) => candidate === value);
    if (algorithm) setPreferredAlgorithm(algorithm);
  };

  if (repositories.length > MAX_CLUSTERING_REPOSITORIES) {
    return (
      <Alert>
        <AlertDescription>
          Clustering supports up to 1,000 repositories. Narrow the active filters or remove a
          selected GitHub user.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <RepositoryLoading />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to cluster repositories"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || !activeAlgorithm) {
    return (
      <Alert>
        <AlertDescription>
          No clustering results available. Try adjusting the parameters or adding more repositories.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs value={activeAlgorithm} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        {algorithmResults.map(([algorithm, result]) =>
          result ? (
            <TabsTrigger key={algorithm} value={algorithm}>
              {CLUSTERING_ALGORITHMS[algorithm].name}
            </TabsTrigger>
          ) : null
        )}
      </TabsList>
      {algorithmResults.map(([algorithm, result]) =>
        result ? (
          <TabsContent key={algorithm} value={algorithm}>
            <ClusterView
              result={result}
              repositories={repositories}
              algorithm={algorithm}
              availableAlgorithms={availableAlgorithms}
              onSettingsChange={setClusterParams}
              currentSettings={requestParams}
              onFiltersChange={setFilters}
              currentFilters={filters}
            />
          </TabsContent>
        ) : null
      )}
    </Tabs>
  );
}
