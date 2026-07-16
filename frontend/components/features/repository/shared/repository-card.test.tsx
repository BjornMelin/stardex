import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GitHubRepo } from "@/lib/github";
import { RepositoryCard } from "./repository-card";

const repository: GitHubRepo = {
  id: 1,
  name: "next.js",
  full_name: "vercel/next.js",
  description: "The React framework for the web",
  html_url: "https://github.com/vercel/next.js",
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 1,
  size: 1,
  watchers_count: 1,
  language: "TypeScript",
  topics: ["react"],
  owner: {
    login: "vercel",
    avatar_url: "https://example.com/avatar.png",
  },
  updated_at: "2026-07-12T00:00:00Z",
};

afterEach(cleanup);

describe("RepositoryCard", () => {
  it("links to native GitHub contribution-ready issues", () => {
    render(<RepositoryCard repo={repository} viewMode="grid" />);

    const link = screen.getByRole("link", {
      name: "Find contribution issues for vercel/next.js",
    });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.pathname).toBe("/vercel/next.js/issues");
    expect(url.searchParams.get("q")).toContain('label:"good first issue","help wanted"');
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.parentElement).toHaveClass("col-span-2", "sm:col-start-2");
    expect(link).toHaveClass("whitespace-normal", "sm:whitespace-nowrap");
  });

  it("omits the contribution link when GitHub reports no open issues", () => {
    render(<RepositoryCard repo={{ ...repository, open_issues_count: 0 }} viewMode="grid" />);

    expect(
      screen.queryByRole("link", { name: /Find contribution issues for/ })
    ).not.toBeInTheDocument();
  });
});
