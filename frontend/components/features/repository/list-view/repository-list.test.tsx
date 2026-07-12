import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubRepo } from "@/lib/github";
import { useGitHubStore } from "@/store/github";
import { RepositoryList } from "./repository-list";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("../shared/repository-clusters", () => ({
  RepositoryClusters: () => null,
}));

const repository: GitHubRepo = {
  id: 1,
  name: "repository",
  full_name: "example/repository",
  description: "A repository",
  html_url: "https://github.com/example/repository",
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 1,
  size: 1,
  watchers_count: 1,
  language: "TypeScript",
  topics: [],
  owner: { login: "example", avatar_url: "https://example.com/avatar.png" },
  updated_at: "2026-07-12T00:00:00Z",
};

beforeEach(() => {
  useGitHubStore.setState(useGitHubStore.getInitialState(), true);
  const state = useGitHubStore.getState();
  state.addUser("example");
  state.setRepos("example", [repository]);
  state.setShouldFetchRepos(true);
});

afterEach(cleanup);

describe("RepositoryList", () => {
  it("mounts derived repository collections without an unstable selector loop", () => {
    render(<RepositoryList />);

    expect(screen.getByRole("link", { name: "example/repository" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
