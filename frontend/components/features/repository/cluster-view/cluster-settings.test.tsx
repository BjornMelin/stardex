import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClusteringAlgorithm } from "@/lib/constants/clustering";
import { CLUSTERING_ALGORITHM_IDS, DEFAULT_CLUSTERING_PARAMS } from "@/lib/constants/clustering";
import type { ClusterParameterSettings } from "@/lib/types/clustering";
import { ClusterSettings } from "./cluster-settings";

afterEach(cleanup);

describe("ClusterSettings", () => {
  it("keeps keyboard focus while reconciling canonical slider settings", () => {
    const committed = vi.fn();
    const renderSettings = (
      settings: ClusterParameterSettings,
      repositoryCount = 10,
      availableAlgorithms: readonly ClusteringAlgorithm[] = CLUSTERING_ALGORITHM_IDS
    ) => (
      <ClusterSettings
        settings={settings}
        onSettingsChange={committed}
        repositoryCount={repositoryCount}
        availableAlgorithms={availableAlgorithms}
        onFiltersChange={vi.fn()}
      />
    );
    const { rerender } = render(renderSettings(DEFAULT_CLUSTERING_PARAMS));

    expect(screen.getByRole("button", { name: "Clustering help" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const slider = screen.getByRole("slider", { name: "K-Means Clusters" });
    slider.focus();
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    const committedSettings = {
      ...DEFAULT_CLUSTERING_PARAMS,
      kmeans_clusters: 6,
    };
    expect(committed).toHaveBeenLastCalledWith(committedSettings);

    rerender(renderSettings(committedSettings));

    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuenow", "6");

    rerender(
      renderSettings({
        ...DEFAULT_CLUSTERING_PARAMS,
        kmeans_clusters: 8,
      })
    );

    expect(screen.getByRole("slider", { name: "K-Means Clusters" })).toBe(slider);
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuenow", "8");
  });

  it("renders a fixed singleton value without an invalid slider range", () => {
    render(
      <ClusterSettings
        settings={{
          ...DEFAULT_CLUSTERING_PARAMS,
          kmeans_clusters: 1,
          pca_components: 1,
        }}
        onSettingsChange={vi.fn()}
        repositoryCount={1}
        availableAlgorithms={["kmeans"]}
        onFiltersChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText("One repository forms one cluster.")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText("Hierarchical Threshold")).not.toBeInTheDocument();
    expect(screen.queryByText("PCA Components")).not.toBeInTheDocument();
  });

  it.each([
    { repositoryCount: 2, kmeansMax: 2, pcaMax: 2 },
    { repositoryCount: 9, kmeansMax: 9, pcaMax: 9 },
    { repositoryCount: 250, kmeansMax: 20, pcaMax: 50 },
  ])("uses count-aware bounds for $repositoryCount repositories", ({
    repositoryCount,
    kmeansMax,
    pcaMax,
  }) => {
    render(
      <ClusterSettings
        settings={{
          ...DEFAULT_CLUSTERING_PARAMS,
          kmeans_clusters: Math.min(DEFAULT_CLUSTERING_PARAMS.kmeans_clusters, kmeansMax),
          pca_components: Math.min(DEFAULT_CLUSTERING_PARAMS.pca_components, pcaMax),
        }}
        onSettingsChange={vi.fn()}
        repositoryCount={repositoryCount}
        availableAlgorithms={CLUSTERING_ALGORITHM_IDS}
        onFiltersChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const kmeansSlider = screen.getByRole("slider", { name: "K-Means Clusters" });
    const pcaSlider = screen.getByRole("slider", { name: "PCA Components" });

    expect(kmeansSlider).toHaveAttribute("aria-valuemin", "1");
    expect(kmeansSlider).toHaveAttribute("aria-valuemax", String(kmeansMax));
    expect(pcaSlider).toHaveAttribute("aria-valuemin", "1");
    expect(pcaSlider).toHaveAttribute("aria-valuemax", String(pcaMax));
  });
});
