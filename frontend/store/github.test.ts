import { beforeEach, describe, expect, it } from "vitest";
import type { GitHubRepo } from "../lib/github";
import { useGitHubStore } from "./github";

function makeRepository(id: number, name: string): GitHubRepo {
  return {
    id,
    name,
    full_name: `example/${name}`,
    description: `${name} repository`,
    html_url: `https://github.com/example/${name}`,
    stargazers_count: id,
    forks_count: 0,
    open_issues_count: 0,
    size: 1,
    watchers_count: id,
    language: "TypeScript",
    topics: [],
    owner: { login: "example", avatar_url: "https://example.com/avatar.png" },
    updated_at: "2026-07-12T00:00:00Z",
  };
}

beforeEach(() => {
  useGitHubStore.setState(useGitHubStore.getInitialState(), true);
});

describe("GitHub store repository ownership", () => {
  it("deduplicates repositories shared by selected users", () => {
    const shared = makeRepository(1, "shared");
    const unique = makeRepository(2, "unique");
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.addUser("bob");
    state.setRepos("alice", [shared]);
    state.setRepos("bob", [{ ...shared }, unique]);

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([shared, unique]);
    expect(useGitHubStore.getState().getFilteredAndSortedRepos()).toEqual([unique, shared]);
  });

  it("excludes cached repositories after their users are removed or cleared", () => {
    const aliceRepository = makeRepository(1, "alice-repository");
    const bobRepository = { ...makeRepository(2, "bob-repository"), language: "Python" };
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.addUser("bob");
    state.setRepos("alice", [aliceRepository]);
    state.setRepos("bob", [bobRepository]);

    state.removeUser("bob");

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([aliceRepository]);
    expect(useGitHubStore.getState().repos.bob).toEqual([bobRepository]);

    state.clearUsers();

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([]);
  });

  it("resets pagination when repository sources or filters change", () => {
    const first = makeRepository(1, "first");
    const second = makeRepository(2, "second");
    const state = useGitHubStore.getState();

    state.setCurrentPage(3);
    state.addUser("alice");
    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);

    useGitHubStore.getState().setCurrentPage(3);
    useGitHubStore.getState().setRepos("alice", [first, second]);
    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);

    useGitHubStore.setState({ pagination: { currentPage: 2, itemsPerPage: 1 } });
    useGitHubStore.getState().setFilters({
      ...useGitHubStore.getState().filters,
      search: "first",
    });

    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);
    expect(useGitHubStore.getState().getCurrentPageRepos()).toEqual([first]);
  });

  it("never accepts a page below one", () => {
    useGitHubStore.getState().setCurrentPage(0);

    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);
  });
});
