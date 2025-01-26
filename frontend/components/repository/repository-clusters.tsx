"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubRepo } from "@/lib/github";
import { 
  clusterRepositories, 
  ClusteringResponse, 
  ClusterResult,
  algorithmDescriptions
} from "@/lib/clustering-api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RepositoryClustersProps {
  repositories: GitHubRepo[];
}

interface ClusterViewProps {
  result: ClusterResult;
  repositories: GitHubRepo[];
  algorithm: string;
}

function ClusterView({ result, repositories, algorithm }: ClusterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  // Convert cluster indices to actual repositories
  const clusterRepos = Object.entries(result.clusters).map(([id, indices]) => ({
    id: parseInt(id),
    repositories: indices.map(idx => repositories[idx])
  }));

  const currentCluster = selectedCluster !== null 
    ? clusterRepos.find(c => c.id === selectedCluster)
    : null;

  const filteredRepos = currentCluster?.repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-row gap-4">
        <div className="w-1/4 space-y-4">
          <div className="font-medium">{algorithmDescriptions[algorithm as keyof typeof algorithmDescriptions]?.name}</div>
          <div className="text-sm text-muted-foreground">
            {algorithmDescriptions[algorithm as keyof typeof algorithmDescriptions]?.description}
          </div>
          <div className="text-sm text-muted-foreground">
            Processing time: {result.processing_time_ms.toFixed(2)}ms
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {clusterRepos.map((cluster) => (
                <Button
                  key={cluster.id}
                  variant={selectedCluster === cluster.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCluster(cluster.id)}
                >
                  <span>Cluster {cluster.id + 1}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {cluster.repositories.length}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="w-3/4 space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search in cluster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            {currentCluster && (
              <div className="text-sm text-muted-foreground">
                {filteredRepos.length} repositories
              </div>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {currentCluster ? (
                filteredRepos.map((repo) => (
                  <Card key={repo.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {repo.name}
                        </a>
                        <Badge variant="secondary">
                          ⭐ {repo.stargazers_count.toLocaleString()}
                        </Badge>
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {repo.language && (
                          <Badge variant="outline">{repo.language}</Badge>
                        )}
                        {repo.topics.slice(0, 3).map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center text-muted-foreground">
                  Select a cluster to view repositories
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const [clusteringResults, setClusteringResults] = useState<ClusteringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    kmeans_clusters: 5,
    hierarchical_threshold: 1.5,
    pca_components: 10
  });

  useEffect(() => {
    if (repositories.length > 0) {
      performClustering();
    }
  }, [repositories, settings]);

  async function performClustering() {
    setLoading(true);
    try {
      const response = await clusterRepositories({
        repositories,
        ...settings
      });
      setClusteringResults(response);
    } catch (error) {
      console.error("Clustering error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">K-Means Clusters</label>
            <Slider
              value={[settings.kmeans_clusters]}
              min={2}
              max={10}
              step={1}
              onValueChange={([value]) => 
                setSettings(s => ({ ...s, kmeans_clusters: value }))
              }
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {settings.kmeans_clusters} clusters
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Hierarchical Threshold</label>
            <Slider
              value={[settings.hierarchical_threshold]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={([value]) => 
                setSettings(s => ({ ...s, hierarchical_threshold: value }))
              }
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              Threshold: {settings.hierarchical_threshold}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">PCA Components</label>
            <Slider
              value={[settings.pca_components]}
              min={2}
              max={20}
              step={1}
              onValueChange={([value]) => 
                setSettings(s => ({ ...s, pca_components: value }))
              }
              className="mt-2"
            />
            <div className="text-sm text-muted-foreground mt-1">
              {settings.pca_components} components
            </div>
          </div>
        </div>

        {clusteringResults && clusteringResults.status === "success" && (
          <Tabs defaultValue="kmeans">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="kmeans">K-Means</TabsTrigger>
              <TabsTrigger value="hierarchical">Hierarchical</TabsTrigger>
              <TabsTrigger value="pca">PCA + Hierarchical</TabsTrigger>
            </TabsList>

            <TabsContent value="kmeans" className="mt-4">
              {clusteringResults.kmeans_clusters && (
                <ClusterView
                  result={clusteringResults.kmeans_clusters}
                  repositories={repositories}
                  algorithm="kmeans"
                />
              )}
            </TabsContent>

            <TabsContent value="hierarchical" className="mt-4">
              {clusteringResults.hierarchical_clusters && (
                <ClusterView
                  result={clusteringResults.hierarchical_clusters}
                  repositories={repositories}
                  algorithm="hierarchical"
                />
              )}
            </TabsContent>

            <TabsContent value="pca" className="mt-4">
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
