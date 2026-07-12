import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLUSTERING_PARAMS } from "@/lib/constants/clustering";
import type { ClusterParameterSettings } from "@/lib/types/clustering";
import { ClusterSettings } from "./cluster-settings";

afterEach(cleanup);

describe("ClusterSettings", () => {
  it("keeps keyboard focus while reconciling canonical slider settings", () => {
    const committed = vi.fn();
    const renderSettings = (settings: ClusterParameterSettings) => (
      <ClusterSettings settings={settings} onSettingsChange={committed} />
    );
    const { rerender } = render(renderSettings(DEFAULT_CLUSTERING_PARAMS));
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
});
