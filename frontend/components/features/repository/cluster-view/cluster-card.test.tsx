import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClusterData } from "@/lib/types/clustering";
import { ClusterCard } from "./cluster-card";

vi.mock("../shared/repository-card", () => ({
  RepositoryCard: ({ repo }: { repo: { name: string } }) => <div>{repo.name}</div>,
}));

const cluster: ClusterData = {
  id: 0,
  repositories: [
    {
      id: 1,
      name: "stardex",
      full_name: "example/stardex",
      description: "Repository discovery",
      html_url: "https://github.com/example/stardex",
      stargazers_count: 1,
      forks_count: 0,
      open_issues_count: 0,
      size: 1,
      watchers_count: 1,
      language: "TypeScript",
      topics: [],
      owner: { login: "example", avatar_url: "https://example.com/avatar.png" },
      updated_at: "2026-07-12T00:00:00Z",
    },
  ],
  metadata: {
    name: "TypeScript repositories",
    size: 1,
    languages: ["TypeScript"],
    avgStars: 1,
  },
};

afterEach(cleanup);

describe("ClusterCard", () => {
  it("exposes an honest flat-cluster toggle without fabricated hierarchy metadata", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ClusterCard cluster={cluster} isExpanded={false} onToggle={onToggle} />
    );

    const expandButton = screen.getByRole("button", {
      name: "Expand TypeScript repositories",
    });
    const repositoriesRegion = document.getElementById(
      expandButton.getAttribute("aria-controls") ?? ""
    );
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(repositoriesRegion).toHaveAttribute("hidden");

    fireEvent.click(expandButton);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.queryByText(/PC Group|Similarity|Depth Level/)).not.toBeInTheDocument();

    rerender(<ClusterCard cluster={cluster} isExpanded onToggle={onToggle} />);
    const collapseButton = screen.getByRole("button", {
      name: "Collapse TypeScript repositories",
    });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(
      document.getElementById(collapseButton.getAttribute("aria-controls") ?? "")
    ).not.toHaveAttribute("hidden");
    expect(screen.getByText("stardex")).toBeInTheDocument();
  });
});
