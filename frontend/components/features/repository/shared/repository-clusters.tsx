"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clusterRepositories } from "@/lib/clustering-api";
import { GitHubRepo } from "@/lib/github";
import { ClusterView } from "../cluster-view/cluster-view";
import { RepositoryLoading } from "../list-view/repository-loading";

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

export function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  // Default clustering parameters
  const [clusterParams] = useState({
    kmeans_clusters: 5,
    hierarchical_threshold: 1.5,
    pca_components: 10,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["clusterResults", repositories.length, clusterParams],
    queryFn: async () => {
      const response = await clusterRepositories({
        repositories,
        ...clusterParams,
      });
      return {
        kmeans: response.kmeans_clusters,
        hierarchical: response.hierarchical_clusters,
        pca_hierarchical: response.pca_hierarchical_clusters,
      };
    },
    enabled: repositories.length > 0,
  });

  const results = {
    kmeans: data?.kmeans,
    hierarchical: data?.hierarchical,
    pca_hierarchical: data?.pca_hierarchical,
  };

  const [activeTab, setActiveTab] = useState<string>(
    results.kmeans
      ? "kmeans"
      : results.hierarchical
      ? "hierarchical"
      : results.pca_hierarchical
      ? "pca_hierarchical"
      : "kmeans"
  );

  if (isLoading) {
    return <RepositoryLoading />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "Failed to cluster repositories"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || Object.values(results).every((r) => !r)) {
    return (
      <Alert>
        <AlertDescription>
          No clustering results available. Try adjusting the parameters or
          adding more repositories.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        {results.kmeans && <TabsTrigger value="kmeans">K-Means</TabsTrigger>}
        {results.hierarchical && (
          <TabsTrigger value="hierarchical">Hierarchical</TabsTrigger>
        )}
        {results.pca_hierarchical && (
          <TabsTrigger value="pca_hierarchical">PCA + Hierarchical</TabsTrigger>
        )}
      </TabsList>
      {results.kmeans && (
        <TabsContent value="kmeans">
          <ClusterView
            result={results.kmeans}
            repositories={repositories}
            algorithm="kmeans"
          />
        </TabsContent>
      )}
      {results.hierarchical && (
        <TabsContent value="hierarchical">
          <ClusterView
            result={results.hierarchical}
            repositories={repositories}
            algorithm="hierarchical"
          />
        </TabsContent>
      )}
      {results.pca_hierarchical && (
        <TabsContent value="pca_hierarchical">
          <ClusterView
            result={results.pca_hierarchical}
            repositories={repositories}
            algorithm="pca_hierarchical"
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
