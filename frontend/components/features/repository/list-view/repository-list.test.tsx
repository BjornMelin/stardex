import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubRepo } from "@/lib/github";
import { useGitHubStore } from "@/store/github";
import { RepositoryList } from "./repository-list";

const queryResult = vi.hoisted(() => ({
  current: {
    data: undefined as unknown,
    isLoading: false,
    error: null as unknown,
    isFetchedAfterMount: false,
    isRefetchError: false,
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryResult.current,
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
  queryResult.current = {
    data: undefined,
    isLoading: false,
    error: null,
    isFetchedAfterMount: false,
    isRefetchError: false,
  };
  useGitHubStore.setState(useGitHubStore.getInitialState(), true);
  const state = useGitHubStore.getState();
  state.addUser("example");
  state.setRepos({ example: [repository] });
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

  it("preserves valid pages and renders a clamped page during shrinkage", () => {
    const repositories = Array.from({ length: 31 }, (_, index) => ({
      ...repository,
      id: index + 1,
      name: `repository-${index + 1}`,
      full_name: `example/repository-${index + 1}`,
      stargazers_count: index + 1,
    }));
    act(() => {
      useGitHubStore.setState({
        repos: { example: repositories },
        pagination: { currentPage: 2, itemsPerPage: 30 },
      });
    });

    render(<RepositoryList />);
    expect(useGitHubStore.getState().pagination.currentPage).toBe(2);

    act(() => {
      useGitHubStore.getState().setRepos({ example: repositories.map((repo) => ({ ...repo })) });
    });
    expect(useGitHubStore.getState().pagination.currentPage).toBe(2);

    act(() => {
      useGitHubStore.getState().setRepos({ example: [repository] });
    });

    expect(screen.getByRole("link", { name: "example/repository" })).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);
  });

  it("applies only repository data fetched successfully after mount", () => {
    const cachedRepository = {
      ...repository,
      id: 2,
      name: "cached",
      full_name: "example/cached",
    };
    const currentRepository = {
      ...repository,
      id: 3,
      name: "current",
      full_name: "example/current",
    };
    const refreshedRepository = {
      ...repository,
      id: 4,
      name: "refreshed",
      full_name: "example/refreshed",
    };
    useGitHubStore.getState().setRepos({ example: [currentRepository] });
    queryResult.current = {
      data: [{ username: "example", repos: [cachedRepository] }],
      isLoading: false,
      error: null,
      isFetchedAfterMount: false,
      isRefetchError: false,
    };

    const { rerender } = render(<RepositoryList />);
    expect(useGitHubStore.getState().repos.example).toEqual([currentRepository]);

    queryResult.current = {
      data: [{ username: "example", repos: [cachedRepository] }],
      isLoading: false,
      error: new Error("refresh failed"),
      isFetchedAfterMount: true,
      isRefetchError: true,
    };
    rerender(<RepositoryList />);
    expect(useGitHubStore.getState().repos.example).toEqual([currentRepository]);

    queryResult.current = {
      data: [{ username: "example", repos: [refreshedRepository] }],
      isLoading: false,
      error: null,
      isFetchedAfterMount: true,
      isRefetchError: false,
    };
    rerender(<RepositoryList />);

    expect(useGitHubStore.getState().repos.example).toEqual([refreshedRepository]);
  });
});
