"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GitHubRepo } from "@/lib/github";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  return (
    <Card
      className={`p-4 ${
        algorithm.includes("hierarchical")
          ? `ml-${Math.min(
              Math.floor(Math.log2(sortedClusters.length / (cluster.id + 1))) *
                4,
              12
            )}`
          : ""
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
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
          <div className="flex-1">
            <div className="font-medium">{cluster.metadata.name}</div>
            <div className="text-sm text-muted-foreground">
              {cluster.metadata.size} repositories
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cluster.metadata.languages.slice(0, 3).map((lang) => (
              <Badge key={lang} variant="secondary">
                {lang}
              </Badge>
            ))}
            {algorithm === "pca_hierarchical" && (
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-blue-50 to-purple-50"
              >
                PC Group {Math.floor(cluster.id / 2) + 1}
              </Badge>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="pl-8 space-y-3">
            {algorithm.includes("hierarchical") && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/5 p-2 rounded">
                <div>
                  <span className="font-medium">Depth:</span>{" "}
                  <Badge variant="outline" className="ml-1">
                    Level{" "}
                    {Math.floor(
                      Math.log2(sortedClusters.length / (cluster.id + 1))
                    )}
                  </Badge>
                </div>
                {index > 0 && previousCluster && (
                  <div className="border-l pl-4">
                    <span className="font-medium">Similarity:</span>{" "}
                    <Badge
                      variant="outline"
                      className={`ml-1 ${
                        getClusterSimilarity(cluster, previousCluster) > 0.5
                          ? "bg-green-50"
                          : "bg-yellow-50"
                      }`}
                    >
                      {(
                        getClusterSimilarity(cluster, previousCluster) * 100
                      ).toFixed(0)}
                      %
                    </Badge>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {cluster.repositories.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} viewMode="list" />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
