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
    <div className="w-72 border-r p-4 flex flex-col">
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {showingSettings ? "Cluster Settings" : "Filter Clusters"}
              </h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setShowingSettings(!showingSettings)}
                >
                  {showingSettings ? "Filters" : "Settings"}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Help">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <HelpContent isSettings={showingSettings} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {showingSettings
                ? CLUSTERING_HELP_TEXT.settings.description
                : CLUSTERING_HELP_TEXT.filters.description}
            </p>
          </div>
    
          <div className="overflow-y-auto flex-1">
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
        </div>
  );
}
