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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {CLUSTERING_HELP_TEXT.filters.stars.title}
          </label>
          <div className="grid grid-cols-2 gap-2">
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
              className="w-full"
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
              className="w-full"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Cluster Size</label>
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
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Languages</label>
          <div className="h-32 w-full rounded-md border overflow-y-auto">
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
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
                      className="cursor-pointer"
                      onClick={() => toggleLanguage(lang)}
                    >
                      {lang}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Topics</label>
          <div className="h-32 w-full rounded-md border overflow-y-auto">
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {availableTopics
                  .slice(0, CLUSTERING_CONFIG.filters.maxTopics)
                  .map((topic) => (
                    <Badge
                      key={topic}
                      variant={
                        filters.topics?.includes(topic) ? "default" : "outline"
                      }
                      className="cursor-pointer"
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
    </div>
  );
}
