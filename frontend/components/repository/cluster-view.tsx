"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitHubRepo } from "@/lib/github";
import { ClusterResult, algorithmDescriptions } from "@/lib/clustering-api";
import { ClusterCard } from "@/components/repository/cluster-card";

interface ClusterViewProps {
  result: ClusterResult;
  repositories: GitHubRepo[];
  algorithm: string;
}

export function ClusterView({
  result,
  repositories,
  algorithm,
}: ClusterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set()
  );

  const clusterRepos = Object.entries(result.clusters).map(([id, indices]) => {
    const repos = indices.map((idx) => repositories[idx]);
    const avgStars =
      repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) /
      repos.length;
    const languages = new Set(
      repos.filter((r) => r.language).map((r) => r.language as string)
    );
    const topics = new Set(repos.flatMap((r) => r.topics));
    const topLanguages = Array.from(languages).slice(0, 2);
    const topTopics = Array.from(topics).slice(0, 2);

    // Generate a descriptive name for the cluster
    const generateClusterName = () => {
      if (topLanguages.length > 0 && topTopics.length > 0) {
        return `${topLanguages.join("/")} ${topTopics.join("/")}`;
      } else if (topLanguages.length > 0) {
        return `${topLanguages.join("/")} Projects`;
      } else if (topTopics.length > 0) {
        return `${topTopics.join("/")} Group`;
      }
      return `Mixed Projects ${parseInt(id) + 1}`;
    };

    return {
      id: parseInt(id),
      repositories: repos,
      metadata: {
        avgStars,
        languages: Array.from(languages),
        size: repos.length,
        name: generateClusterName(),
      },
    };
  });

  const sortedClusters = [...clusterRepos].sort(
    (a, b) => b.metadata.size - a.metadata.size
  );

  const filteredClusters = sortedClusters.filter(
    (cluster) =>
      cluster.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cluster.metadata.languages.some((lang) =>
        lang?.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getClusterSimilarity = (
    cluster1: (typeof clusterRepos)[0],
    cluster2: (typeof clusterRepos)[0]
  ) => {
    const langs1 = new Set(
      cluster1.repositories.map((r) => r.language).filter(Boolean)
    );
    const langs2 = new Set(
      cluster2.repositories.map((r) => r.language).filter(Boolean)
    );
    const langs1Array = Array.from(langs1);
    const commonLangs = new Set(langs1Array.filter((x) => langs2.has(x)));
    return commonLangs.size / Math.max(langs1.size, langs2.size);
  };

  const toggleCluster = (clusterId: number) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  return (
    <div className="h-[calc(100vh-24rem)]">
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 space-y-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">
                {
                  algorithmDescriptions[
                    algorithm as keyof typeof algorithmDescriptions
                  ]?.name
                }
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {
                  algorithmDescriptions[
                    algorithm as keyof typeof algorithmDescriptions
                  ]?.description
                }
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Processed in {result.processing_time_ms.toFixed(2)}ms
            </Badge>
          </div>
          <Input
            placeholder="Search clusters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="grid gap-4 pr-4">
            {filteredClusters.map((cluster, index) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                algorithm={algorithm}
                index={index}
                isExpanded={expandedClusters.has(cluster.id)}
                onToggle={() => toggleCluster(cluster.id)}
                getClusterSimilarity={getClusterSimilarity}
                previousCluster={
                  index > 0 ? filteredClusters[index - 1] : undefined
                }
                sortedClusters={sortedClusters}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
