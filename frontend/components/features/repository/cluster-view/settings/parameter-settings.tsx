"use client";

import { useCallback, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { ClusteringAlgorithm } from "@/lib/constants/clustering";
import {
  CLUSTERING_CONFIG,
  CLUSTERING_HELP_TEXT,
  getClusteringParameterBounds,
} from "@/lib/constants/clustering";
import type { ClusterParameterSettings } from "@/lib/types/clustering";

interface ParameterSettingsProps {
  settings: ClusterParameterSettings;
  onSettingsChange: (settings: ClusterParameterSettings) => void;
  repositoryCount: number;
  availableAlgorithms: readonly ClusteringAlgorithm[];
}

/** Renders clustering controls and reconciles local values when external settings change. */
export function ParameterSettings({
  settings,
  onSettingsChange,
  repositoryCount,
  availableAlgorithms,
}: ParameterSettingsProps) {
  const [previousSettings, setPreviousSettings] = useState(settings);
  const [localSettings, setLocalSettings] = useState(settings);
  const bounds = getClusteringParameterBounds(repositoryCount);
  const hasHierarchical = availableAlgorithms.includes("hierarchical");
  const hasPcaHierarchical = availableAlgorithms.includes("pca_hierarchical");
  const hasThresholdSetting = hasHierarchical || hasPcaHierarchical;

  if (settings !== previousSettings) {
    setPreviousSettings(settings);
    setLocalSettings(settings);
  }

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
            {bounds.kmeans.max === bounds.kmeans.min
              ? "1 cluster"
              : `Up to ${localSettings.kmeans_clusters} clusters`}
          </span>
        </div>
        {bounds.kmeans.max === bounds.kmeans.min ? (
          <p className="text-xs text-muted-foreground">One repository forms one cluster.</p>
        ) : (
          <Slider
            aria-label={CLUSTERING_HELP_TEXT.settings.kmeans.title}
            value={[localSettings.kmeans_clusters]}
            min={bounds.kmeans.min}
            max={bounds.kmeans.max}
            step={CLUSTERING_CONFIG.kmeans.step}
            onValueChange={([value]) =>
              setLocalSettings((prev) => ({ ...prev, kmeans_clusters: value }))
            }
            onValueCommit={([value]) => handleSettingChange("kmeans_clusters", value)}
          />
        )}
      </div>

      {hasThresholdSetting && (
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
            aria-label={CLUSTERING_HELP_TEXT.settings.hierarchical.title}
            value={[localSettings.hierarchical_threshold]}
            min={CLUSTERING_CONFIG.hierarchical.min}
            max={CLUSTERING_CONFIG.hierarchical.max}
            step={CLUSTERING_CONFIG.hierarchical.step}
            onValueChange={([value]) =>
              setLocalSettings((prev) => ({
                ...prev,
                hierarchical_threshold: value,
              }))
            }
            onValueCommit={([value]) => handleSettingChange("hierarchical_threshold", value)}
          />
        </div>
      )}

      {hasPcaHierarchical && (
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs font-medium">{CLUSTERING_HELP_TEXT.settings.pca.title}</label>
            <span className="text-xs text-muted-foreground">
              Up to {localSettings.pca_components} components
            </span>
          </div>
          <Slider
            aria-label={CLUSTERING_HELP_TEXT.settings.pca.title}
            value={[localSettings.pca_components]}
            min={bounds.pca.min}
            max={bounds.pca.max}
            step={CLUSTERING_CONFIG.pca.step}
            onValueChange={([value]) =>
              setLocalSettings((prev) => ({ ...prev, pca_components: value }))
            }
            onValueCommit={([value]) => handleSettingChange("pca_components", value)}
          />
        </div>
      )}

      {!hasThresholdSetting && (
        <p className="text-xs text-muted-foreground">
          Hierarchical and PCA settings are unavailable for this repository count.
        </p>
      )}
    </div>
  );
}
