"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface ClusterSettingsProps {
  settings: {
    kmeans_clusters: number;
    hierarchical_threshold: number;
    pca_components: number;
  };
  onSettingsChange: (newSettings: {
    kmeans_clusters: number;
    hierarchical_threshold: number;
    pca_components: number;
  }) => void;
}

export function ClusterSettings({
  settings,
  onSettingsChange,
}: ClusterSettingsProps) {
  // Local state for visual updates during sliding
  const [localSettings, setLocalSettings] = useState(settings);

  // Keep local state in sync with props
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium">K-Means Clusters</label>
        <Slider
          value={[localSettings.kmeans_clusters]}
          min={2}
          max={10}
          step={1}
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
        <label className="text-sm font-medium">Hierarchical Threshold</label>
        <Slider
          value={[localSettings.hierarchical_threshold]}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={([value]) =>
            setLocalSettings({ ...localSettings, hierarchical_threshold: value })
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
        <label className="text-sm font-medium">PCA Components</label>
        <Slider
          value={[localSettings.pca_components]}
          min={2}
          max={20}
          step={1}
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
