"use client";

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
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium">K-Means Clusters</label>
        <Slider
          value={[settings.kmeans_clusters]}
          min={2}
          max={10}
          step={1}
          onValueChange={([value]) =>
            onSettingsChange({ ...settings, kmeans_clusters: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          {settings.kmeans_clusters} clusters
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Hierarchical Threshold</label>
        <Slider
          value={[settings.hierarchical_threshold]}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={([value]) =>
            onSettingsChange({ ...settings, hierarchical_threshold: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          Threshold: {settings.hierarchical_threshold}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">PCA Components</label>
        <Slider
          value={[settings.pca_components]}
          min={2}
          max={20}
          step={1}
          onValueChange={([value]) =>
            onSettingsChange({ ...settings, pca_components: value })
          }
          className="mt-2"
        />
        <div className="text-sm text-muted-foreground mt-1">
          {settings.pca_components} components
        </div>
      </div>
    </div>
  );
}
