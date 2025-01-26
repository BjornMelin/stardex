"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClusterCard } from "./cluster-card";
import { ClusterSettings } from "./cluster-settings";
import {
  algorithmDescriptions,
  defaultClusteringConfig,
} from "@/lib/clustering-api";
import { ClusterViewProps, ClusterFilters } from "@/lib/types/clustering";
import {
  computeClusterData,
  filterClusters,
  getClusterSimilarity,
  extractUniqueMeta,
} from "@/lib/clustering/utils";

export function ClusterView({
  result,
  repositories,
  algorithm,
}: ClusterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set()
  );
  const [filters, setFilters] = useState<ClusterFilters>({});

  // Process repository data
  const { languages: allLanguages, topics: allTopics } =
    extractUniqueMeta(repositories);
  const clusterRepos = computeClusterData(result, repositories);
  const sortedClusters = [...clusterRepos].sort(
    (a, b) => b.metadata.size - a.metadata.size
  );
  const filteredClusters = filterClusters(sortedClusters, searchQuery, filters);

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
          <div className="space-y-4">
            <ClusterSettings
              settings={{
                kmeans_clusters:
                  result.parameters.kmeans_clusters ||
                  defaultClusteringConfig.kmeans_clusters,
                hierarchical_threshold:
                  result.parameters.hierarchical_threshold ||
                  defaultClusteringConfig.hierarchical_threshold,
                pca_components:
                  result.parameters.pca_components ||
                  defaultClusteringConfig.pca_components,
              }}
              onSettingsChange={() => {}} // Placeholder since we don't need to change settings after clustering
              filters={filters}
              onFiltersChange={setFilters}
              availableLanguages={allLanguages}
              availableTopics={allTopics}
            />
            <div className="flex gap-4 items-center">
              <Input
                placeholder="Search clusters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Showing {filteredClusters.length} of {sortedClusters.length}{" "}
                clusters
              </p>
            </div>
          </div>
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
