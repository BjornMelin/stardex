"use client";

import { useState, useCallback } from "react";
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

  const handleSettingChange = useCallback(
    (key: keyof ClusterParameterSettings, value: number) => {
      const newSettings = { ...localSettings, [key]: value };
      setLocalSettings(newSettings);
      onSettingsChange(newSettings);
    },
    [localSettings, onSettingsChange]
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-xs font-medium">
            {CLUSTERING_HELP_TEXT.settings.kmeans.title}
          </label>
          <span className="text-xs text-muted-foreground">
            {localSettings.kmeans_clusters} clusters
          </span>
        </div>
        <Slider
          value={[localSettings.kmeans_clusters]}
          min={CLUSTERING_CONFIG.kmeans.min}
          max={CLUSTERING_CONFIG.kmeans.max}
          step={CLUSTERING_CONFIG.kmeans.step}
          onValueChange={([value]) =>
            setLocalSettings({ ...localSettings, kmeans_clusters: value })
          }
          onValueCommit={([value]) =>
            handleSettingChange("kmeans_clusters", value)
          }
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-xs font-medium">
            {CLUSTERING_HELP_TEXT.settings.hierarchical.title}
          </label>
          <span className="text-xs text-muted-foreground">
            Threshold: {localSettings.hierarchical_threshold}
          </span>
        </div>
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
            handleSettingChange("hierarchical_threshold", value)
          }
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-xs font-medium">
            {CLUSTERING_HELP_TEXT.settings.pca.title}
          </label>
          <span className="text-xs text-muted-foreground">
            {localSettings.pca_components} components
          </span>
        </div>
        <Slider
          value={[localSettings.pca_components]}
          min={CLUSTERING_CONFIG.pca.min}
          max={CLUSTERING_CONFIG.pca.max}
          step={CLUSTERING_CONFIG.pca.step}
          onValueChange={([value]) =>
            setLocalSettings({ ...localSettings, pca_components: value })
          }
          onValueCommit={([value]) =>
            handleSettingChange("pca_components", value)
          }
        />
      </div>
    </div>
  );
}
