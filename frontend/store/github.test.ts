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
    state.setRepos({ alice: [shared], bob: [{ ...shared }, unique] });

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([shared, unique]);
    expect(useGitHubStore.getState().getFilteredAndSortedRepos()).toEqual([unique, shared]);
  });

  it("excludes cached repositories after their users are removed or cleared", () => {
    const aliceRepository = makeRepository(1, "alice-repository");
    const bobRepository = { ...makeRepository(2, "bob-repository"), language: "Python" };
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.addUser("bob");
    state.setRepos({ alice: [aliceRepository], bob: [bobRepository] });

    state.removeUser("bob");

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([aliceRepository]);
    expect(useGitHubStore.getState().repos.bob).toEqual([bobRepository]);

    state.clearUsers();

    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([]);
  });

  it("preserves removed-user cache through a selected-user refresh", () => {
    const previousAliceRepository = makeRepository(1, "previous-alice");
    const refreshedAliceRepository = makeRepository(2, "refreshed-alice");
    const bobRepository = makeRepository(3, "bob-repository");
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.addUser("bob");
    state.setRepos({ alice: [previousAliceRepository], bob: [bobRepository] });
    state.removeUser("bob");

    useGitHubStore.getState().setRepos({ alice: [refreshedAliceRepository] });
    useGitHubStore.getState().addUser("bob");

    expect(useGitHubStore.getState().repos).toEqual({
      alice: [refreshedAliceRepository],
      bob: [bobRepository],
    });
    expect(useGitHubStore.getState().getSelectedRepos()).toEqual([
      refreshedAliceRepository,
      bobRepository,
    ]);
  });

  it("resets pagination when repository sources or filters change", () => {
    const first = makeRepository(1, "first");
    const second = makeRepository(2, "second");
    const state = useGitHubStore.getState();

    state.setCurrentPage(3);
    state.addUser("alice");
    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);

    useGitHubStore.getState().setCurrentPage(3);
    useGitHubStore.getState().setRepos({ alice: [first, second] });
    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);

    useGitHubStore.setState({ pagination: { currentPage: 2, itemsPerPage: 1 } });
    useGitHubStore.getState().setFilters({
      ...useGitHubStore.getState().filters,
      search: "first",
    });

    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);
    expect(useGitHubStore.getState().getCurrentPageRepos()).toEqual([first]);
  });

  it("reconciles filters when a repository source is replaced", () => {
    const previous = {
      ...makeRepository(1_000, "previous"),
      topics: ["old-topic"],
    };
    const replacement = {
      ...makeRepository(100, "replacement"),
      language: "Python",
      topics: ["new-topic"],
    };
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.setRepos({ alice: [previous] });
    state.setFilters({
      ...state.filters,
      language: "TypeScript",
      minStars: 500,
      topics: ["old-topic"],
    });

    useGitHubStore.getState().setRepos({ alice: [replacement] });

    expect(useGitHubStore.getState().filters).toMatchObject({
      language: null,
      minStars: 100,
      topics: [],
    });
    expect(useGitHubStore.getState().getFilteredAndSortedRepos()).toEqual([replacement]);
  });

  it("preserves filters supported by the complete multi-user refresh", () => {
    const previousPython = { ...makeRepository(1, "alice-python"), language: "Python" };
    const replacementJavaScript = {
      ...makeRepository(2, "alice-javascript"),
      language: "JavaScript",
    };
    const replacementPython = { ...makeRepository(3, "bob-python"), language: "Python" };
    const state = useGitHubStore.getState();

    state.addUser("alice");
    state.addUser("bob");
    state.setRepos({ alice: [previousPython], bob: [] });
    state.setFilters({ ...state.filters, language: "Python" });

    useGitHubStore.getState().setRepos({
      alice: [replacementJavaScript],
      bob: [replacementPython],
    });

    expect(useGitHubStore.getState().filters.language).toBe("Python");
    expect(useGitHubStore.getState().getFilteredAndSortedRepos()).toEqual([replacementPython]);
  });

  it("never accepts a page below one", () => {
    useGitHubStore.getState().setCurrentPage(0);

    expect(useGitHubStore.getState().pagination.currentPage).toBe(1);
  });
});
