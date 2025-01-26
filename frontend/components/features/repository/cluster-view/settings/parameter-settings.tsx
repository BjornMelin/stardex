"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ClusterParameterSettings } from "@/lib/types/clustering";
import {
  CLUSTERING_HELP_TEXT,
  CLUSTERING_CONFIG,
} from "@/lib/constants/clustering";

interface ParameterSettingsProps {
  settings: ClusterParameterSettings;
  onSettingsChange: (settings: ClusterParameterSettings) => void;
}

export function ParameterSettings({
  settings,
  onSettingsChange,
}: ParameterSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium">
          {CLUSTERING_HELP_TEXT.settings.kmeans.title}
        </label>
        <Slider
          value={[localSettings.kmeans_clusters]}
          min={CLUSTERING_CONFIG.kmeans.min}
          max={CLUSTERING_CONFIG.kmeans.max}
          step={CLUSTERING_CONFIG.kmeans.step}
          onValueChange={([value]) =>
            setLocalSettings({ ...localSettings, kmeans_clusters: value })
          }
          onValueCommit={([value]) =>
            onSettingsChange({ ...settings, kmeans_clusters: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          {localSettings.kmeans_clusters} clusters
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">
          {CLUSTERING_HELP_TEXT.settings.hierarchical.title}
        </label>
        <Slider
          value={[localSettings.hierarchical_threshold]}
          min={CLUSTERING_CONFIG.hierarchical.min}
          max={CLUSTERING_CONFIG.hierarchical.max}
          step={CLUSTERING_CONFIG.hierarchical.step}
          onValueChange={([value]) =>
            setLocalSettings({
              ...localSettings,
              hierarchical_threshold: value,
            })
          }
          onValueCommit={([value]) =>
            onSettingsChange({ ...settings, hierarchical_threshold: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          Threshold: {localSettings.hierarchical_threshold}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">
          {CLUSTERING_HELP_TEXT.settings.pca.title}
        </label>
        <Slider
          value={[localSettings.pca_components]}
          min={CLUSTERING_CONFIG.pca.min}
          max={CLUSTERING_CONFIG.pca.max}
          step={CLUSTERING_CONFIG.pca.step}
          onValueChange={([value]) =>
            setLocalSettings({ ...localSettings, pca_components: value })
          }
          onValueCommit={([value]) =>
            onSettingsChange({ ...settings, pca_components: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          {localSettings.pca_components} components
        </div>
      </div>
    </div>
  );
}
