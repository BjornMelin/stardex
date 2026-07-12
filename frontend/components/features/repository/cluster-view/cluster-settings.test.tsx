import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLUSTERING_PARAMS } from "@/lib/constants/clustering";
import { ClusterSettings } from "./cluster-settings";

afterEach(cleanup);

describe("ClusterSettings", () => {
  it("keeps keyboard focus while reconciling canonical slider settings", () => {
    const committed = vi.fn();

    function Harness() {
      const [settings, setSettings] = useState(DEFAULT_CLUSTERING_PARAMS);

      return (
        <>
          <button
            type="button"
            onClick={() =>
              setSettings({
                ...DEFAULT_CLUSTERING_PARAMS,
                kmeans_clusters: 8,
              })
            }
          >
            Use external settings
          </button>
          <ClusterSettings
            settings={settings}
            onSettingsChange={(nextSettings) => {
              committed(nextSettings);
              setSettings(nextSettings);
            }}
          />
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const slider = screen.getByRole("slider", { name: "K-Means Clusters" });
    slider.focus();
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(committed).toHaveBeenLastCalledWith({
      ...DEFAULT_CLUSTERING_PARAMS,
      kmeans_clusters: 6,
    });
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute("aria-valuenow", "6");

    fireEvent.click(screen.getByRole("button", { name: "Use external settings" }));

    expect(screen.getByRole("slider", { name: "K-Means Clusters" })).toBe(slider);
    expect(slider).toHaveAttribute("aria-valuenow", "8");
  });
});
