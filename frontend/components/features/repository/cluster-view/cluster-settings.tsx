"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { ClusterSettingsProps } from "@/lib/types/clustering";
import { CLUSTERING_HELP_TEXT } from "@/lib/constants/clustering";
import { FilterPanel } from "./settings/filter-panel";
import { ParameterSettings } from "./settings/parameter-settings";
import { HelpContent } from "./settings/help-content";

export function ClusterSettings({
  settings,
  onSettingsChange,
  filters = {},
  onFiltersChange,
  availableLanguages = [],
  availableTopics = [],
}: ClusterSettingsProps) {
  const [showingSettings, setShowingSettings] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {showingSettings ? "Cluster Settings" : "Filter Clusters"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {showingSettings
              ? CLUSTERING_HELP_TEXT.settings.description
              : CLUSTERING_HELP_TEXT.filters.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowingSettings(!showingSettings)}
          >
            {showingSettings ? "Show Filters" : "Show Settings"}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Help">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <HelpContent isSettings={showingSettings} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showingSettings ? (
        <ParameterSettings
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      ) : (
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange || (() => {})}
          availableLanguages={availableLanguages}
          availableTopics={availableTopics}
        />
      )}
    </div>
  );
}
