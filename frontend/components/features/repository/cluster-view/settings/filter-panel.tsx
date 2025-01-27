"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClusterFilters } from "@/lib/types/clustering";
import {
  CLUSTERING_HELP_TEXT,
  CLUSTERING_CONFIG,
} from "@/lib/constants/clustering";

interface FilterPanelProps {
  filters: ClusterFilters;
  onFiltersChange: (filters: ClusterFilters) => void;
  availableLanguages: string[];
  availableTopics: string[];
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableLanguages,
  availableTopics,
}: FilterPanelProps) {
  const handleFilterChange = (updates: Partial<ClusterFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleLanguage = (lang: string) => {
    const languages = filters.languages || [];
    const newLanguages = languages.includes(lang)
      ? languages.filter((l) => l !== lang)
      : [...languages, lang];
    handleFilterChange({ languages: newLanguages });
  };

  const toggleTopic = (topic: string) => {
    const topics = filters.topics || [];
    const newTopics = topics.includes(topic)
      ? topics.filter((t) => t !== topic)
      : [...topics, topic];
    handleFilterChange({ topics: newTopics });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium block mb-1">
          {CLUSTERING_HELP_TEXT.filters.stars.title}
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min stars"
            value={filters.minStars || ""}
            min={CLUSTERING_CONFIG.filters.minStars}
            onChange={(e) =>
              handleFilterChange({
                minStars: parseInt(e.target.value) || undefined,
              })
            }
            className="w-full h-7 text-sm"
          />
          <Input
            type="number"
            placeholder="Max stars"
            value={filters.maxStars || ""}
            max={CLUSTERING_CONFIG.filters.maxStars}
            onChange={(e) =>
              handleFilterChange({
                maxStars: parseInt(e.target.value) || undefined,
              })
            }
            className="w-full h-7 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Minimum Cluster Size</label>
        <Input
          type="number"
          placeholder="Min repositories"
          value={filters.minClusterSize || ""}
          min={CLUSTERING_CONFIG.filters.minClusterSize}
          onChange={(e) =>
            handleFilterChange({
              minClusterSize: parseInt(e.target.value) || undefined,
            })
          }
          className="w-full h-7 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Languages</label>
        <div className="h-16 w-full rounded-md border overflow-y-auto bg-muted/5">
          <div className="p-1.5">
            <div className="flex flex-wrap gap-1">
              {availableLanguages
                .slice(0, CLUSTERING_CONFIG.filters.maxLanguages)
                .map((lang) => (
                  <Badge
                    key={lang}
                    variant={
                      filters.languages?.includes(lang)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-xs"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Topics</label>
        <div className="h-16 w-full rounded-md border overflow-y-auto bg-muted/5">
          <div className="p-1.5">
            <div className="flex flex-wrap gap-1">
              {availableTopics
                .slice(0, CLUSTERING_CONFIG.filters.maxTopics)
                .map((topic) => (
                  <Badge
                    key={topic}
                    variant={
                      filters.topics?.includes(topic) ? "default" : "outline"
                    }
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
