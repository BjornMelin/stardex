import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLUSTERING_PARAMS } from "@/lib/constants/clustering";
import { ClusterView } from "./cluster-view";

afterEach(cleanup);

describe("ClusterView", () => {
  it("exposes the settings panel disclosure relationship and state", () => {
    render(
      <ClusterView
        result={{
          algorithm: "kmeans",
          clusters: {},
          parameters: { num_clusters: 1 },
          processing_time_ms: 1,
        }}
        repositories={[]}
        algorithm="kmeans"
        availableAlgorithms={["kmeans"]}
        currentSettings={DEFAULT_CLUSTERING_PARAMS}
        currentFilters={{}}
        onSettingsChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByRole("textbox", { name: "Search clusters" })).toBeInTheDocument();

    const hideButton = screen.getByRole("button", { name: "Hide cluster settings" });
    const panelId = hideButton.getAttribute("aria-controls") ?? "";
    expect(hideButton).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(panelId)).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();

    fireEvent.click(hideButton);

    const showButton = screen.getByRole("button", { name: "Show cluster settings" });
    expect(showButton).toHaveAttribute("aria-controls", panelId);
    expect(showButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId)).toHaveAttribute("hidden");

    fireEvent.click(showButton);

    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
  });
});
