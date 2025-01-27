"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ClusterCard } from "./cluster-card";
import { ClusterSettings } from "./cluster-settings";
import {
  algorithmDescriptions,
  defaultClusteringConfig,
} from "@/lib/clustering-api";
import { ClusterViewProps } from "@/lib/types/clustering";
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
  currentSettings,
  currentFilters,
  onSettingsChange,
  onFiltersChange,
}: ClusterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set()
  );

  // Process repository data
  const { languages: allLanguages, topics: allTopics } =
    extractUniqueMeta(repositories);
  const clusterRepos = computeClusterData(result, repositories);
  const sortedClusters = [...clusterRepos].sort(
    (a, b) => b.metadata.size - a.metadata.size
  );
  const filteredClusters = filterClusters(sortedClusters, searchQuery, currentFilters);

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

  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);

  return (
    <div className="h-[calc(100vh-24rem)]">
      <div className="flex h-full">
        {/* Settings Panel */}
        <div className={`relative h-full flex ${isSettingsCollapsed ? 'w-0' : ''}`}>
          {!isSettingsCollapsed && (
            <ClusterSettings
              settings={currentSettings}
              onSettingsChange={onSettingsChange || (() => {})}
              filters={currentFilters}
              onFiltersChange={onFiltersChange || (() => {})}
              availableLanguages={allLanguages}
              availableTopics={allTopics}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-12 w-6 border shadow-sm bg-background"
            onClick={() => setIsSettingsCollapsed(!isSettingsCollapsed)}
          >
            {isSettingsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4 p-6">
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
            <ScrollArea className="flex-1">
              <div className="grid gap-2 px-4 pb-4">
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
      </div>
    </div>
  );
}
