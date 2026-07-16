"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ClusterData } from "@/lib/types/clustering";
import { RepositoryCard } from "../shared/repository-card";

interface ClusterCardProps {
  cluster: ClusterData;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Renders an expandable cluster summary and its repositories.
 *
 * @param props - Cluster data, disclosure state, and toggle callback.
 * @returns An accessible cluster disclosure card.
 */
export function ClusterCard({ cluster, isExpanded, onToggle }: ClusterCardProps) {
  const repositoriesId = useId();

  return (
    <Card className="relative p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${cluster.metadata.name}`}
            aria-controls={repositoriesId}
            aria-expanded={isExpanded}
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

        <div id={repositoriesId} className="space-y-2 pl-7" hidden={!isExpanded}>
          {isExpanded
            ? cluster.repositories.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} viewMode="list" />
              ))
            : null}
        </div>
      </div>
    </Card>
  );
}
