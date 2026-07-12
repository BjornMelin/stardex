import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GitHubRepo } from "@/lib/github";
import { useGitHubStore } from "@/store/github";
import { RepositoryFilters } from "./repository-filters";

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
  topics: ["community"],
  owner: { login: "example", avatar_url: "https://example.com/avatar.png" },
  updated_at: "2026-07-12T00:00:00Z",
};

beforeEach(() => {
  useGitHubStore.setState(useGitHubStore.getInitialState(), true);
  const state = useGitHubStore.getState();
  state.addUser("example");
  state.setRepos("example", [repository]);
});

afterEach(cleanup);

describe("RepositoryFilters", () => {
  it("exposes topic filters as pressed-state buttons", () => {
    render(<RepositoryFilters />);

    expect(screen.getByRole("textbox", { name: "Search repositories" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort repositories" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter repositories" }));

    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
    const topic = screen.getByRole("button", { name: "community" });
    expect(topic).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(topic);

    expect(useGitHubStore.getState().filters.topics).toEqual(["community"]);
    expect(screen.getByRole("button", { name: "community" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
