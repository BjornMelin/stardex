"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { computeClusterData, extractUniqueMeta, filterClusters } from "@/lib/clustering/utils";
import { CLUSTERING_ALGORITHMS } from "@/lib/constants/clustering";
import type { ClusterViewProps } from "@/lib/types/clustering";
import { ClusterCard } from "./cluster-card";
import { ClusterSettings } from "./cluster-settings";

/**
 * Renders one clustering result with persistent controls and searchable groups.
 *
 * @param props - Result, repositories, settings, and callbacks for the active algorithm.
 * @returns The interactive cluster result view.
 */
export function ClusterView({
  result,
  repositories,
  algorithm,
  availableAlgorithms,
  currentSettings,
  currentFilters,
  onSettingsChange,
  onFiltersChange,
}: ClusterViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());

  // Process repository data
  const { languages: allLanguages, topics: allTopics } = extractUniqueMeta(repositories);
  const clusterRepos = computeClusterData(result, repositories);
  const sortedClusters = [...clusterRepos].sort((a, b) => b.metadata.size - a.metadata.size);
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
  const settingsPanelId = useId();

  return (
    <div className="h-[calc(100vh-24rem)]">
      <div className="flex h-full">
        {/* Settings Panel */}
        <div className={`relative h-full flex ${isSettingsCollapsed ? "w-0" : ""}`}>
          <div id={settingsPanelId} className="h-full" hidden={isSettingsCollapsed}>
            <ClusterSettings
              settings={currentSettings}
              onSettingsChange={onSettingsChange}
              repositoryCount={repositories.length}
              availableAlgorithms={availableAlgorithms}
              filters={currentFilters}
              onFiltersChange={onFiltersChange}
              availableLanguages={allLanguages}
              availableTopics={allTopics}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 z-10 h-12 w-11 -translate-y-1/2 translate-x-1/2 border bg-background shadow-sm sm:w-6"
            aria-label={isSettingsCollapsed ? "Show cluster settings" : "Hide cluster settings"}
            aria-controls={settingsPanelId}
            aria-expanded={!isSettingsCollapsed}
            onClick={() => setIsSettingsCollapsed(!isSettingsCollapsed)}
          >
            {isSettingsCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 space-y-4 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {CLUSTERING_ALGORITHMS[algorithm].title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {CLUSTERING_ALGORITHMS[algorithm].description}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Processed in {result.processing_time_ms.toFixed(2)}ms
                </Badge>
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  aria-label="Search clusters"
                  placeholder="Search clusters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-sm text-muted-foreground">
                  Showing {filteredClusters.length} of {sortedClusters.length} clusters
                </p>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid gap-2 px-4 pb-4">
                {filteredClusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    isExpanded={expandedClusters.has(cluster.id)}
                    onToggle={() => toggleCluster(cluster.id)}
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
