"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubRepo } from "@/lib/github";
import { clusterRepositories, ClusteringResponse } from "@/lib/clustering-api";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ClusterView } from "@/components/repository/cluster-view";
import { ClusterSettings } from "@/components/repository/cluster-settings";

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

export function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const [clusteringResults, setClusteringResults] =
    useState<ClusteringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [settings, setSettings] = useState({
    kmeans_clusters: 5,
    hierarchical_threshold: 1.5,
    pca_components: 10,
  });

  const performClustering = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clusterRepositories({
        repositories,
        ...settings,
      });
      setClusteringResults(response);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to cluster repositories")
      );
      console.error("Clustering error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repositories.length > 0) {
      void performClustering();
    }
  }, [repositories, settings]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6 h-[calc(100vh-12rem)]">
      <div className="flex flex-col h-full space-y-6">
        <ClusterSettings settings={settings} onSettingsChange={setSettings} />

        {clusteringResults && clusteringResults.status === "success" && (
          <Tabs defaultValue="kmeans" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="kmeans">K-Means</TabsTrigger>
              <TabsTrigger value="hierarchical">Hierarchical</TabsTrigger>
              <TabsTrigger value="pca">PCA + Hierarchical</TabsTrigger>
            </TabsList>

            <TabsContent value="kmeans" className="mt-4 flex-1">
              {clusteringResults.kmeans_clusters && (
                <ClusterView
                  result={clusteringResults.kmeans_clusters}
                  repositories={repositories}
                  algorithm="kmeans"
                />
              )}
            </TabsContent>

            <TabsContent value="hierarchical" className="mt-4 flex-1">
              {clusteringResults.hierarchical_clusters && (
                <ClusterView
                  result={clusteringResults.hierarchical_clusters}
                  repositories={repositories}
                  algorithm="hierarchical"
                />
              )}
            </TabsContent>

            <TabsContent value="pca" className="mt-4 flex-1">
              {clusteringResults.pca_hierarchical_clusters && (
                <ClusterView
                  result={clusteringResults.pca_hierarchical_clusters}
                  repositories={repositories}
                  algorithm="pca_hierarchical"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Card>
  );
}
