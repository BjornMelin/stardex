"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GitHubRepo } from "@/lib/github";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { RepositoryCard } from "../shared/repository-card";

interface ClusterCardProps {
  cluster: {
    id: number;
    repositories: GitHubRepo[];
    metadata: {
      avgStars: number;
      languages: string[];
      size: number;
      name: string;
    };
  };
  algorithm: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  getClusterSimilarity: (cluster1: any, cluster2: any) => number;
  previousCluster?: any;
  sortedClusters: any[];
}

export function ClusterCard({
  cluster,
  algorithm,
  index,
  isExpanded,
  onToggle,
  getClusterSimilarity,
  previousCluster,
  sortedClusters,
}: ClusterCardProps) {
  const depth = algorithm.includes("hierarchical")
    ? Math.floor(Math.log2(sortedClusters.length / (cluster.id + 1)))
    : 0;

  return (
    <Card
      className={`relative ${
        algorithm.includes("hierarchical") ? "pl-7 border-l-2" : "p-4"
      }`}
      style={
        algorithm.includes("hierarchical")
          ? {
              marginLeft: `${depth * 20}px`,
              borderLeftColor: `hsl(${(depth * 30) % 360}deg 70% ${depth % 2 ? 60 : 70}%)`,
            }
          : undefined
      }
    >
      {algorithm.includes("hierarchical") && (
        <div
          className="absolute left-2 top-0 bottom-0 flex items-center text-muted-foreground/50"
          title={`Depth Level ${depth}`}
        >
          <GitBranch className="h-4 w-4" />
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={onToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{cluster.metadata.name}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              {cluster.metadata.size} repositories
              {algorithm === "pca_hierarchical" && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <Badge
                    variant="outline"
                    className="dark:from-blue-950/50 dark:to-purple-950/50 bg-gradient-to-r from-blue-50 to-purple-50"
                  >
                    PC Group {Math.floor(cluster.id / 2) + 1}
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {cluster.metadata.languages.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="secondary" className="text-xs px-1.5">
                {lang}
              </Badge>
            ))}
          </div>
        </div>

        {isExpanded && (
          <>
            {algorithm.includes("hierarchical") && index > 0 && previousCluster && (
              <div className="text-sm text-muted-foreground bg-muted/5 px-2 py-1.5 rounded flex items-center gap-2">
                <Badge variant="outline" className="bg-background dark:bg-muted">
                  Similarity:{" "}
                  <span
                    className={
                      getClusterSimilarity(cluster, previousCluster) > 0.5
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }
                  >
                    {(getClusterSimilarity(cluster, previousCluster) * 100).toFixed(
                      0
                    )}
                    %
                  </span>
                </Badge>
              </div>
            )}
            <div className="space-y-2 pl-7">
              {cluster.repositories.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} viewMode="list" />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
