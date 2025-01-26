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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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

  const clusterRepos = Object.entries(result.clusters).map(([id, indices]) => {
    const repos = indices.map(idx => repositories[idx]);
    const avgStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / repos.length;
    const languages = new Set(repos.filter(r => r.language).map(r => r.language));
    
    return {
      id: parseInt(id),
      repositories: repos,
      metadata: {
        avgStars,
        languages: Array.from(languages),
        size: repos.length
      }
    };
  });

  const sortedClusters = [...clusterRepos].sort((a, b) => b.metadata.size - a.metadata.size);

  const currentCluster = selectedCluster !== null
    ? clusterRepos.find(c => c.id === selectedCluster)
    : null;

  const filteredRepos = currentCluster?.repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getClusterSimilarity = (cluster1: typeof clusterRepos[0], cluster2: typeof clusterRepos[0]) => {
    const langs1 = new Set(cluster1.repositories.map(r => r.language).filter(Boolean));
    const langs2 = new Set(cluster2.repositories.map(r => r.language).filter(Boolean));
    const langs1Array = Array.from(langs1);
    const commonLangs = new Set(langs1Array.filter(x => langs2.has(x)));
    return commonLangs.size / Math.max(langs1.size, langs2.size);
  };

  return (
    <div className="h-[calc(100vh-24rem)]">
      <div className="flex flex-row gap-4 h-full">
        <div className="w-1/4 flex flex-col h-full">
          <div className="flex-shrink-0 space-y-4 mb-4">
            <div className="font-medium">{algorithmDescriptions[algorithm as keyof typeof algorithmDescriptions]?.name}</div>
            <div className="text-sm text-muted-foreground">
              {algorithmDescriptions[algorithm as keyof typeof algorithmDescriptions]?.description}
            </div>
            <div className="text-sm text-muted-foreground">
              Processing time: {result.processing_time_ms.toFixed(2)}ms
            </div>
            <div className="text-sm font-medium">Cluster Overview</div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {sortedClusters.map((cluster, index) => (
                <div key={cluster.id} className="space-y-1">
                  <Button
                    variant={selectedCluster === cluster.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCluster(cluster.id)}
                  >
                    <span>Cluster {cluster.id + 1}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="secondary" title="Number of repositories in this cluster">
                        {cluster.metadata.size}
                      </Badge>
                      {algorithm === "pca_hierarchical" && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          title="Principal Component group this cluster belongs to"
                        >
                          PC{Math.floor(cluster.id / 2) + 1}
                        </Badge>
                      )}
                    </div>
                  </Button>
                  
                  {selectedCluster === cluster.id && (
                    <div className="ml-4 pl-4 border-l-2 border-muted space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Languages:</span>{" "}
                        {cluster.metadata.languages.join(", ") || "None specified"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Avg. Stars:</span>{" "}
                        {Math.round(cluster.metadata.avgStars).toLocaleString()}
                      </div>
                      {algorithm.includes("hierarchical") && (
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Tree Level:</span>{" "}
                            {Math.floor(Math.log2(sortedClusters.length / (cluster.id + 1)))}
                          </div>
                          {index > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Parent Similarity:</span>{" "}
                              {(getClusterSimilarity(cluster, sortedClusters[index - 1]) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )}
                      {algorithm === "pca_hierarchical" && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">PC Group:</span>{" "}
                          {Math.floor(cluster.id / 2) + 1}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="w-3/4 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-4">
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
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {currentCluster ? (
                filteredRepos.map((repo) => (
                  <Card key={repo.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {repo.name}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            ⭐ {repo.stargazers_count.toLocaleString()}
                          </Badge>
                          {algorithm.includes("hierarchical") && currentCluster && (
                            <Badge variant="outline" className="text-xs">
                              Depth {Math.floor(Math.log2(currentCluster.metadata.size))}
                            </Badge>
                          )}
                        </div>
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

export function RepositoryClusters({ repositories }: RepositoryClustersProps) {
  const [clusteringResults, setClusteringResults] = useState<ClusteringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [settings, setSettings] = useState({
    kmeans_clusters: 5,
    hierarchical_threshold: 1.5,
    pca_components: 10
  });

  const performClustering = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await clusterRepositories({
        repositories,
        ...settings
      });
      setClusteringResults(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cluster repositories'));
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

  const handleSettingsChange = (newSettings: typeof settings) => {
    setSettings(newSettings);
  };

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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">K-Means Clusters</label>
            <Slider
              value={[settings.kmeans_clusters]}
              min={2}
              max={10}
              step={1}
              onValueChange={([value]) =>
                handleSettingsChange({ ...settings, kmeans_clusters: value })
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
                handleSettingsChange({ ...settings, hierarchical_threshold: value })
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
                handleSettingsChange({ ...settings, pca_components: value })
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
